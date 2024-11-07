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
  const attendeesMap = await client.sync.v1
    .services(SYNC_SERVICE_SID)
    .syncMaps("attendees");

  let res: any = await attendeesMap.syncMapItems.page({
    pageSize: 1000,
  });

  const mapItems = [...res.instances];
  while (res.nextPageUrl) {
    res = await res.nextPage();
    mapItems.push(...res.instances);
  }

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

  await sendRaffleWinnerMessage(
    winner.data.fullName,
    winner.data.sender,
    winner.data.recipient,
  );

  await callWinner(
    winner.data.fullName,
    winner.data.sender.replace("whatsapp:", ""),
    winner.data.recipient.replace("whatsapp:", ""),
    true,
  );

  console.log("Found winner and called them");
})();
