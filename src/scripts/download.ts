import twilio from "twilio";
import { writeFileSync } from "fs";

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
  //fetch all attendees and write to csv file with header columns
  const attendeesMap = await client.sync.v1
    .services(SYNC_SERVICE_SID)
    .syncMaps("attendees");

  let res: any = await attendeesMap.syncMapItems.page({
    pageSize: 1500,
  });

  const mapItems = [...res.instances];
  while (res.nextPageUrl) {
    res = await res.nextPage();
    mapItems.push(...res.instances);
  }

  const attendees = mapItems
    .map((item) => item.data)
    .filter((a) => a.stage !== "NEW_USER" && a.stage !== "VERIFYING");
  const csv = attendees.map((attendee) => {
    return `${attendee.name},${attendee.country},${attendee.email},${attendee.event},${attendee.stage},${attendee.submittedBets}`;
  });
  writeFileSync(
    "attendees.csv",
    `Name,Country,Email,Event,Stage,SubmittedBets\n${csv.join("\n")}`,
  );
})();
