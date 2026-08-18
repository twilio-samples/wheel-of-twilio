import twilio from "twilio";
import { deleteMemoryProfile } from "../app/api/incoming/memory";

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  SYNC_SERVICE_SID = "",
  TWILIO_MEMORY_STORE_ID = "",
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
  let tacConfig: import("twilio-agent-connect").TACConfig | undefined;
  if (TWILIO_MEMORY_STORE_ID) {
    try {
      const { TACConfig } = await import("twilio-agent-connect");
      tacConfig = TACConfig.fromEnv();
    } catch (e: any) {
      console.warn(
        `Skipping Memory Store cleanup — TAC config unavailable: ${e.message}`,
      );
    }
  }

  async function removeAttendee(item: any) {
    const profileId = item.data?.profileId;
    if (profileId && tacConfig) {
      try {
        console.log(`Removing memory profile: ${profileId}`);
        await deleteMemoryProfile(tacConfig, TWILIO_MEMORY_STORE_ID, profileId);
      } catch (e: any) {
        console.error(
          `Failed to remove memory profile ${profileId} for attendee ${item.key}: ${e.message}`,
        );
      }
    }

    console.log(`Removing attendee: ${item.key}`);
    return client.sync.v1
      .services(SYNC_SERVICE_SID)
      .syncMaps("attendees")
      .syncMapItems(item.key)
      .remove();
  }

  const attendeesMap = await client.sync.v1
    .services(SYNC_SERVICE_SID)
    .syncMaps("attendees");

  let res: any = await attendeesMap.syncMapItems.page({
    pageSize: 500,
  });

  res.instances.map((item: any) => {
    // Throttle the removal of each item
    throttle(() => removeAttendee(item));
  });
  await throttle;
  let counter = res.instances.length;

  while (res.nextPageUrl) {
    res = await res.nextPage();
    res.instances.map((item: any) => {
      // Throttle the removal of each item
      throttle(() => removeAttendee(item));
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
