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

function escapeCsv(value: unknown): string {
  const str = value == null ? "" : String(value);
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

(async () => {
  const attendeesMap = await client.sync.v1
    .services(SYNC_SERVICE_SID)
    .syncMaps("attendees");

  let res: any = await attendeesMap.syncMapItems.page({ pageSize: 1500 });
  const mapItems = [...res.instances];
  while (res.nextPageUrl) {
    res = await res.nextPage();
    mapItems.push(...res.instances);
  }

  const attendees = mapItems
    .map((item) => item.data)
    .filter(
      (a) =>
        a.stage !== "NEW_USER" &&
        a.stage !== "VERIFYING" &&
        a.stage !== "NAME_CONFIRMED",
    );

  const rows = attendees.map((a) => {
    // MANUAL mode stores fullName + email; QR mode stores name (first+last combined)
    const name = a.fullName ?? a.name ?? "";
    return [name, a.country, a.email, a.company, a.jobTitle, a.event, a.stage, a.submittedBets]
      .map(escapeCsv)
      .join(",");
  });

  writeFileSync(
    "attendees.csv",
    `Name,Country,Email,Company,JobTitle,Event,Stage,SubmittedBets\n${rows.join("\n")}`,
  );

  console.log(`Exported ${rows.length} attendees to attendees.csv`);
})();
