import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { capitalizeEachWord, generateResponse } from "./helper";
import { createHash } from "crypto";
import { Player } from "../../types";
import { SyncMapContext } from "twilio/lib/rest/sync/v1/service/syncMap";
import { DocumentInstance } from "twilio/lib/rest/sync/v1/service/document";

const en = require("../../../locale/en.json");
const de = require("../../../locale/de.json");

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  SYNC_SERVICE_SID = "",
  NEXT_PUBLIC_WEDGES = "",
  DISABLE_LEAD_COLLECTION = "false",
} = process.env;

const wedges = NEXT_PUBLIC_WEDGES.split(",");

async function getUser(attendeesMap: SyncMapContext, hashedSender: string) {
  let currentUser: Player | undefined;
  try {
    const syncItem = await attendeesMap.syncMapItems(hashedSender).fetch();
    currentUser = syncItem.data as UserData;
  } catch (e: any) {
    if (e.status !== 404) {
      throw e;
    }
  }
  return currentUser;
}

async function addDemoBet(betsDoc: DocumentInstance, messageContent: string) {
  if (process.env.demoBet) {
    const bets = betsDoc.data.bets || [];

    bets.push([
      "test-better",
      wedges.find((wedge) =>
        capitalizeEachWord(messageContent).includes(wedge)
      ),
      "test-better",
    ]);

    await betsDoc.update({
      data: {
        bets,
        blocked: false,
        full: false,
      },
    });
  }
}

export async function GET() {
  const response = new NextResponse(
    "Configure this endpoint to respond to incoming messages."
  );
  return response;
}

export async function POST(req: NextRequest) {
  const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
    accountSid: TWILIO_ACCOUNT_SID,
  });
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const [betsDoc, attendeesMap, formData] = await Promise.all([
    await syncService.documents()("bets").fetch(),
    await syncService.syncMaps()("attendees"),
    await req.formData(),
  ]);

  const senderID = formData.get("From") as string;

  const hashedSender = createHash("sha256").update(senderID).digest("hex");
  const messageContent = formData.get("Body") as string;

  const currentUser = await getUser(attendeesMap, hashedSender);

  process.env.demoBet && (await addDemoBet(betsDoc, messageContent));

  const response = await generateResponse(currentUser, client, {
    senderName: formData.get("ProfileName") as string,
    senderID,
    messageContent,
    attendeesMap,
    betsDoc,
  });
  const res = new NextResponse(response);
  res.headers.set("Content-Type", "text/xml");
  return res;
}
