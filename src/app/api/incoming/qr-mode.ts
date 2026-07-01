import twilio, { twiml } from "twilio";
import i18next from "i18next";
import { createHash } from "crypto";
import type { MemoryClient, TACConfig } from "twilio-agent-connect";
import { Player, Stages } from "../../types";
import { SyncMapContext } from "twilio/lib/rest/sync/v1/service/syncMap";
import { DocumentInstance } from "twilio/lib/rest/sync/v1/service/document";
import { getTemplate } from "@/app/twilio";
import {
  initI18n,
  handleBets,
  handleWinnerStages,
  ONE_WEEK,
} from "./helper";
import {
  lookupProfileByPhone,
  createBadgeProfile,
  type BadgeData,
} from "./memory";
import { decodeQrFromUrl } from "./qr-decoder";

const {
  TWILIO_ACCOUNT_SID = "",
  TWILIO_AUTH_TOKEN = "",
  NEXT_PUBLIC_TWILIO_PHONE_NUMBER = "",
} = process.env;

// --- WEAREDEVS_TEMP_START ---
// Temporary WeAreDevelopers World Congress badge lookup.
// Remove this block and the getBadgeData() call below once the event is over.
// Controlled by env var WEAREDEVS_LEAD_COLLECTION_KEY — if absent, falls back
// to the random stub below.
async function fetchWeAreDevsBadge(ticketCode: string): Promise<BadgeData | null> {
  const apiKey = process.env.WEAREDEVS_LEAD_COLLECTION_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://wad-api.wearedevelopers.com/api/partner/v1/events/16/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ticket_code: ticketCode }),
    });
    if (!res.ok) return null;
    const d = await res.json() as {
      first_name: string;
      last_name: string;
      email: string;
      job_position: string;
      company: string;
      country: string;
    };
    return {
      id: ticketCode,
      firstName: d.first_name,
      lastName: d.last_name,
      email: d.email,
      jobTitle: d.job_position,
      company: d.company,
      country: d.country,
    };
  } catch {
    return null;
  }
}
// --- WEAREDEVS_TEMP_END ---

const FIRST_NAMES = ["Alex", "Jordan", "Sam", "Taylor", "Morgan"];
const LAST_NAMES = ["Johnson", "Müller", "Tanaka", "Smith", "Garcia"];
const COMPANIES = ["Acme Corp", "Globex GmbH", "Initech Ltd", "Umbrella Inc"];
const COUNTRIES = ["Germany", "United States", "Japan", "United Kingdom"];
const JOB_TITLES = ["Software Engineer", "Product Manager", "UX Designer", "Developer Advocate"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// TODO: replace with real badge lookup API call
function getRandomBadgeData(badgeId: string): BadgeData {
  return {
    id: badgeId,
    firstName: pick(FIRST_NAMES),
    lastName: pick(LAST_NAMES),
    company: pick(COMPANIES),
    email: `badge.${badgeId}@example.com`,
    country: pick(COUNTRIES),
    jobTitle: pick(JOB_TITLES),
  };
}

// --- WEAREDEVS_TEMP_START ---
// Returns WeAreDevelopers badge data if WEAREDEVS_LEAD_COLLECTION_KEY is set,
// otherwise falls back to the random stub. Remove once the event is over.
async function getBadgeData(badgeId: string): Promise<BadgeData> {
  if (process.env.WEAREDEVS_LEAD_COLLECTION_KEY) {
    const data = await fetchWeAreDevsBadge(badgeId);
    if (data) return data;
  }
  return getRandomBadgeData(badgeId);
}
// --- WEAREDEVS_TEMP_END ---

export async function handleQrMode(
  currentUser: Player | undefined,
  memoryClient: MemoryClient,
  client: twilio.Twilio,
  {
    senderName,
    senderID,
    recipient,
    messageContent,
    attendeesMap,
    betsDoc,
    numMedia,
    mediaUrl,
  }: {
    senderName?: string;
    senderID?: string;
    recipient: string;
    messageContent: string;
    attendeesMap: SyncMapContext;
    betsDoc: DocumentInstance;
    numMedia: number;
    mediaUrl?: string;
  },
): Promise<string> {
  const twimlRes = new twiml.MessagingResponse();
  const from = `whatsapp:${NEXT_PUBLIC_TWILIO_PHONE_NUMBER}`;

  // Strip whatsapp: prefix for Memory API (needs E.164)
  const phone = (senderID ?? "").replace(/^[a-z]+:/i, "");

  const country = await initI18n(currentUser?.sender || senderID || "");
  const hashedSender = createHash("sha256")
    .update(currentUser?.sender || senderID || "")
    .digest("hex");

  const ctx = { senderName, senderID, recipient, messageContent, attendeesMap, betsDoc };

  // Already registered — handle bets / winner stages
  if (currentUser?.stage === Stages.VERIFIED_USER) {
    return handleBets(currentUser, client, ctx, hashedSender, country);
  }

  if (
    currentUser?.stage === Stages.WINNER_UNCLAIMED ||
    currentUser?.stage === Stages.WINNER_CLAIMED ||
    currentUser?.stage === Stages.RAFFLE_WINNER
  ) {
    return handleWinnerStages(currentUser, client);
  }

  // Not yet registered — check if Memory profile exists
  const profileId = await lookupProfileByPhone(memoryClient, phone);

  if (profileId) {
    // Has a memory profile but no Sync entry — create it and prompt for bets
    const contentTemplate = await getTemplate("AskForBets", country?.languages[0]);
    await attendeesMap.syncMapItems.create({
      ttl: ONE_WEEK,
      key: hashedSender,
      data: {
        name: senderName,
        country: country?.name,
        recipient,
        sender: senderID,
        submittedBets: 0,
        stage: Stages.VERIFIED_USER,
        profileId,
      },
    });
    await client.messages.create({
      contentSid: contentTemplate.sid,
      from,
      to: senderID || "",
    });
    return twimlRes.toString();
  }

  // No profile — expect a QR photo
  if (numMedia > 0 && mediaUrl) {
    const qrData = await decodeQrFromUrl(mediaUrl, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    if (!qrData) {
      twimlRes.message(
        "I couldn't read a QR code from that image. Please try again with a clear photo of your badge.",
      );
      return twimlRes.toString();
    }

    const badgeId = qrData.includes("=")
      ? new URLSearchParams(qrData).get("id") ?? qrData
      : qrData;

    // --- WEAREDEVS_TEMP_START --- use getBadgeData → getRandomBadgeData after event
    const badgeData = await getBadgeData(badgeId);
    // --- WEAREDEVS_TEMP_END ---

    const newProfileId = await createBadgeProfile(memoryClient, phone, badgeData);

    await attendeesMap.syncMapItems.create({
      ttl: ONE_WEEK,
      key: hashedSender,
      data: {
        name: `${badgeData.firstName} ${badgeData.lastName}`,
        country: badgeData.country,
        recipient,
        sender: senderID,
        submittedBets: 0,
        stage: Stages.VERIFIED_USER,
        profileId: newProfileId,
      },
    });

    const contentTemplate = await getTemplate("AskForBets", country?.languages[0]);
    twimlRes.message(
      `Welcome, ${badgeData.firstName} ${badgeData.lastName}! You're now registered. Text a wedge to play.`,
    );
    await client.messages.create({
      contentSid: contentTemplate.sid,
      from,
      to: senderID || "",
    });
    return twimlRes.toString();
  }

  // No photo, not registered
  twimlRes.message(
    "Hi! I don't recognize you yet. Please send a photo of your badge QR code to get started.",
  );
  return twimlRes.toString();
}
