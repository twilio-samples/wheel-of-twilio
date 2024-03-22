"use server";

import AccessToken, { SyncGrant } from "twilio/lib/jwt/AccessToken";

const {
  ACCOUNT_SID = "",
  API_KEY = "",
  API_SECRET = "",
  NEXT_PUBLIC_TWILIO_PHONE_NUMBER = "",
  PROMO_CODE = "",
} = process.env;

export async function fetchToken() {
  const syncGrant = new SyncGrant({
    serviceSid: "default",
  });

  const token = new AccessToken(ACCOUNT_SID, API_KEY, API_SECRET, {
    identity: "example",
  });

  token.addGrant(syncGrant);

  return token.toJwt();
}

export async function callWinners(winners: any[]) {
  const client = require("twilio")(API_KEY, API_SECRET, {
    accountSid: ACCOUNT_SID,
  });

  winners.forEach((winner) => {
    client.calls.create({
      twiml: `<Response><Say>Congratulations ${winner.name}! You won!</Say></Response>`,
      from: NEXT_PUBLIC_TWILIO_PHONE_NUMBER,
      to: winner.sender.replace("whatsapp:", ""),
    });
  });
}

export async function messageLosers(losers: any[]) {
  const client = require("twilio")(API_KEY, API_SECRET, {
    accountSid: ACCOUNT_SID,
  });

  losers.forEach((loser) => {
    client.messages.create({
      body: `Better luck next time ${loser.name}!`,
      from: `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`,
      to: loser.sender,
    });
  });
}
