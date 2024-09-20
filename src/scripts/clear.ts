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
  const attendeesMap = await client.sync.v1
    .services(SYNC_SERVICE_SID)
    .syncMaps("attendees");

  let res: any = await attendeesMap.syncMapItems.page({
    pageSize: 500,
  });
  
  await Promise.all(
    res.instances.map(async (item: any) => {
      await client.sync.v1
      .services(SYNC_SERVICE_SID)
      .syncMaps("attendees")
      .syncMapItems(item.key)
      .remove();
    })
  );
  let counter = res.instances.length;

  while (res.nextPageUrl) {
    res = await res.nextPage();
    await Promise.all(
      res.instances.map(async (item: any) => {
        await client.sync.v1
          .services(SYNC_SERVICE_SID)
          .syncMaps("attendees")
          .syncMapItems(item.key)
          .remove();
      })
    );
    counter += res.instances.length;
  }

  console.log(`All ${counter} attendees removed`);

  const betsDoc = client.sync.v1.services(SYNC_SERVICE_SID).documents("bets");

  await betsDoc.update({
    data: {
      bets: [],
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
