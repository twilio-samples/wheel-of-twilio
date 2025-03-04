"use server";

import AccessToken, { SyncGrant } from "twilio/lib/jwt/AccessToken";

import i18next from "i18next";
import { getCountry } from "./api/incoming/helper";
import { Stages } from "./types";
import { maskNumber } from "./util";
import Axios from "axios";

const en = require("../locale/en.json");
const de = require("../locale/de.json");
const fr = require("../locale/fr.json");
const es = require("../locale/es.json");

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  MESSAGING_SERVICE_SID = "",
  SYNC_SERVICE_SID = "",
  OFFER_SMALL_PRIZES = "false",
  SEGMENT_SPACE_ID = "",
  SEGMENT_PROFILE_KEY = "",
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
  winningWedge?: string
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
    }
  );

  token.addGrant(syncGrant);

  return token.toJwt();
}

export async function tempUnlockGame() {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = syncService.documents()("bets");

  await betsDoc.update({
    data: {
      bets: [],
      temporaryBlock: false,
      closed: false,
      full: false,
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

  let res = await attendeesMap.syncMapItems.page({
    pageSize: 500,
  });

  const winners: MaskedPlayer[] = [...res.instances];
  while (res.nextPageUrl) {
    res = await res.nextPage();
    winners.push(...res.instances);
  }

  return winners
    .map((w: any) => {
      return {
        key: w.key,
        name: w.data.fullName,
        stage: w.data.stage,
        sender: maskNumber(w.data.sender),
      };
    })
    .filter(
      (a: any) =>
        a.stage === Stages.WINNER_UNCLAIMED ||
        (allWinners && a.stage === Stages.WINNER_CLAIMED) ||
        (allWinners && a.stage === Stages.RAFFLE_WINNER)
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

export async function tempLockGame() {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = syncService.documents()("bets");
  const completedBetsDoc = syncService.documents()("completedBets");

  const bets = await betsDoc.fetch();
  const completedBets = await completedBetsDoc.fetch();
  const actualBets = bets.data.bets;

  Object.values(actualBets).forEach((bet: any) => {
    completedBets.data[bet.bet] = completedBets.data[bet.bet] + 1 || 1;
  });

  await Promise.all([
    completedBetsDoc.update({
      data: {
        ...completedBets.data,
      },
    }),
    betsDoc.update({
      data: {
        ...betsDoc.data,
        temporaryBlock: true,
      },
    }),
  ]);
}

export async function changeGameLock(severity: "running" | "break" | "end") {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = syncService.documents()("bets");

  const pause =
    severity === "break"
      ? {
          quickBreak: true,
          eventEnded: false,
        }
      : severity === "end"
        ? {
            quickBreak: false,
            eventEnded: true,
          }
        : {
            quickBreak: false,
            eventEnded: false,
          };

  await Promise.all([
    betsDoc.update({
      data: {
        ...betsDoc.data,
        ...pause,
      },
    }),
  ]);
}

export async function notifyAndUpdateWinners(winners: any[]) {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const attendeesMap = syncService.syncMaps()("attendees");

  await Promise.all(
    winners.map(async (winningBet) => {
      const winner = await attendeesMap.syncMapItems(winningBet[0]).fetch();

      try {
        await attendeesMap.syncMapItems(winningBet[0]).update({
          data: {
            ...winner.data,
            stage: Stages.WINNER_UNCLAIMED,
          },
        });
      } catch (e: any) {
        if (e.code === 20404) {
          console.error(`User ${winningBet[0]} not found in sync map`);
        } else {
          console.error(e.message);
        }
      }

      if (OFFER_SMALL_PRIZES === "true") {
        await callWinner(
          winner.data.fullName,
          winner.data.sender.replace("whatsapp:", ""),
          winner.data.recipient.replace("whatsapp:", ""),
          false
        );
      }

      await client.messages.create({
        body: await localizeStringForPhoneNumber(
          OFFER_SMALL_PRIZES === "true"
            ? "winnerMessageSmallPrize"
            : "winnerMessage",
          winner.data.sender.replace("whatsapp:", ""),
          winner.data.fullName
        ),
        messagingServiceSid: MESSAGING_SERVICE_SID,
        from: winner.data.recipient,
        to: winner.data.sender,
      });
    })
  );
}

export async function callWinner(
  name: string,
  to: string,
  from: string,
  rafflePrize: boolean
) {
  await client.calls.create({
    twiml: await localizeStringForPhoneNumber(
      rafflePrize ? "winnerCallRafflePrize" : "winnerCallSmallPrize",
      to,
      name
    ),
    from,
    to,
  });
}

export async function sendRaffleWinnerMessage(
  name: string,
  to: string,
  from: string
) {
  await client.messages.create({
    body: await localizeStringForPhoneNumber(
      "winnerMessageRafflePrize",
      to,
      name
    ),
    from,
    to,
  });
}

export async function messageOthers(unluckyBets: any[], winningWedge: string) {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const attendeesMap = syncService.syncMaps()("attendees");
  await Promise.all(
    unluckyBets.map(async (unluckyBet) => {
      try {
        const unluckyPlayer = await attendeesMap
          .syncMapItems(unluckyBet[0])
          .fetch();
        const body = await localizeStringForPhoneNumber(
          "loser",
          unluckyPlayer.data.sender,
          unluckyPlayer.data.fullName,
          winningWedge
        );
        await client.messages.create({
          body,
          messagingServiceSid: MESSAGING_SERVICE_SID,
          from: unluckyPlayer.data.recipient,
          to: unluckyPlayer.data.sender,
        });
      } catch (e: any) {
        if (e.code === 20404) {
          console.error(`User ${unluckyBet[0]} not found in sync map`);
        } else {
          console.error(e.message);
        }
      }
    })
  );
}

export async function fetchSegmentTraits(
  email: string,
  specificTrait?: string
) {
  let url = `https://profiles.segment.com/v1/spaces/${SEGMENT_SPACE_ID}/collections/users/profiles/email:${email}/traits`;
  if (specificTrait) {
    url += `?include=${specificTrait}`;
  }
  try {
    const response = await Axios.get(url, {
      headers: {
        Authorization: `Basic ${btoa(SEGMENT_PROFILE_KEY + ":")}`,
      },
    });
    return response.data.traits;
  } catch (e: any) {
    if (e.response?.status === 404) {
      return null;
    } else {
      throw e;
    }
  }
}
