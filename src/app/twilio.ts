"use server";

import AccessToken, { SyncGrant } from "twilio/lib/jwt/AccessToken";

import i18next from "i18next";
import { getCountry } from "./api/incoming/helper";
import { GameState, Stages } from "./types";
import { maskNumber } from "./util";
import axios from "axios";
import { TEMPLATE_PREFIX } from "@/scripts/contentTemplates";
import { getSettings } from "./settings";

const en = require("../locale/en.json");

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  SYNC_SERVICE_SID = "",
} = process.env;

function twilioFrom() {
  return `whatsapp:${process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER ?? ""}`;
}

enum Privilege {
  FRONTEND = "FRONTEND",
}
const client = require("twilio")(TWILIO_API_KEY, TWILIO_API_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

async function localizeStringForPhoneNumber(
  str: string,
  phone: string,
  params: {
    winningWedge?: string;
    smallPrize?: string;
  },
) {
  await i18next.init({
    lng: getCountry(phone)?.languages[0],
    fallbackLng: "en",
    resources: {
      en,
    },
  });

  return i18next.t(str, {
    winningWedge: params.winningWedge,
    smallPrize: params.smallPrize,
  });
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


export async function tempUnlockGame() {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = await syncService.documents()("bets").fetch();

  await betsDoc.update({
    data: {
      ...betsDoc.data,
      bets: [],
      temporaryBlock: false,
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
        name: w.data.fullName ?? w.data.name,
        smallPrize: w.data.smallPrize,
        stage: w.data.stage,
        sender: maskNumber(w.data.sender),
      };
    })
    .filter(
      (a: any) =>
        a.stage === Stages.WINNER_UNCLAIMED ||
        (allWinners && a.stage === Stages.WINNER_CLAIMED) ||
        (allWinners && a.stage === Stages.RAFFLE_WINNER),
    );
}

export interface StatsSummary {
  totalBets: number;
  uniqueBettors: number;
  roundsPlayed: number;
  distribution: { wedge: string; count: number }[];
  winners: { unclaimed: number; claimed: number; raffle: number };
  history: { timestamp: number; roundBets: number; cumulativeTotal: number }[];
}

export async function getStats(): Promise<StatsSummary> {
  const { wedges } = await getSettings();
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = await syncService.documents()("bets").fetch();
  const statsDoc = await syncService.documents()("stats").fetch();
  const attendeesMap = syncService.syncMaps()("attendees");

  const distribution: Record<string, number> = {
    ...(statsDoc.data.distribution || {}),
  };
  const uniques: Record<string, boolean> = { ...(statsDoc.data.uniques || {}) };

  const pendingBets: any[] = Object.values(betsDoc.data.bets || {});
  pendingBets.forEach((bet: any) => {
    distribution[bet[1]] = (distribution[bet[1]] || 0) + 1;
    uniques[bet[0]] = true;
  });

  let res = await attendeesMap.syncMapItems.page({ pageSize: 500 });
  const attendees: any[] = [...res.instances];
  while (res.nextPageUrl) {
    res = await res.nextPage();
    attendees.push(...res.instances);
  }

  const winners = attendees.reduce(
    (acc, attendee) => {
      if (attendee.data.stage === Stages.WINNER_UNCLAIMED) acc.unclaimed++;
      else if (attendee.data.stage === Stages.WINNER_CLAIMED) acc.claimed++;
      else if (attendee.data.stage === Stages.RAFFLE_WINNER) acc.raffle++;
      return acc;
    },
    { unclaimed: 0, claimed: 0, raffle: 0 },
  );

  return {
    totalBets: Object.values(distribution).reduce((sum, count) => sum + count, 0),
    uniqueBettors: Object.keys(uniques).length,
    roundsPlayed: (statsDoc.data.history || []).length,
    distribution: wedges.map((wedge) => ({
      wedge,
      count: distribution[wedge] || 0,
    })),
    winners,
    history: statsDoc.data.history || [],
  };
}

export async function winnerPrizeClaimed(winnerKey: string) {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const attendeesMap = syncService.syncMaps()("attendees");
  const winner = await attendeesMap.syncMapItems(winnerKey).fetch();

  await Promise.all([
    client.messages.create({
      body: await localizeStringForPhoneNumber(
        "prizePickup",
        winner.data.sender.replace("whatsapp:", ""),
        {},
      ),
      from: twilioFrom(),
      to: winner.data.sender,
    }),
    attendeesMap.syncMapItems(winnerKey).update({
      data: {
        ...winner.data,
        stage: Stages.WINNER_CLAIMED,
      },
    }),
  ]);
}

export async function tempLockGame() {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = syncService.documents()("bets");
  const completedBetsDoc = syncService.documents()("stats");

  const bets = await betsDoc.fetch();
  const DOUBLE_PRESS_EVENT = bets.data.temporaryBlock;
  if (DOUBLE_PRESS_EVENT) {
    return;
  }

  const completedBets = await completedBetsDoc.fetch();
  const actualBets = bets.data.bets || {};

  completedBets.data.distribution = completedBets.data.distribution || {};
  completedBets.data.uniques = completedBets.data.uniques || {};
  completedBets.data.history = completedBets.data.history || [];

  const roundBets = Object.values(actualBets).length;

  Object.values(actualBets).forEach((bet: any) => {
    completedBets.data.distribution[bet[1]] =
      completedBets.data.distribution[bet[1]] + 1 || 1;
    completedBets.data.uniques[bet[0]] = true;
  });

  const cumulativeTotal = Object.values(completedBets.data.distribution).reduce(
    (sum: number, count: any) => sum + count,
    0,
  );

  completedBets.data.history.push({
    timestamp: Date.now(),
    roundBets,
    cumulativeTotal,
  });

  await Promise.all([
    completedBetsDoc.update({
      data: {
        ...completedBets.data,
      },
    }),

    betsDoc.update({
      data: {
        ...bets.data,
        temporaryBlock: true,
      },
    }),
  ]);
}

export async function getGameState(): Promise<GameState> {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = await syncService.documents()("bets").fetch();

  return betsDoc.data.gameState || GameState.RUNNING;
}

export async function setGameState(gameState: GameState) {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const betsDoc = syncService.documents()("bets");
  const bets = await betsDoc.fetch();

  await betsDoc.update({
    data: {
      ...bets.data,
      gameState,
    },
  });
}

export async function notifyAndUpdateWinners(winners: any[]) {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const attendeesMap = syncService.syncMaps()("attendees");

  const { offeredPrizes: OFFERED_PRIZES, smallPrizes: availablePrizes } =
    await getSettings();

  await Promise.all(
    winners.map(async (winningBet) => {
      const winner = await attendeesMap.syncMapItems(winningBet[0]).fetch();

      const randomPrize =
        availablePrizes.length > 0
          ? ` a *${availablePrizes[Math.floor(Math.random() * availablePrizes.length)]}*`
          : "";

      let syncUpdateSucceeded = false;
      try {
        await attendeesMap.syncMapItems(winningBet[0]).update({
          data: {
            ...winner.data,
            stage: Stages.WINNER_UNCLAIMED,
            smallPrize: randomPrize,
          },
        });
        syncUpdateSucceeded = true;
      } catch (e: any) {
        if (e.code === 20404) {
          console.error(`User ${winningBet[0]} not found in sync map`);
        } else {
          console.error(e.message);
        }
      }

      if (!syncUpdateSucceeded) return;

      if (OFFERED_PRIZES === "small" || OFFERED_PRIZES === "both") {
        try {
          await callWinner(
            winner.data.sender.replace("whatsapp:", ""),
            winner.data.recipient.replace("whatsapp:", ""),
            false,
          );
        } catch (e: any) {
          console.error(e.message);
        }
      }

      let message;

      if (OFFERED_PRIZES === "big") {
        message = await localizeStringForPhoneNumber(
          "winnerMessageRaffleQualification",
          winner.data.sender.replace("whatsapp:", ""),
          {},
        );
      } else {
        message =
          (await localizeStringForPhoneNumber(
            "winnerMessageSmallPrizeStart",
            winner.data.sender.replace("whatsapp:", ""),
            { smallPrize: randomPrize },
          )) +
          (await localizeStringForPhoneNumber(
            OFFERED_PRIZES === "both"
              ? "winnerMessageBothPrizesEnd"
              : "winnerMessageSmallPrizeEnd",
            winner.data.sender.replace("whatsapp:", ""),
            {},
          ));
      }

      try {
        await client.messages.create({
          body: message,
          from: twilioFrom(),
          to: winner.data.sender,
        });
      } catch (e: any) {
        console.error(
          `Failed to send message to ${winner.data.sender}: ${e.message}`,
        );
      }
    }),
  );
}

export async function callWinner(
  to: string,
  from: string,
  rafflePrize: boolean,
) {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) throw new Error("BASE_URL environment variable is not set");

  const path = rafflePrize
    ? "/api/twiml/winner-raffle-prize"
    : "/api/twiml/winner-small-prize";

  await client.calls.create({
    url: `${baseUrl}${path}`,
    from,
    to,
  });
}

export async function fetchSegmentTraits(
  email: string,
  specificTrait?: string,
) {
  const { SEGMENT_SPACE_ID = "", SEGMENT_PROFILE_KEY = "" } = process.env;
  let url = `https://profiles.segment.com/v1/spaces/${SEGMENT_SPACE_ID}/collections/users/profiles/email:${email}/traits`;
  if (specificTrait) {
    url += `?include=${specificTrait}`;
  }
  try {
    const response = await axios.get(url, {
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

export async function sendRaffleWinnerMessage(to: string) {
  await client.messages.create({
    body: await localizeStringForPhoneNumber("winnerMessageRafflePrize", to, {}),
    from: twilioFrom(),
    to,
  });
}

export async function messageOthers(unluckyBets: any[], winningWedge: string) {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const attendeesMap = syncService.syncMaps()("attendees");
  const { maxBetsPerUser } = await getSettings();

  await Promise.all(
    unluckyBets.map(async (unluckyBet) => {
      try {
        const unluckyPlayer = await attendeesMap
          .syncMapItems(unluckyBet[0])
          .fetch();
        const hasMoreBetsLeft =
          maxBetsPerUser === 0 ||
          unluckyPlayer.data?.submittedBets + 1 <= maxBetsPerUser;

        const body = await localizeStringForPhoneNumber(
          hasMoreBetsLeft ? "loserHasMoreTries" : "loserLastTry",
          unluckyPlayer.data.sender,
          { winningWedge },
        );
        await client.messages.create({
          body,
          from: twilioFrom(),
          to: unluckyPlayer.data.sender,
        });
      } catch (e: any) {
        if (e.code === 20404) {
          console.error(`User ${unluckyBet[0]} not found in sync map`);
        } else {
          console.error(e.message);
        }
      }
    }),
  );
}


export async function getAllTemplates() {
  let matches: any[] = [];
  try {
    let nextUrl = "https://content.twilio.com/v1/Content?PageSize=200",
      allTemplates: any[] = [];
    do {
      const res = await axios.get(nextUrl, {
        // TODO: Page through all templates
        headers: {
          "Content-Type": "application/json",
        },
        auth: {
          username: TWILIO_API_KEY,
          password: TWILIO_API_SECRET,
        },
      });

      allTemplates = allTemplates.concat(res.data.contents);
      nextUrl = res.data.meta.next_page_url;
    } while (nextUrl);

    matches = allTemplates.filter((t: any) =>
      t.friendly_name.includes(TEMPLATE_PREFIX),
    );
  } catch (err) {
    console.error(err);
    throw new Error("Failed to fetch Templates");
  }
  if (!matches) {
    throw new Error(`No templates found for ${TEMPLATE_PREFIX}`);
  }
  return matches;
}

const templates = await getAllTemplates();

export async function getTemplate(name: string, language?: string) {
  const rightLanguage = templates.find((t: any) =>
    t.friendly_name.includes(`_${name}_${language}`),
  );
  const englishLanguage = templates.find((t: any) =>
    t.friendly_name.includes(`_${name}_en`),
  );
  return rightLanguage || englishLanguage;
}

export const raffleWinner = async () => {
  const { offeredPrizes: OFFERED_PRIZES } = await getSettings();
  if (OFFERED_PRIZES !== "big" && OFFERED_PRIZES !== "both") {
    console.log("No raffle prize offered");
    return {
      message: "No raffle prize offered",
    };
  }

  const attendeesMap = await client.sync.v1
    .services(SYNC_SERVICE_SID)
    .syncMaps("attendees");

  let res: any = await attendeesMap.syncMapItems.page({
    pageSize: 1000,
  });

  const mapItems = [...res.instances];
  while (res.nextPageUrl) {
    res = await res.nextPage();
    mapItems.push(...res.instances);
  }

  const potentialWinners = mapItems.filter(
    (attendee) =>
      attendee.data.stage === Stages.WINNER_UNCLAIMED ||
      attendee.data.stage === Stages.WINNER_CLAIMED,
  );

  if (potentialWinners.length === 0) {
    console.log("No potential winners found because no one has won yet.");
    return {
      message: "No potential winners found because no one has won yet.",
    };
  }

  const winner =
    potentialWinners[Math.floor(Math.random() * potentialWinners.length)];

  await client.sync.v1
    .services(SYNC_SERVICE_SID)
    .syncMaps("attendees")
    .syncMapItems(winner.key)
    .update({
      data: {
        ...winner.data,
        stage: Stages.RAFFLE_WINNER,
      },
    });

  await sendRaffleWinnerMessage(winner.data.sender);

  await callWinner(
    winner.data.sender.replace("whatsapp:", ""),
    winner.data.recipient.replace("whatsapp:", ""),
    true,
  );

  console.log("Found winner and called them");
  return { message: "Found winner and called them" };
};
