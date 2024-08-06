import twilio from "twilio";

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

  await Promise.all(
    mapItems.map(async (item) => {
      await client.sync.v1
        .services(SYNC_SERVICE_SID)
        .syncMaps("attendees")
        .syncMapItems(item.key)
        .remove();
    }),
  );

  console.log(`All ${mapItems.length} attendees removed`);

  const betsDoc = client.sync.v1.services(SYNC_SERVICE_SID).documents("bets");

  await betsDoc.update({
    data: {
      bets: {},
      blocked: false,
      full: false,
    },
  });

  console.log("Bets doc cleared");

  const completedBetsDoc = client.sync.v1
    .services(SYNC_SERVICE_SID)
    .documents("completedBets");

  await completedBetsDoc.update({
    data: {},
  });

  console.log("Completed bets doc cleared");
})();
