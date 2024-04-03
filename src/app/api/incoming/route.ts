import { NextRequest, NextResponse } from "next/server";
import twilio, { twiml } from "twilio";
import i18next from "i18next";
import { getCountry } from "./helper";

const en = require("../../../locale/en.json");
const de = require("../../../locale/de.json");

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  VERIFY_SERVICE_SID = "",
  SYNC_SERVICE_SID = "",
  EVENT_NAME = "",
  MESSAGE_SERVICE_SID = "",
  NEXT_PUBLIC_FIELD_NAMES = "",
} = process.env;

const fields = NEXT_PUBLIC_FIELD_NAMES.split(",");

const regexForEmail = /[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/;
const regexFor6ConsecutiveDigits = /\d{6}/;

const enum Stages {
  NEW_USER = 1,
  VERIFYING = 2,
  VERIFIED_USER = 3,
  ASKING_FOR_COUNTRY = 4,
}

function capitalizeString(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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

  const senderID = formData.get("From") as string; //TODO maybe hash this before saving
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
    currentUser = await attendeesMap.syncMapItems(senderID).fetch();
    userStage = currentUser.data.stage;
  } catch (e: any) {
    if (e.status !== 404) {
      throw e;
    }
  }
  const matchedEmail = regexForEmail.exec(messageContent);

  if (!currentUser) {
    attendeesMap.syncMapItems.create({
      //TODO think about adding a TTL here?
      key: senderID,
      data: {
        name: senderName,
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
      const verification = await client.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verifications.create({
          to: matchedEmail[0],
          channel: "email",
        });
      attendeesMap.syncMapItems(senderID).update({
        data: {
          ...currentUser.data,
          email: matchedEmail[0],
          stage: Stages.VERIFYING,
          verificationSid: verification.sid,
        },
      });
      twimlRes.message(i18next.t("sentEmail"));
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
          verificationSid: currentUser.data.verificationSid,
          code: submittedCode[0],
        });

      if (verificationCheck.status === "approved") {
        attendeesMap.syncMapItems(senderID).update({
          data: {
            ...currentUser.data,
            stage: Stages.ASKING_FOR_COUNTRY,
          },
        });
        client.messages.create({
          contentSid: i18next.t("countryTemplateSID"),
          from: MESSAGE_SERVICE_SID,
          to: senderID,
        });
      }
    } catch (e) {
      twimlRes.message(i18next.t("verificationFailed"));
    }
  } else if (userStage === Stages.ASKING_FOR_COUNTRY) {
    attendeesMap.syncMapItems(senderID).update({
      data: {
        ...currentUser.data,
        country: messageContent,
        stage: Stages.VERIFIED_USER,
      },
    });
    client.messages.create({
      contentSid: i18next.t("betTemplateSID"),
      from: MESSAGE_SERVICE_SID,
      to: senderID,
    });
  } else if (userStage === Stages.VERIFIED_USER) {
    if (betsDoc.data.blocked) {
      twimlRes.message(i18next.t("betsClosed"));
    } else if (!fields.includes(capitalizeString(messageContent))) {
      twimlRes.message(i18next.t("invalidBet", fields.join(", ")));
    } else {
      const bets = betsDoc.data.bets || {};

      bets[senderID] = {
        name: senderName,
        sender: senderID,
        bet: capitalizeString(messageContent),
      };
      attendeesMap.syncMapItems(senderID).update({
        data: {
          ...currentUser.data,
          event: EVENT_NAME,
        },
      });
      betsDoc.update({
        data: {
          bets,
          blocked: false,
        },
      });

      twimlRes.message(
        i18next.t("betPlaced", {
          senderName,
          messageContent: capitalizeString(messageContent),
        })
      );
    }
  }

  const res = new NextResponse(twimlRes.toString());
  res.headers.set("Content-Type", "text/xml");
  return res;
}
