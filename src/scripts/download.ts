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
  const mapItems = await client.sync.v1
    .services(SYNC_SERVICE_SID)
    .syncMaps("attendees")
    .syncMapItems.list({ limit: 1000 });
  const attendees = mapItems.map((item) => item.data);
  const csv = attendees.map((attendee) => {
    return `${attendee.name},${attendee.country},${attendee.email},${attendee.event},${attendee.stage}`;
  });
  writeFileSync(
    "attendees.csv",
    `Name,Country,Email,Event,Stage\n${csv.join("\n")}`,
  );
})();
