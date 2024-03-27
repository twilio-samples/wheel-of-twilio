"use server";

import AccessToken, { SyncGrant } from "twilio/lib/jwt/AccessToken";

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  NEXT_PUBLIC_TWILIO_PHONE_NUMBER = "",
  MESSAGE_SERVICE_SID = "",
} = process.env;

enum Privilege {
  FRONTEND = "FRONTEND",
}


export async function fetchToken() {
  const syncGrant = new SyncGrant({
    serviceSid:  MESSAGE_SERVICE_SID
  });

  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    {
      identity: Privilege.FRONTEND,
    }
  );

  token.addGrant(syncGrant);

  return token.toJwt();
}

export async function callWinners(winners: any[]) {
  const client = require("twilio")(TWILIO_API_KEY, TWILIO_API_SECRET, {
    accountSid: TWILIO_ACCOUNT_SID,
  });

  winners.forEach((winner) => {
    client.calls.create({
      twiml: `<Response><Say>Congratulations ${winner.name}! You won!</Say></Response>`,
      from: NEXT_PUBLIC_TWILIO_PHONE_NUMBER,
      to: winner.sender.replace("whatsapp:", ""),
    });
  });
}

export async function messageOthers(unluckyOnes: any[], winningNumber: string) {
  const client = require("twilio")(TWILIO_API_KEY, TWILIO_API_SECRET, {
    accountSid: TWILIO_ACCOUNT_SID,
  });

  unluckyOnes.forEach((participant) => {
    client.messages.create({
      body: `Sorry ${participant.name}, you lost! The winning number was ${winningNumber}. Better luck next time!`,
      from: `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`,
      to: participant.sender,
    });
  });
}
