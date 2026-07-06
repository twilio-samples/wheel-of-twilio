import twilio, { twiml } from "twilio";
import i18next from "i18next";
import { createHash } from "crypto";
import { Player, Stages } from "../../types";
import { SyncMapContext } from "twilio/lib/rest/sync/v1/service/syncMap";
import { DocumentInstance } from "twilio/lib/rest/sync/v1/service/document";
import { getTemplate } from "@/app/twilio";
import {
  initI18n,
  handleBets,
  handleWinnerStages,
  sanitizeFullName,
  regexForEmail,
  regexFor6ConsecutiveDigits,
  ONE_WEEK,
  sleep,
} from "./helper";
import { checkSegmentTraits } from "./segment";

const {
  VERIFY_SERVICE_SID = "",
  EVENT_NAME = "",
  NEXT_PUBLIC_TWILIO_PHONE_NUMBER = "",
} = process.env;

interface ProfileModeContext {
  senderName?: string;
  senderID?: string;
  recipient: string;
  messageContent: string;
  attendeesMap: SyncMapContext;
  betsDoc: DocumentInstance;
  leadCollection?: string;
}

export async function handleProfileMode(
  currentUser: Player | undefined,
  client: twilio.Twilio,
  {
    senderName,
    senderID,
    recipient,
    messageContent,
    attendeesMap,
    betsDoc,
    leadCollection = "MANUAL",
  }: ProfileModeContext,
): Promise<string> {
  const twimlRes = new twiml.MessagingResponse();
  const from = `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`;

  const country = await initI18n(currentUser?.sender || senderID || "");
  const hashedSender = createHash("sha256")
    .update(currentUser?.sender || senderID || "")
    .digest("hex");

  const ctx = { senderName, senderID, recipient, messageContent, attendeesMap, betsDoc };

  try {
    if (leadCollection === "NONE") {
      return handleNoneMode(
        currentUser,
        client,
        { senderName, senderID, recipient, messageContent, attendeesMap, betsDoc },
        { from, country, hashedSender, twimlRes },
      );
    }

    // MANUAL: full name → email → verify flow
    const matchedEmail = regexForEmail.exec(messageContent);

    if (!currentUser) {
      await attendeesMap.syncMapItems.create({
        ttl: ONE_WEEK,
        key: hashedSender,
        data: {
          name: senderName,
          country: country?.name,
          recipient,
          sender: senderID,
          submittedBets: 0,
          stage: Stages.NEW_USER,
        },
      });
      twimlRes.message(i18next.t("welcome"));
    } else if (currentUser.stage === Stages.NEW_USER) {
      twimlRes.message(i18next.t("promptEmail"));
      await attendeesMap.syncMapItems(hashedSender).update({
        data: {
          ...currentUser,
          fullName: sanitizeFullName(senderName || ""),
          stage: Stages.NAME_CONFIRMED,
        },
      });
    } else if (
      currentUser.stage === Stages.NAME_CONFIRMED ||
      (currentUser.stage === Stages.VERIFYING && matchedEmail !== null)
    ) {
      if (matchedEmail === null) {
        twimlRes.message(i18next.t("invalidEmail"));
      } else {
        try {
          const verification = await client.verify.v2
            .services(VERIFY_SERVICE_SID)
            .verifications.create({
              to: matchedEmail[0].toLowerCase(),
              channel: "email",
              channelConfiguration: {
                substitutions: { "event-name": EVENT_NAME },
              },
            });
          await attendeesMap.syncMapItems(hashedSender).update({
            data: {
              ...currentUser,
              email: matchedEmail[0].toLowerCase(),
              stage: Stages.VERIFYING,
              verificationSid: verification.sid,
            },
          });
          twimlRes.message(i18next.t("sentEmail"));
        } catch (e: any) {
          if (e?.message?.startsWith("Invalid parameter `To`:")) {
            twimlRes.message(i18next.t("invalidEmail"));
          } else {
            throw e;
          }
        }
      }
    } else if (currentUser.stage === Stages.VERIFYING) {
      try {
        const submittedCode = regexFor6ConsecutiveDigits.exec(messageContent);
        if (submittedCode === null) {
          throw new Error("Invalid code");
        }
        const verificationCheck = await client.verify.v2
          .services(VERIFY_SERVICE_SID)
          .verificationChecks.create({
            verificationSid: currentUser.verificationSid,
            code: submittedCode[0],
          });

        if (verificationCheck.status === "approved") {
          const [contentTemplate, segmentData] = await Promise.all([
            getTemplate("AskForBets", country?.languages[0]),
            checkSegmentTraits(currentUser.email),
          ]);
          await Promise.all([
            attendeesMap.syncMapItems(hashedSender).update({
              data: { ...currentUser, stage: Stages.VERIFIED_USER, ...segmentData },
            }),
            client.messages.create({
              contentSid: contentTemplate.sid,
              from,
              to: currentUser.sender,
            }),
          ]);
        } else {
          twimlRes.message(i18next.t("verificationFailed"));
        }
      } catch (e: any) {
        if (e.message !== "Invalid code") {
          throw e;
        }
        twimlRes.message(i18next.t("verificationFailed"));
      }
    } else if (currentUser.stage === Stages.VERIFIED_USER) {
      return handleBets(currentUser, client, ctx, hashedSender, country);
    } else if (
      currentUser.stage === Stages.WINNER_UNCLAIMED ||
      currentUser.stage === Stages.WINNER_CLAIMED ||
      currentUser.stage === Stages.RAFFLE_WINNER
    ) {
      return handleWinnerStages(currentUser, client);
    } else {
      await client.messages.create({
        body: i18next.t("catchAllError"),
        from,
        to: currentUser.sender,
      });
      console.error("Unhandled stage", currentUser.stage, currentUser);
    }
  } catch (error: any) {
    if (error.code === 54006) {
      await betsDoc.update({ data: { ...betsDoc.data, full: true } });
      twimlRes.message(i18next.t("roundFull"));
    } else {
      twimlRes.message(i18next.t("catchAllError"));
    }
    console.error(error.message);
    return twimlRes.toString();
  }

  return twimlRes.toString();
}

async function handleNoneMode(
  currentUser: Player | undefined,
  client: twilio.Twilio,
  { senderName, senderID, recipient, messageContent, attendeesMap, betsDoc }: ProfileModeContext,
  {
    from,
    country,
    hashedSender,
    twimlRes,
  }: {
    from: string;
    country: ReturnType<typeof i18next.t> extends never ? never : any;
    hashedSender: string;
    twimlRes: twiml.MessagingResponse;
  },
): Promise<string> {
  const ctx = { senderName, senderID, recipient: recipient!, messageContent, attendeesMap: attendeesMap!, betsDoc: betsDoc! };

  if (!currentUser) {
    await attendeesMap!.syncMapItems.create({
      ttl: ONE_WEEK,
      key: hashedSender,
      data: {
        name: senderName,
        country: country?.name,
        recipient,
        sender: senderID,
        submittedBets: 0,
        stage: Stages.VERIFIED_USER,
      },
    });

    twimlRes.message(i18next.t("welcomeNoLeadCollection"));

    await sleep(1000);

    const contentTemplate = await getTemplate("AskForBets", country?.languages[0]);
    await client.messages.create({
      contentSid: contentTemplate.sid,
      from,
      to: senderID || "",
    });
    return twimlRes.toString();
  }

  if (
    currentUser.stage === Stages.WINNER_UNCLAIMED ||
    currentUser.stage === Stages.WINNER_CLAIMED ||
    currentUser.stage === Stages.RAFFLE_WINNER
  ) {
    return handleWinnerStages(currentUser, client);
  }

  return handleBets(currentUser, client, ctx, hashedSender, country);
}
