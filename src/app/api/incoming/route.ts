import { NextRequest, NextResponse } from "next/server";
import twilio, { twiml } from "twilio";

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  VERIFY_SERVICE_SID = "",
  SYNC_SERVICE_SID = "",
  EVENT_NAME = "",
  MESSAGE_SERVICE_SID = "",
  COUNTRY_TEMPLATE_SID = "",
  OPTIONS_TEMPLATE_SID = "",
} = process.env;

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

  const senderID = formData.get("From") as string; //TODO maybe hash this before saving
  const senderName = formData.get("ProfileName") as string;
  const messageContent = formData.get("Body") as string;

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

    twimlRes.message(
      `Welcome to the game, ${senderName}! Please reply with your business email address to verify. By replying, you agree to the terms and conditions that are linked in the WhatsApp profile.`
    );
  } else if (
    userStage === Stages.NEW_USER ||
    (userStage === Stages.VERIFYING && matchedEmail !== null)
  ) {
    if (matchedEmail === null) {
      twimlRes.message(`Sorry, this is not a valid email address.`);
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
      twimlRes.message(
        `We sent a verification code to your email address. Please reply with the code when you receive it.`
      );
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
          contentSid: COUNTRY_TEMPLATE_SID,
          from: MESSAGE_SERVICE_SID,
          to: senderID,
        });
      }
    } catch (e) {
      twimlRes.message(
        `Sorry, the verification code is incorrect. Please try again or enter a new email address.`
      );
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
      contentSid: OPTIONS_TEMPLATE_SID,
      from: MESSAGE_SERVICE_SID,
      to: senderID,
    });
  } else if (userStage === Stages.VERIFIED_USER) {
    if (betsDoc.data.blocked) {
      twimlRes.message(`Sorry, the game is blocked.`);
    } else if (!["1", "2", "3", "4", "5", "6"].includes(messageContent)) {
      twimlRes.message(
        `Sorry, this is not a valid bet. Please bet on 1, 2, 3, 4, 5 or 6.`
      );
    } else {
      const bets = betsDoc.data.bets || {};

      bets[senderID] = {
        name: senderName,
        sender: senderID,
        bet: messageContent,
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
        `Hi ${senderName}\nWe received your bet on ${messageContent}`
      );
    }
  }

  const res = new NextResponse(twimlRes.toString());
  res.headers.set("Content-Type", "text/xml");
  return res;
}
