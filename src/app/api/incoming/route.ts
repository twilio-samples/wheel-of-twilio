import { NextRequest, NextResponse } from "next/server";
import twilio, { twiml } from "twilio";
import i18next from "i18next";
import { getCountry, capitalizeEachWord } from "./helper";
import { createHash } from "crypto";

const en = require("../../../locale/en.json");
const de = require("../../../locale/de.json");

const ONE_WEEK = 60 * 60 * 24 * 7;
const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  VERIFY_SERVICE_SID = "",
  SYNC_SERVICE_SID = "",
  EVENT_NAME = "",
  MESSAGING_SERVICE_SID = "",
  NEXT_PUBLIC_WEDGES = "",
} = process.env;

const wedges = NEXT_PUBLIC_WEDGES.split(",");

const regexForEmail = /[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/;
const regexFor6ConsecutiveDigits = /\d{6}/;

const enum Stages {
  NEW_USER = 1,
  VERIFYING = 2,
  VERIFIED_USER = 3,
  ASKING_FOR_COUNTRY = 4,
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
    accountSid: TWILIO_ACCOUNT_SID,
  });
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = await syncService.documents()("bets").fetch();
  const attendeesMap = await syncService.syncMaps()("attendees");

  const twimlRes = new twiml.MessagingResponse();

  const senderID = formData.get("From") as string;
  const hashedSender = createHash("sha256").update(senderID).digest("hex");
  const senderName = formData.get("ProfileName") as string;
  const messageContent = formData.get("Body") as string;
  let lng;
  if (senderID) {
    lng = getCountry(senderID)?.languages[0];
  }

  await i18next.init({
    lng,
    fallbackLng: "en",
    resources: {
      en,
      de,
    },
  });

  let currentUser, userStage;
  try {
    const syncItem = await attendeesMap.syncMapItems(hashedSender).fetch();
    currentUser = syncItem.data as UserData;
    userStage = currentUser.stage;
  } catch (e: any) {
    if (e.status !== 404) {
      throw e;
    }
  }
  const matchedEmail = regexForEmail.exec(messageContent);

  if (process.env.demoBet) {
    // also allow for testing in CI
    const bets = betsDoc.data.bets || {};

    bets["test-better"] = {
      name: "test-better",
      hashedSender: "test-better",
      bet: wedges.find((wedge) =>
        capitalizeEachWord(messageContent).includes(wedge)
      ),
    };
    betsDoc.update({
      data: {
        bets,
        blocked: false,
      },
    });
  }

  if (!currentUser) {
    attendeesMap.syncMapItems.create({
      ttl: ONE_WEEK,
      key: hashedSender,
      data: {
        name: senderName,
        sender: senderID,
        stage: Stages.NEW_USER,
      },
    });

    twimlRes.message(i18next.t("welcome", { senderName }));
  } else if (
    userStage === Stages.NEW_USER ||
    (userStage === Stages.VERIFYING && matchedEmail !== null)
  ) {
    if (matchedEmail === null) {
      twimlRes.message(i18next.t("invalidEmail"));
    } else {
      try {
        const verification = await client.verify.v2
          .services(VERIFY_SERVICE_SID)
          .verifications.create({
            to: matchedEmail[0],
            channel: "email",
            locale: lng,
          });
        attendeesMap.syncMapItems(hashedSender).update({
          data: {
            ...currentUser,
            email: matchedEmail[0],
            stage: Stages.VERIFYING,
            verificationSid: verification.sid,
          },
        });
        twimlRes.message(i18next.t("sentEmail"));
      } catch (e: any) {
        if (e?.message?.startsWith("Invalid parameter `To`:")) {
          twimlRes.message(i18next.t("invalidEmail"));
        }
      }
    }
  } else if (userStage === Stages.VERIFYING) {
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
        attendeesMap.syncMapItems(hashedSender).update({
          data: {
            ...currentUser,
            stage: Stages.ASKING_FOR_COUNTRY,
          },
        });
        await client.messages.create({
          contentSid: i18next.t("countryTemplateSID"),
          from: MESSAGING_SERVICE_SID,
          to: senderID,
        });
      }
    } catch (e) {
      twimlRes.message(i18next.t("verificationFailed"));
    }
  } else if (userStage === Stages.ASKING_FOR_COUNTRY) {
    attendeesMap.syncMapItems(hashedSender).update({
      data: {
        ...currentUser,
        country: messageContent,
        stage: Stages.VERIFIED_USER,
      },
    });
    await client.messages.create({
      contentSid: i18next.t("betTemplateSID"),
      from: MESSAGING_SERVICE_SID,
      to: senderID,
    });
  } else if (userStage === Stages.VERIFIED_USER) {
    if (betsDoc.data.blocked) {
      twimlRes.message(i18next.t("betsClosed"));
      // check if one of the wedges is a substring of the capitalized messageContent
    } else if (
      wedges.some((wedge) => capitalizeEachWord(messageContent).includes(wedge))
    ) {
      const bets = betsDoc.data.bets || {};

      bets[hashedSender] = {
        name: senderName,
        hashedSender,
        bet: wedges.find((wedge) =>
          capitalizeEachWord(messageContent).includes(wedge)
        ),
      };
      await attendeesMap.syncMapItems(hashedSender).update({
        data: {
          ...currentUser,
          event: EVENT_NAME,
        },
      });
      await betsDoc.update({
        data: {
          bets,
          blocked: false,
        },
      });

      twimlRes.message(
        i18next.t("betPlaced", {
          senderName,
          messageContent: capitalizeEachWord(messageContent),
        })
      );
    } else {
      await client.messages.create({
        contentSid: i18next.t("invalidBetTemplateSID"),
        from: MESSAGING_SERVICE_SID,
        to: senderID,
      });
    }
  }
  const res = new NextResponse(twimlRes.toString());
  res.headers.set("Content-Type", "text/xml");
  return res;
}
