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
const client = require("twilio")(TWILIO_API_KEY, TWILIO_API_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

async function localizeStringForPhoneNumber(
  str: string,
  phone: string,
  name: string,
  winningWedge?: string,
) {
  await i18next.init({
    lng: getCountry(phone)?.languages[0],
    fallbackLng: "en",
    resources: {
      en,
      de,
    },
  });

  return i18next.t(str, { name, winningWedge });
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
    },
  );

  token.addGrant(syncGrant);

  return token.toJwt();
}

export async function clearBets() {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = syncService.documents()("bets");
  await betsDoc.update({
    data: {
      bets: {},
      blocked: false,
    },
  });
}

export async function blockBets() {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = syncService.documents()("bets");
  await betsDoc.update({
    data: {
      ...betsDoc.data,
      blocked: true,
    },
  });
}

export async function callWinners(winners: any[]) {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const attendeesMap = syncService.syncMaps()("attendees");

  winners.forEach(async (winningBet) => {
    const winner = await attendeesMap
      .syncMapItems(winningBet.hashedSender)
      .fetch();
    const to = winner.data.sender.replace("whatsapp:", "");
    client.calls.create({
      twiml: await localizeStringForPhoneNumber(
        "winnerCall",
        to,
        winner.data.name,
      ),
      from: NEXT_PUBLIC_TWILIO_PHONE_NUMBER,
      to,
    });
    client.messages.create({
      body: await localizeStringForPhoneNumber("winner", to, winner.data.name),
      from: `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`,
      to: winner.data.sender,
    });
  });
}

export async function messageOthers(unluckyBets: any[], winningWedge: string) {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const attendeesMap = syncService.syncMaps()("attendees");
  unluckyBets.forEach(async (unluckyBet) => {
    const unluckyPlayer = await attendeesMap
      .syncMapItems(unluckyBet.hashedSender)
      .fetch();
    const body = await localizeStringForPhoneNumber(
      "loser",
      unluckyPlayer.data.sender,
      unluckyPlayer.data.name,
      winningWedge,
    );
    client.messages.create({
      body,
      from: `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`,
      to: unluckyPlayer.data.sender,
    });
  });
}
