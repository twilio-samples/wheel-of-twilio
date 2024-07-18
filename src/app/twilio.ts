// Copyright 2024 Twilio Inc.

"use server";

import AccessToken, { SyncGrant } from "twilio/lib/jwt/AccessToken";

import i18next from "i18next";
import { getCountry } from "./api/incoming/helper";
import { Stages } from "./types";

const en = require("../locale/en.json");
const de = require("../locale/de.json");
const fr = require("../locale/fr.json");
const es = require("../locale/es.json");

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  NEXT_PUBLIC_TWILIO_PHONE_NUMBER = "",
  SYNC_SERVICE_SID = "",
  OFFER_SMALL_PRIZES = "false",
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
      fr,
      es,
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

export async function unblockGame() {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = syncService.documents()("bets");

  await betsDoc.update({
    data: {
      bets: {},
      blocked: false,
    },
  });
}

export interface MaskedPlayer {
  name: string;
  sender: string;
  stage: Stages;
}

export async function getWinners(allWinners: boolean): Promise<MaskedPlayer[]> {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const attendeesMap = syncService.syncMaps()("attendees");
  const winners: MaskedPlayer[] = await attendeesMap.syncMapItems.list({
    limit: 500,
  });

  return winners
    .map((w: any) => {
      return {
        key: w.key,
        name: w.data.name,
        stage: w.data.stage,
        sender: w.data.sender
          .replace("whatsapp:", "")
          .replace(/(\d{2})\d{6}(\d+)/, "$1******$2"),
      };
    })
    .filter(
      (a: any) =>
        a.stage === Stages.WINNER_UNCLAIMED ||
        (allWinners && a.stage === Stages.WINNER_CLAIMED) ||
        (allWinners && a.stage === Stages.RAFFLE_WINNER),
    );
}

export async function winnerPrizeClaimed(winnerKey: string) {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const attendeesMap = syncService.syncMaps()("attendees");
  const winner = await attendeesMap.syncMapItems(winnerKey).fetch();

  await attendeesMap.syncMapItems(winnerKey).update({
    data: {
      ...winner.data,
      stage: Stages.WINNER_CLAIMED,
    },
  });
}

export async function blockGame() {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = syncService.documents()("bets");
  const completedBetsDoc = syncService.documents()("completedBets");

  const bets = await betsDoc.fetch();
  const completedBets = await completedBetsDoc.fetch();
  const actualBets = bets.data.bets;

  Object.values(actualBets).forEach((bet: any) => {
    completedBets.data[bet.bet] = completedBets.data[bet.bet] + 1 || 1;
  });

  Promise.all([
    await completedBetsDoc.update({
      data: {
        ...completedBets.data,
      },
    }),

    await betsDoc.update({
      data: {
        ...betsDoc.data,
        blocked: true,
      },
    }),
  ]);
}

export async function notifyAndUpdateWinners(winners: any[]) {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const attendeesMap = syncService.syncMaps()("attendees");

  await Promise.all(
    winners.map(async (winningBet) => {
      const winner = await attendeesMap
        .syncMapItems(winningBet.hashedSender)
        .fetch();

      await attendeesMap.syncMapItems(winningBet.hashedSender).update({
        data: {
          ...winner.data,
          stage: Stages.WINNER_UNCLAIMED,
        },
      });

      const to = winner.data.sender.replace("whatsapp:", "");
      if (OFFER_SMALL_PRIZES === "true") {
        await callWinner(winner.data.name, to, false);
      }

      await client.messages.create({
        body: await localizeStringForPhoneNumber(
          OFFER_SMALL_PRIZES === "true"
            ? "winnerMessageSmallPrize"
            : "winnerMessage",
          to,
          winner.data.name,
        ),
        from: `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`,
        to: winner.data.sender,
      });
    }),
  );
}

export async function callWinner(
  name: string,
  to: string,
  rafflePrize: boolean,
) {
  await client.calls.create({
    twiml: await localizeStringForPhoneNumber(
      rafflePrize ? "winnerCallRafflePrize" : "winnerCallSmallPrize",
      to,
      name,
    ),
    from: NEXT_PUBLIC_TWILIO_PHONE_NUMBER,
    to,
  });
}

export async function sendRaffleWinnerMessage(name: string, to: string) {
  await client.messages.create({
    body: await localizeStringForPhoneNumber(
      "winnerMessageRafflePrize",
      to,
      name,
    ),
    from: `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`,
    to,
  });
}

export async function messageOthers(unluckyBets: any[], winningWedge: string) {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const attendeesMap = syncService.syncMaps()("attendees");
  await Promise.all(
    unluckyBets.map(async (unluckyBet) => {
      const unluckyPlayer = await attendeesMap
        .syncMapItems(unluckyBet.hashedSender)
        .fetch();
      const body = await localizeStringForPhoneNumber(
        "loser",
        unluckyPlayer.data.sender,
        unluckyPlayer.data.name,
        winningWedge,
      );
      await client.messages.create({
        body,
        from: `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`,
        to: unluckyPlayer.data.sender,
      });
    }),
  );
}
