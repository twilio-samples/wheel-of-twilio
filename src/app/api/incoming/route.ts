import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { capitalizeEachWord, getUserRemovedResponse } from "./helper";
import { handleProfileMode } from "./profile-mode";
import { handleQrMode } from "./qr-mode";
import { deleteMemoryProfile } from "./memory";
import { createHash } from "crypto";
import { Player, Settings } from "../../types";
import { SyncMapContext } from "twilio/lib/rest/sync/v1/service/syncMap";
import { DocumentInstance } from "twilio/lib/rest/sync/v1/service/document";
import { getSettings } from "../../settings";

export const maxDuration = 30;

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  SYNC_SERVICE_SID = "",
} = process.env;

async function getUser(attendeesMap: SyncMapContext, hashedSender: string) {
  let currentUser: Player | undefined;
  try {
    const syncItem = await attendeesMap.syncMapItems(hashedSender).fetch();
    currentUser = syncItem.data as Player;
  } catch (e: any) {
    if (e.status !== 404) throw e;
  }
  return currentUser;
}

async function addDemoBet(
  betsDoc: DocumentInstance,
  messageContent: string,
  wedges: string[],
) {
  if (process.env.demoBet) {
    const bets = betsDoc.data.bets || [];
    bets.push([
      "test-better",
      wedges.find((wedge) => capitalizeEachWord(messageContent).includes(wedge)),
      "test-better",
    ]);
    await betsDoc.update({
      data: { bets, temporaryBlock: false, closed: false, full: false },
    });
  }
}

export async function GET() {
  return new NextResponse("Configure this endpoint to respond to incoming messages.");
}

export async function POST(req: NextRequest) {
  // Read at request time so settings changes take effect without a restart
  const settings: Settings = await getSettings();
  const LEAD_COLLECTION = settings.leadCollection;

  const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, { accountSid: TWILIO_ACCOUNT_SID });
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const [betsDoc, attendeesMap, formData] = await Promise.all([
    syncService.documents()("bets").fetch(),
    syncService.syncMaps()("attendees"),
    req.formData(),
  ]);

  const senderID = formData.get("From") as string;
  const recipient = formData.get("To") as string;
  const messageContent = formData.get("Body") as string;
  const numMedia = parseInt((formData.get("NumMedia") as string) ?? "0", 10);
  const mediaUrl = formData.get("MediaUrl0") as string | null;

  const hashedSender = createHash("sha256").update(senderID).digest("hex");
  const currentUser = await getUser(attendeesMap, hashedSender);

  process.env.demoBet && (await addDemoBet(betsDoc, messageContent, settings.wedges));

  let response = "";

  if (messageContent.toLowerCase().includes("forget me")) {
    if (currentUser) {
      await attendeesMap.syncMapItems(hashedSender).remove();
      if (LEAD_COLLECTION === "QR" && currentUser.profileId) {
        const { TACConfig } = await import("twilio-agent-connect");
        const config = TACConfig.fromEnv();
        const memoryStoreId = process.env.TWILIO_MEMORY_STORE_ID ?? "";
        await deleteMemoryProfile(config, memoryStoreId, currentUser.profileId);
      }
    }
    response = await getUserRemovedResponse(currentUser?.sender || senderID || "");
  } else if (LEAD_COLLECTION === "QR") {
    const { TAC, TACConfig } = await import("twilio-agent-connect");
    const config = TACConfig.fromEnv();
    const memoryClient = (await TAC.create({ config })).getMemoryClient();
    if (!memoryClient) {
      throw new Error(
        "MemoryClient unavailable — ensure TWILIO_CONVERSATION_CONFIGURATION_ID and TWILIO_MEMORY_STORE_ID are set",
      );
    }
    response = await handleQrMode(currentUser, memoryClient, client, {
      senderName: formData.get("ProfileName") as string,
      senderID,
      recipient,
      messageContent,
      attendeesMap,
      betsDoc,
      numMedia,
      mediaUrl: mediaUrl ?? undefined,
      settings,
    });
  } else {
    // LEAD_COLLECTION === "MANUAL" or "NONE"
    response = await handleProfileMode(currentUser, client, {
      senderName: formData.get("ProfileName") as string,
      senderID,
      recipient,
      messageContent,
      attendeesMap,
      betsDoc,
      leadCollection: LEAD_COLLECTION,
      settings,
    });
  }

  const res = new NextResponse(response);
  res.headers.set("Content-Type", "text/xml");
  return res;
}
