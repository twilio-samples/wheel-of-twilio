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

  // Initialize prize wins tracking if NEXT_PUBLIC_PRIZES_PER_FIELD is set
  const { NEXT_PUBLIC_WEDGES, NEXT_PUBLIC_PRIZES_PER_FIELD } = process.env;
  const prizesPerField = parseInt(NEXT_PUBLIC_PRIZES_PER_FIELD || "0");
  
  let prizeWins: Record<string, number> = {};
  if (prizesPerField > 0) {
    const wedges = (NEXT_PUBLIC_WEDGES || "").split(",");
    wedges.forEach(wedge => {
      prizeWins[wedge] = 0;
    });
    console.log(`Prize wins tracking reset to 0 wins per field (max ${prizesPerField} prizes per field)`);
  }

  await betsDoc.update({
    data: {
      bets: [],
      temporaryBlock: false,
      closed: false,
      full: false,
      prizeWins,
    },
  });

  console.log("Bets doc cleared and prize wins tracking reset");

  const completedBetsDoc = client.sync.v1
    .services(SYNC_SERVICE_SID)
    .documents("stats");

  await completedBetsDoc.update({
    data: {},
  });

  console.log("Completed bets doc cleared");
})();
