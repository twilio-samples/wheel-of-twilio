import { NextResponse } from "next/server";

export async function GET() {
  const twiml =
    '<Response><Say>Congratulations! You bet on the right field and won. Stop by the Twilio booth to claim your prize!</Say></Response>';
  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
