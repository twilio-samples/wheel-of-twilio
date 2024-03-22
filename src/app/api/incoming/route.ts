import { NextRequest, NextResponse } from "next/server";
import twilio, { twiml } from "twilio";

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  VERIFY_SERVICE_SID = "",
} = process.env;

const knownUsers: { [key: string]: Stages } = {}; //TODO this should be in sync
const userVerification: { [key: string]: string } = {}; //TODO this should be in sync

const enum Stages {
  NEW_USER = 1,
  VERIFYING = 2,
  VERIFIED_USER = 3,
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
    accountSid: TWILIO_ACCOUNT_SID,
  });
  const syncService = await client.sync.v1.services("default").fetch();
  const doc = await syncService.documents()("wheel_entries").fetch();

  const twimlRes = new twiml.MessagingResponse();

  const senderID = formData.get("From") as string;
  const senderName = formData.get("ProfileName") as string;
  const messageContent = formData.get("Body") as string;

  const userStage = knownUsers[senderID];

  if (!userStage) {
    knownUsers[senderID] = Stages.NEW_USER;

    twimlRes.message(
      `Welcome to the game, ${senderName}! Please reply with your business email address to verify.`
    );
  } else if (userStage === Stages.NEW_USER) {
    if (!messageContent.includes("@")) { // TODO this should parse a regex
      twimlRes.message(`Sorry, this is not a valid email address.`);
    } else {
      const verification = await client.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verifications.create({ to: messageContent, channel: "email" });
      knownUsers[senderID] = Stages.VERIFYING;
      userVerification[senderID] = verification.sid;
      twimlRes.message(
        `We sent a verification code to your email address. Please reply with the code when you receive it.`
      );
    }
  } else if (userStage === Stages.VERIFYING) {
    try {
      const verificationCheck = await client.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verificationChecks.create({
          verificationSid: userVerification[senderID],
          code: messageContent, // TODO this should parse a regex for a six digit number
        });

      if (verificationCheck.status === "approved") {
        knownUsers[senderID] = Stages.VERIFIED_USER; 
        //TODO should persist this in an airtable or similar
        twimlRes.message(
          `Your email address has been verified. Please reply with your bet (1, 2, 3, 4, 5 or 6).`
        );
      }
    } catch (e) {
      twimlRes.message(
        `Sorry, the verification code is incorrect. Please try again.`
      );
    }
  } else if (userStage === Stages.VERIFIED_USER) {
    if (doc.data.blocked) {
      twimlRes.message(`Sorry, the game is blocked.`);
    } else if (!["1", "2", "3", "4", "5", "6"].includes(messageContent)) {
      twimlRes.message(
        `Sorry, this is not a valid bet. Please bet on 1, 2, 3, 4, 5 or 6.`
      );
    } else {
      const bets = doc.data.bets || {};

      bets[senderID] = {
        name: senderName,
        sender: senderID,
        bet: messageContent,
      };
      doc.update({
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
