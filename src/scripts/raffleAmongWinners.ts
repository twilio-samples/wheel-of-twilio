import twilio from "twilio";
import { callWinner, sendRaffleWinnerMessage } from "@/app/twilio";
import { Stages } from "../app/types";

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  SYNC_SERVICE_SID = "",
} = process.env;

const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

(async () => {
  const mapItems = await client.sync.v1
    .services(SYNC_SERVICE_SID)
    .syncMaps("attendees")
    .syncMapItems.list({ limit: 1000 });
  const potentialWinners = mapItems.filter(
    (attendee) =>
      attendee.data.stage === Stages.WINNER_UNCLAIMED ||
      attendee.data.stage === Stages.WINNER_CLAIMED,
  );

  if (potentialWinners.length === 0) {
    console.log("No potential winners found because no one has won yet.");
    return;
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

  await sendRaffleWinnerMessage(winner.data.name, winner.data.sender);

  await callWinner(
    winner.data.name,
    winner.data.sender.replace("whatsapp:", ""),
    true,
  );

  console.log("Found winner and called them");
})();
