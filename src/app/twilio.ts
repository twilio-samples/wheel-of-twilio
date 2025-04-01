"use server";

import AccessToken, { SyncGrant } from "twilio/lib/jwt/AccessToken";

import i18next from "i18next";
import { getCountry } from "./api/incoming/helper";
import { Stages } from "./types";
import { maskNumber } from "./util";
import Axios from "axios";
import axios from "axios";
import { TEMPLATE_PREFIX } from "@/scripts/contentTemplates";

const en = require("../locale/en.json");

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  MESSAGING_SERVICE_SID = "",
  SYNC_SERVICE_SID = "",
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
  winningWedge?: string
) {
  await i18next.init({
    lng: getCountry(phone)?.languages[0],
    fallbackLng: "en",
    resources: {
      en,
    },
  });

  return i18next.t(str, { winningWedge });
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

  await Promise.all([
    client.messages.create({
      body: await localizeStringForPhoneNumber(
        "prizePickup",
        winner.data.sender.replace("whatsapp:", "")
      ),
      messagingServiceSid: MESSAGING_SERVICE_SID,
      from: winner.data.recipient,
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
  const actualBets = bets.data.bets;

  completedBets.data.distribution = completedBets.data.distribution || {};
  completedBets.data.uniques = completedBets.data.uniques || {};

  Object.values(actualBets).forEach((bet: any) => {
    completedBets.data.distribution[bet[1]] =
      completedBets.data.distribution[bet[1]] + 1 || 1;
    completedBets.data.uniques[bet[0]] = true;
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

  const { OFFERED_PRIZES } = process.env;

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

      if (OFFERED_PRIZES === "small" || OFFERED_PRIZES === "both") {
        await callWinner(
          winner.data.sender.replace("whatsapp:", ""),
          winner.data.recipient.replace("whatsapp:", ""),
          false
        );
      }

      await client.messages.create({
        body: await localizeStringForPhoneNumber(
          OFFERED_PRIZES === "small"
            ? "winnerMessageSmallPrize"
            : OFFERED_PRIZES === "big"
              ? "winnerMessageRaffleQualification"
              : "winnerMessageBothPrizes",
          winner.data.sender.replace("whatsapp:", "")
        ),
        messagingServiceSid: MESSAGING_SERVICE_SID,
        from: winner.data.recipient,
        to: winner.data.sender,
      });
    })
  );
}

export async function callWinner(
  to: string,
  from: string,
  rafflePrize: boolean
) {
  await client.calls.create({
    twiml: await localizeStringForPhoneNumber(
      rafflePrize ? "winnerCallRafflePrize" : "winnerCallSmallPrize",
      to
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
    body: await localizeStringForPhoneNumber("winnerMessageRafflePrize", to),
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
      t.friendly_name.includes(TEMPLATE_PREFIX)
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
    t.friendly_name.includes(`_${name}_${language}`)
  );
  const englishLanguage = templates.find((t: any) =>
    t.friendly_name.includes(`_${name}_en`)
  );
  return rightLanguage || englishLanguage;
}

export const raffleWinner = async () => {
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
      attendee.data.stage === Stages.WINNER_CLAIMED
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

  await sendRaffleWinnerMessage(
    winner.data.fullName,
    winner.data.sender,
    winner.data.recipient
  );

  await callWinner(
    winner.data.sender.replace("whatsapp:", ""),
    winner.data.recipient.replace("whatsapp:", ""),
    true
  );

  console.log("Found winner and called them");
  return { message: "Found winner and called them" };
};
