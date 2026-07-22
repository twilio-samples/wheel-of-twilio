import twilio, { twiml } from "twilio";
import i18next from "i18next";
import { createHash } from "crypto";
import type { MemoryClient, TACConfig } from "twilio-agent-connect";
import { Player, Settings, Stages } from "../../types";
import { SyncMapContext } from "twilio/lib/rest/sync/v1/service/syncMap";
import { DocumentInstance } from "twilio/lib/rest/sync/v1/service/document";
import { getTemplate } from "@/app/twilio";
import { settingsFromEnv } from "@/app/settings-defaults";
import {
  initI18n,
  handleBets,
  handleWinnerStages,
  ONE_WEEK,
  sleep,
} from "./helper";
import {
  lookupProfileByPhone,
  getProfileTraits,
  createBadgeProfile,
  type BadgeData,
} from "./memory";
import { decodeQrFromUrl } from "./qr-decoder";
import { checkSegmentTraits } from "./segment";

const {
  TWILIO_ACCOUNT_SID = "",
  TWILIO_AUTH_TOKEN = "",
  NEXT_PUBLIC_TWILIO_PHONE_NUMBER = "",
} = process.env;

// --- WEAREDEVS_TEMP_START ---
// Temporary WeAreDevelopers World Congress badge lookup.
// Remove this entire block and replace the getBadgeData() call below with your
// real badge API once the event is over.
async function getBadgeData(ticketCode: string): Promise<BadgeData | null> {
  const apiKey = process.env.WEAREDEVS_LEAD_COLLECTION_KEY;
  if (!apiKey) {
    console.error("WEAREDEVS_LEAD_COLLECTION_KEY is not configured");
    return null;
  }
  try {
    const res = await fetch("https://wad-api.wearedevelopers.com/api/partner/v1/events/16/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ticket_code: ticketCode }),
    });
    if (!res.ok) {
      console.error(`WeAreDevelopers badge API returned ${res.status}`);
      return null;
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
  } catch (e: any) {
    console.error("Badge API error:", e.message);
    return null;
  }
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
    settings = settingsFromEnv(),
  }: {
    senderName?: string;
    senderID?: string;
    recipient: string;
    messageContent: string;
    attendeesMap: SyncMapContext;
    betsDoc: DocumentInstance;
    numMedia: number;
    mediaUrl?: string;
    settings?: Settings;
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

  const ctx = { senderName, senderID, recipient, messageContent, attendeesMap, betsDoc, settings };

  // Already registered — handle bets / winner stages
  if (currentUser?.stage === Stages.VERIFIED_USER) {
    return handleBets(currentUser, client, ctx, hashedSender, country);
  }

  if (
    currentUser?.stage === Stages.WINNER_UNCLAIMED ||
    currentUser?.stage === Stages.WINNER_CLAIMED ||
    currentUser?.stage === Stages.RAFFLE_WINNER
  ) {
    return handleWinnerStages(currentUser, client, settings);
  }

  // Not yet registered — check if Memory profile exists
  const profileId = await lookupProfileByPhone(memoryClient, phone);

  if (profileId) {
    // Has a memory profile but no Sync entry — create it and prompt for bets
    const [contentTemplate, profileTraits] = await Promise.all([
      getTemplate("AskForBets", country?.languages[0]),
      getProfileTraits(memoryClient, profileId),
    ]);
    const firstName = (profileTraits?.Contact as any)?.firstName as string | undefined;
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
      body: firstName ? `Welcome back, ${firstName}! 👋` : "Welcome back! 👋",
      from,
      to: senderID || "",
    });
    await sleep(500);
    await client.messages.create({
      contentSid: contentTemplate.sid,
      from,
      to: senderID || "",
    });
    return twimlRes.toString();
  }

  // No profile — expect a QR photo
  if (numMedia > 0 && mediaUrl) {
    // Acknowledge immediately — QR parsing takes a moment
    await client.messages.create({
      body: "Got your image! Scanning your badge QR code now...",
      from,
      to: senderID || "",
    });

    const qrData = await decodeQrFromUrl(mediaUrl, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Could not decode any QR code from the image
    if (!qrData) {
      await client.messages.create({
        body: "I couldn't scan a QR code from that image. Please make sure your badge QR code is clearly visible, well-lit and in focus, then try again.",
        from,
        to: senderID || "",
      });
      return twimlRes.toString();
    }

    // --- WEAREDEVS_TEMP_START ---
    if (!qrData.startsWith("ti_")) {
      await client.messages.create({
        body: "I scanned a QR code but it doesn't look like a WeAreDevelopers ticket. Are you sure you scanned the QR code on your badge and not another one? Please try again with your event badge.",
        from,
        to: senderID || "",
      });
      return twimlRes.toString();
    }

    const badgeData = await getBadgeData(qrData);
    if (!badgeData) {
      await client.messages.create({
        body: "I could read your badge QR code but couldn't retrieve your details from the event system. Please ask a Twilio team member for help.",
        from,
        to: senderID || "",
      });
      return twimlRes.toString();
    }
    // --- WEAREDEVS_TEMP_END ---

    const [newProfileId, segmentData] = await Promise.all([
      createBadgeProfile(memoryClient, phone, badgeData),
      checkSegmentTraits(badgeData.email),
    ]);

    await attendeesMap.syncMapItems.create({
      ttl: ONE_WEEK,
      key: hashedSender,
      data: {
        name: `${badgeData.firstName} ${badgeData.lastName}`,
        email: badgeData.email,
        company: badgeData.company,
        jobTitle: badgeData.jobTitle,
        country: badgeData.country,
        recipient,
        sender: senderID,
        submittedBets: 0,
        stage: Stages.VERIFIED_USER,
        profileId: newProfileId,
        ...segmentData,
      },
    });

    const contentTemplate = await getTemplate("AskForBets", country?.languages[0]);
    await client.messages.create({
      body: `Thanks, ${badgeData.firstName}! Your registration is complete. 🎉`,
      from,
      to: senderID || "",
    });
    await sleep(1250);
    await client.messages.create({
      contentSid: contentTemplate.sid,
      from,
      to: senderID || "",
    });
    return twimlRes.toString();
  }

  // No photo, not registered
  await client.messages.create({
    body: "Hi! I don't recognize you yet. Please send a photo of your badge QR code to get started.\n\n_Note: Twilio will only use your data for activations at this booth and communication outreach._",
    from,
    to: senderID || "",
  });
  return twimlRes.toString();
}
