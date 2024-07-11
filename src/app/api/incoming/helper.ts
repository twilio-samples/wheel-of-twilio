// Copyright 2024 Twilio Inc.

import { ICountry, countries } from "countries-list";
import { PhoneNumberUtil } from "google-libphonenumber";

const phoneUtil = PhoneNumberUtil.getInstance();

import twilio, { twiml } from "twilio";
import i18next from "i18next";
import { createHash } from "crypto";
import { Player, Stages } from "../../types";
import { SyncMapContext } from "twilio/lib/rest/sync/v1/service/syncMap";
import { DocumentInstance } from "twilio/lib/rest/sync/v1/service/document";

const en = require("../../../locale/en.json");
const de = require("../../../locale/de.json");
const fr = require("../../../locale/fr.json");
const es = require("../../../locale/es.json");

const ONE_WEEK = 60 * 60 * 24 * 7;
const {
  VERIFY_SERVICE_SID = "",
  EVENT_NAME = "",
  MESSAGING_SERVICE_SID = "",
  NEXT_PUBLIC_WEDGES = "",
  OFFER_SMALL_PRIZES = "false",
} = process.env;

const wedges = NEXT_PUBLIC_WEDGES.split(",");

const regexForEmail = /[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/;
const regexFor6ConsecutiveDigits = /\d{6}/;

async function initI18n(senderID: string) {
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
      fr,
      es,
    },
  });
  return lng;
}

export async function generateResponse(
  currentUser: Player | undefined,
  client: twilio.Twilio,
  {
    senderName,
    senderID,
    messageContent,
    attendeesMap,
    betsDoc,
  }: {
    senderName?: string;
    senderID?: string;
    messageContent: string;
    attendeesMap: SyncMapContext;
    betsDoc: DocumentInstance;
  }
) {
  const twimlRes = new twiml.MessagingResponse();
  const matchedEmail = regexForEmail.exec(messageContent);
  const lng = await initI18n(currentUser?.sender || senderID || "");
  const hashedSender = createHash("sha256")
    .update(currentUser?.sender || "")
    .digest("hex");

  if (!currentUser) {
    await attendeesMap.syncMapItems.create({
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
    currentUser.stage === Stages.NEW_USER ||
    (currentUser.stage === Stages.VERIFYING && matchedEmail !== null)
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
        await attendeesMap.syncMapItems(hashedSender).update({
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
        await attendeesMap.syncMapItems(hashedSender).update({
          data: {
            ...currentUser,
            // stage: Stages.ASKING_FOR_COUNTRY,
            stage: Stages.VERIFIED_USER,
          },
        });
        // await client.messages.create({
        //   contentSid: i18next.t("countryTemplateSID"),
        //   from: MESSAGING_SERVICE_SID,
        //   to: senderID,
        // });
        await client.messages.create({
          contentSid: i18next.t("betTemplateSID"),
          from: MESSAGING_SERVICE_SID,
          to: currentUser.sender,
        });
      }
    } catch (e: any) {
      if (e.message !== "Invalid code") {
        throw e;
      }
      twimlRes.message(i18next.t("verificationFailed"));
    }
  } else if (currentUser.stage === Stages.ASKING_FOR_COUNTRY) {
    await attendeesMap.syncMapItems(hashedSender).update({
      data: {
        ...currentUser,
        country: messageContent,
        stage: Stages.VERIFIED_USER,
      },
    });
    await client.messages.create({
      contentSid: i18next.t("betTemplateSID"),
      from: MESSAGING_SERVICE_SID,
      to: currentUser.sender,
    });
  } else if (currentUser.stage === Stages.VERIFIED_USER) {
    if (betsDoc.data.blocked) {
      twimlRes.message(i18next.t("betsClosed"));
      // check if one of the wedges is a substring of the capitalized messageContent
    } else if (
      wedges.some((wedge) =>
        capitalizeEachWord(messageContent).includes(capitalizeEachWord(wedge))
      )
    ) {
      const bets = betsDoc.data.bets || {};
      //sort longerst to shortest first
      const selectedBet = wedges
        .sort((a, b) => b.length - a.length)
        .find((wedge) =>
          capitalizeEachWord(messageContent).includes(capitalizeEachWord(wedge))
        );

      bets[hashedSender] = {
        name: senderName,
        hashedSender,
        bet: selectedBet,
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
          messageContent: selectedBet,
        })
      );
    } else {
      await client.messages.create({
        contentSid: i18next.t("invalidBetTemplateSID"),
        from: MESSAGING_SERVICE_SID,
        to: currentUser.sender,
      });
    }
  } else if (currentUser.stage === Stages.WINNER_UNCLAIMED) {
    await client.messages.create({
      body:
        OFFER_SMALL_PRIZES === "true"
          ? i18next.t("alreadyPlayedNotClaimedSmallPrize")
          : i18next.t("alreadyPlayedNotClaimed"),
      from: MESSAGING_SERVICE_SID,
      to: currentUser.sender,
    });
  } else if (currentUser.stage === Stages.WINNER_CLAIMED || currentUser.stage === Stages.RAFFLE_WINNER) {
    await client.messages.create({
      body: i18next.t("alreadyPlayedPrizeClaimed"),
      from: MESSAGING_SERVICE_SID,
      to: currentUser.sender,
    });
  } else {
    await client.messages.create({
      body: i18next.t("catchAllError"),
      from: MESSAGING_SERVICE_SID,
      to: currentUser.sender,
    });
    console.error("Unhandled stage", currentUser.stage, currentUser);
  }

  return twimlRes.toString();
}

export function getCountry(phone: string): ICountry | undefined {
  const number = phoneUtil.parseAndKeepRawInput(phone.replace("whatsapp:", ""));
  return Object.values(countries).find((country) => {
    const countryCode = number.getCountryCode();
    if (countryCode) {
      return country.phone.includes(countryCode);
    }
  });
}

export function capitalizeEachWord(str: string) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
