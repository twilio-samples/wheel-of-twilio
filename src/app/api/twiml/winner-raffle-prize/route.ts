import { NextResponse } from "next/server";

export async function GET() {
  const twiml =
    '<Response><Say>Congratulations! You won the grand prize and can claim your prize at the Twilio booth!</Say></Response>';
  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
