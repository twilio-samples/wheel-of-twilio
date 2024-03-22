import { NextRequest, NextResponse } from "next/server";
import twilio, { twiml } from "twilio";

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
} = process.env;

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
    accountSid: TWILIO_ACCOUNT_SID,
  });
  const syncService = await client.sync.v1.services("default").fetch();
  const doc = await syncService.documents()("wheel_entries").fetch();

  const twimlRes = new twiml.MessagingResponse();

  if (doc.data.blocked) {
    twimlRes.message(`Sorry, the game is blocked.`);
  } else if (
    !["1", "2", "3", "4", "5", "6"].includes(formData.get("Body") as string)
  ) {
    twimlRes.message(
      `Sorry, this is not a valid bet. Please bet on 1, 2, 3 or 4.`
    );
  } else {
    const bets = doc.data.bets || {};

    bets[formData.get("From") as string] = {
      name: formData.get("ProfileName"),
      sender: formData.get("From"),
      bet: formData.get("Body"),
    };
    doc.update({
      data: {
        bets,
        blocked: false,
      },
    });

    twimlRes.message(
      `Hi ${formData.get(
        "ProfileName"
      )}\nWe received your bet on ${formData.get("Body")}`
    );
  }

  const res = new NextResponse(twimlRes.toString());
  res.headers.set("Content-Type", "text/xml");
  return res;
}
