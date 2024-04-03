"use server";

import AccessToken, { SyncGrant } from "twilio/lib/jwt/AccessToken";

import i18next from "i18next";
import { getCountry } from "./api/incoming/helper";

const en = require("../locale/en.json");
const de = require("../locale/de.json");

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  NEXT_PUBLIC_TWILIO_PHONE_NUMBER = "",
  SYNC_SERVICE_SID = "",
} = process.env;

enum Privilege {
  FRONTEND = "FRONTEND",
}

async function localizeStringForPhoneNumber(
  str: string,
  phone: string,
  name: string,
  winningField?: string
) {
  await i18next.init({
    lng: getCountry(phone)?.languages[0],
    fallbackLng: "en",
    resources: {
      en,
      de,
    },
  });

  return i18next.t(str, { name, winningField });
}

export async function fetchToken() {
  const syncGrant = new SyncGrant({
    serviceSid: SYNC_SERVICE_SID,
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

  winners.forEach(async (winner) => {
    const to = winner.sender.replace("whatsapp:", "");
    client.calls.create({
      twiml: await localizeStringForPhoneNumber("winner", to, winner.name),
      from: NEXT_PUBLIC_TWILIO_PHONE_NUMBER,
      to,
    });
  });
}

export async function messageOthers(unluckyOnes: any[], winningNumber: string) {
  const client = require("twilio")(TWILIO_API_KEY, TWILIO_API_SECRET, {
    accountSid: TWILIO_ACCOUNT_SID,
  });

  unluckyOnes.forEach(async (participant) => {
    const body = await localizeStringForPhoneNumber(
      "loser",
      participant.sender,
      participant.name,
      winningNumber
    );
    client.messages.create({
      body,
      from: `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`,
      to: participant.sender,
    });
  });
}
