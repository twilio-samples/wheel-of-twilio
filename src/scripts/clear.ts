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

import { throttledQueue } from "throttled-queue";
const throttle = throttledQueue({
  maxPerInterval: 10,
  interval: 1000, // 1 second
  evenlySpaced: true,
  maxRetries: 3,
  maxRetriesWithPauses: 2,
}); // at most 10 requests per second.

(async () => {
  const attendeesMap = await client.sync.v1
    .services(SYNC_SERVICE_SID)
    .syncMaps("attendees");

  let res: any = await attendeesMap.syncMapItems.page({
    pageSize: 500,
  });

  res.instances.map(async (item: any) => {
    // Throttle the removal of each item
    throttle(async () => {
      console.log(`Removing attendee: ${item.key}`);
      return client.sync.v1
        .services(SYNC_SERVICE_SID)
        .syncMaps("attendees")
        .syncMapItems(item.key)
        .remove();
    });
  });
  await throttle;
  let counter = res.instances.length;

  while (res.nextPageUrl) {
    res = await res.nextPage();
    res.instances.map(async (item: any) => {
      // Throttle the removal of each item
      throttle(async () => {
        console.log(`Removing attendee: ${item.key}`);
        return client.sync.v1
          .services(SYNC_SERVICE_SID)
          .syncMaps("attendees")
          .syncMapItems(item.key)
          .remove();
      });
    });
    await throttle;
    counter += res.instances.length;
  }

  console.log(`All ${counter} attendees removed`);

  const betsDoc = client.sync.v1.services(SYNC_SERVICE_SID).documents("bets");

  await betsDoc.update({
    data: {
      bets: [],
      temporaryBlock: false,
      closed: false,
      full: false,
    },
  });

  console.log("Bets doc cleared");

  const completedBetsDoc = client.sync.v1
    .services(SYNC_SERVICE_SID)
    .documents("stats");

  await completedBetsDoc.update({
    data: {},
  });

  console.log("Completed bets doc cleared");
})();
