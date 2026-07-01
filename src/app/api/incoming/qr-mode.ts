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
// Remove this entire block and replace the getBadgeData() call below with your
// real badge API once the event is over.
async function getBadgeData(ticketCode: string): Promise<BadgeData> {
  const apiKey = process.env.WEAREDEVS_LEAD_COLLECTION_KEY;
  if (!apiKey) {
    throw new Error("WEAREDEVS_LEAD_COLLECTION_KEY is not configured");
  }
  const res = await fetch("https://wad-api.wearedevelopers.com/api/partner/v1/events/16/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ticket_code: ticketCode }),
  });
  if (!res.ok) {
    throw new Error(`WeAreDevelopers badge API returned ${res.status}`);
  }
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

    // --- WEAREDEVS_TEMP_START --- replace getBadgeData with your real badge API after event
    let badgeData: BadgeData;
    try {
      badgeData = await getBadgeData(badgeId);
    } catch (e: any) {
      console.error("Badge lookup failed:", e.message);
      twimlRes.message(
        "Sorry, we couldn't retrieve your badge information right now. Please ask a Twilio team member for help.",
      );
      return twimlRes.toString();
    }
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
