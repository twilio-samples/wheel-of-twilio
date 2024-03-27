// This script checks the Twilio account for the necessary services and creates them if they don't exist.
// it's indempotent which means it can be run multiple times without causing any issues.

import twilio from "twilio";
import {
  WhatsAppTemplate,
  WhatsAppTemplateConfig,
  getCountyTemplate,
  getOptionsTemplate,
} from "./contentTemplates";
import axios from "axios";

enum Privilege {
  FRONTEND = "FRONTEND",
}

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  VERIFY_SERVICE_SID = "",
  SYNC_SERVICE_SID = "",
  MESSAGE_SERVICE_SID = "",
} = process.env;

const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

(async () => {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();

  await createSyncDocIfNotExists("bets");
  await createSyncMapIfNotExists("attendees");

  async function createSyncDocIfNotExists(uniqueName: string) {
    let syncDoc;
    try {
      syncDoc = syncService.documents()(uniqueName);
      await syncDoc.fetch(); // to force an error if the doc doesn't exist
    } catch (err) {
      await syncService.documents().create({
        uniqueName,
      });
      syncDoc = syncService.documents()(uniqueName);
    }

    await syncDoc.documentPermissions(Privilege.FRONTEND).update({
      read: true,
      write: false,
      manage: false,
    });
  }

  async function createSyncMapIfNotExists(uniqueName: string) {
    let syncMap;
    try {
      syncMap = syncService.syncMaps()(uniqueName);
      await syncMap.fetch(); // to force an error if the doc doesn't exist
    } catch (err) {
      await syncService.syncMaps().create({
        uniqueName,
      });
      syncMap = syncService.syncMaps()(uniqueName);
    }

    await syncMap.syncMapPermissions(Privilege.FRONTEND).update({
      read: false,
      write: false,
      manage: false,
    });
  }
})();

(async () => {
  // use axios because the twilio sdk doesn't support expose the mailer_sid property
  const { data } = await axios.get(
    `https://verify.twilio.com/v2/Services/${VERIFY_SERVICE_SID}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      auth: {
        username: TWILIO_API_KEY,
        password: TWILIO_API_SECRET,
      },
    }
  );
  if (!data.mailer_sid) {
    console.error(`Verify service ${data.sid} does not have a mailer active`);
    process.exit(1);
  }
  console.log(
    `Verify service ${data.sid} has been fetched and mailer is active ${data.mailer_sid}`
  );
})();

(async () => {
  const messagingService = await client.messaging.v1
    .services(MESSAGE_SERVICE_SID)
    .fetch();
  console.log(`Messaging service ${messagingService.sid} has been fetched`);

  const templates: WhatsAppTemplate[] = await getAllWhatsAppTemplates();
  const countyTemplate = getCountyTemplate();
  const optionsTemplate = getOptionsTemplate();
  let template = templates.find(
    (template) => template.friendly_name === countyTemplate.friendly_name
  );
  if (template) {
    console.log(`County template with SID ${template.sid} already exists`);
  } else {
    template = await createWhatsAppTemplate(countyTemplate);
    console.log(`County template with SID ${template.sid} has been created`);
  }
  template = templates.find(
    (template) => template.friendly_name === optionsTemplate.friendly_name
  );
  if (template) {
    console.log(`Options template with SID ${template.sid} already exists`);
  } else {
    template = await createWhatsAppTemplate(optionsTemplate);
    console.log(`Options template with SID ${template.sid} has been created`);
  }

  async function getAllWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
    const { data } = await axios.get("https://content.twilio.com/v1/Content", {
      headers: {
        "Content-Type": "application/json",
      },
      auth: {
        username: TWILIO_API_KEY,
        password: TWILIO_API_SECRET,
      },
    });

    return data.contents;
  }

  async function deleteWhatsAppTemplate(
    sid: string
  ): Promise<WhatsAppTemplate> {
    const { data } = await axios.delete(
      `https://content.twilio.com/v1/Content/${sid}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        auth: {
          username: TWILIO_API_KEY,
          password: TWILIO_API_SECRET,
        },
      }
    );
    return data;
  }

  async function createWhatsAppTemplate(
    template: WhatsAppTemplateConfig
  ): Promise<WhatsAppTemplate> {
    const { data } = await axios.post(
      "https://content.twilio.com/v1/Content",
      template,
      {
        headers: {
          "Content-Type": "application/json",
        },
        auth: {
          username: TWILIO_API_KEY,
          password: TWILIO_API_SECRET,
        },
      }
    );

    return data;
  }
})();
