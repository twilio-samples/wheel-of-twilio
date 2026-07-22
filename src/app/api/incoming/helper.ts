import { ICountry, countries } from "countries-list";
import { PhoneNumberUtil } from "google-libphonenumber";

const phoneUtil = PhoneNumberUtil.getInstance();

import twilio, { twiml } from "twilio";
import i18next from "i18next";
import { GameState, Player, Stages } from "../../types";
import { SyncMapContext } from "twilio/lib/rest/sync/v1/service/syncMap";
import { DocumentInstance } from "twilio/lib/rest/sync/v1/service/document";
import { getTemplate } from "@/app/twilio";

const en = require("../../../locale/en.json");

const ONE_WEEK = 60 * 60 * 24 * 7;
export { ONE_WEEK };

const {
  NEXT_PUBLIC_TWILIO_PHONE_NUMBER = "",
  NEXT_PUBLIC_WEDGES = "",
  EVENT_NAME = "",
} = process.env;

const wedges = NEXT_PUBLIC_WEDGES.split(",");

const regexForEmail = /[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/;
export { regexForEmail };

const regexFor6ConsecutiveDigits = /\d{6}/;
export { regexFor6ConsecutiveDigits };

export async function initI18n(senderID: string) {
  let lng;
  if (senderID) {
    lng = getCountry(senderID)?.languages[0];
  }

  await i18next.init({
    lng,
    fallbackLng: "en",
    resources: {
      en,
    },
  });
  return getCountry(senderID);
}

export async function getUserRemovedResponse(sender: string) {
  await initI18n(sender);
  const twimlRes = new twiml.MessagingResponse();
  twimlRes.message(i18next.t("userRemoved"));

  return twimlRes.toString();
}

export interface BetsContext {
  recipient: string;
  messageContent: string;
  attendeesMap: SyncMapContext;
  betsDoc: DocumentInstance;
  senderID?: string;
  senderName?: string;
}

export async function handleBets(
  currentUser: Player,
  client: twilio.Twilio,
  ctx: BetsContext,
  hashedSender: string,
  country: ICountry | undefined,
): Promise<string> {
  const { MAX_BETS_PER_USER = "0" } = process.env;
  const { messageContent, betsDoc, attendeesMap, senderName, senderID } = ctx;
  const twimlRes = new twiml.MessagingResponse();
  const from = `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`;

  if (betsDoc.data.temporaryBlock) {
    twimlRes.message(i18next.t("betsNotAccepted"));
    return twimlRes.toString();
  }

  if (betsDoc.data.gameState === GameState.ENDED) {
    twimlRes.message(i18next.t("gameEnded"));
    return twimlRes.toString();
  }

  if (betsDoc.data.gameState === GameState.PAUSED) {
    twimlRes.message(i18next.t("betsNotAccepted"));
    return twimlRes.toString();
  }

  if (
    wedges.some((wedge) =>
      capitalizeEachWord(messageContent).includes(capitalizeEachWord(wedge)),
    )
  ) {
    // @ts-ignore
    const bets = betsDoc.data.bets ? [...betsDoc.data.bets] : [];
    const selectedBet = [...wedges]
      .sort((a, b) => b.length - a.length)
      .find((wedge) =>
        capitalizeEachWord(messageContent).includes(capitalizeEachWord(wedge)),
      );

    const existingBet = bets.find((bet: any) => bet[0] === hashedSender);
    const maxBetsReached =
      parseInt(MAX_BETS_PER_USER) > 0 &&
      currentUser.submittedBets >= parseInt(MAX_BETS_PER_USER);

    if (!existingBet && maxBetsReached) {
      twimlRes.message(i18next.t("maxBetsReached"));
      return twimlRes.toString();
    }

    if (existingBet) {
      existingBet[1] = selectedBet;
    } else {
      bets.push([
        hashedSender,
        selectedBet,
        senderName || maskNumber(senderID || ""),
      ]);
    }

    await betsDoc.update({
      data: {
        ...betsDoc.data,
        full: false,
        bets: [...bets],
      },
    });

    if (!existingBet) {
      await attendeesMap.syncMapItems(hashedSender).update({
        data: {
          ...currentUser,
          submittedBets: currentUser.submittedBets + 1,
          event: EVENT_NAME,
        },
      });
    }

    twimlRes.message(
      i18next.t("betPlaced", { messageContent: selectedBet }),
    );
    return twimlRes.toString();
  }

  // Invalid bet — send template
  const contentTemplate = await getTemplate("InvalidBet", country?.languages[0]);
  await client.messages.create({
    contentSid: contentTemplate.sid,
    from,
    to: currentUser.sender,
  });
  return twimlRes.toString();
}

export async function handleWinnerStages(
  currentUser: Player,
  client: twilio.Twilio,
): Promise<string> {
  const { OFFERED_PRIZES } = process.env;
  const from = `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`;
  const twimlRes = new twiml.MessagingResponse();

  if (currentUser.stage === Stages.WINNER_UNCLAIMED) {
    await client.messages.create({
      body:
        OFFERED_PRIZES === "small" || OFFERED_PRIZES === "both"
          ? i18next.t("alreadyPlayedNotClaimedSmallPrize")
          : i18next.t("alreadyPlayedAndQualified"),
      from,
      to: currentUser.sender,
    });
  } else if (
    currentUser.stage === Stages.WINNER_CLAIMED ||
    currentUser.stage === Stages.RAFFLE_WINNER
  ) {
    await client.messages.create({
      body: i18next.t("alreadyPlayedPrizeClaimed"),
      from,
      to: currentUser.sender,
    });
  }

  return twimlRes.toString();
}

export function getCountry(phone: string): ICountry | undefined {
  const number = phoneUtil.parseAndKeepRawInput(phone.replace("whatsapp:", ""));
  const regionCode = phoneUtil.getRegionCodeForNumber(number);
  if (regionCode === undefined) {
    return undefined;
  }

  return countries[regionCode as keyof typeof countries];
}

export function capitalizeEachWord(str: string) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sanitizeFullName(fullName: string) {
  return fullName
    .replace(/[^a-zA-Z\s-]/g, "")
    .replace(/\s/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function maskNumber(phone: string): string {
  return phone.replace(/(\+?\d{2})\d+(\d{2})/, "$1****$2");
}
