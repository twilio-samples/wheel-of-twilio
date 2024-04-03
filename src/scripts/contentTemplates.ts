export function getCountyTemplates(): WhatsAppTemplateConfig[] {
  return [
    {
      friendly_name: "Ask For Country",
      language: "en",
      variables: {},
      types: {
        "twilio/quick-reply": {
          actions: [
            {
              id: "Germany",
              title: "Germany 🇩🇪",
            },
            {
              id: "Austria",
              title: "Austria 🇦🇹",
            },
            {
              id: "United Kingdom",
              title: "United Kingdom 🇬🇧",
            },
          ],
          body: "Your email address has been verified.  In which country are you based? \nYou can hit a button or reply with free form text.",
        },
      },
    },
    {
      friendly_name: "Frage nach Land",
      language: "de",
      variables: {},
      types: {
        "twilio/quick-reply": {
          actions: [
            {
              id: "Germany",
              title: "Deutschland 🇩🇪",
            },
            {
              id: "Austria",
              title: "Österreich 🇦🇹",
            },
            {
              id: "United Kingdom",
              title: "Großbritannien 🇬🇧",
            },
          ],
          body: "Deine E-Mail-Adresse wurde verifiziert. In welchem ​​Land sind Sie ansässig? \nSie können auf eine Schaltfläche klicken oder mit freiem Text antworten.",
        },
      },
    },
  ];
}

import "dotenv/config";
const { NEXT_PUBLIC_FIELD_NAMES = "" } = process.env;
const fields = NEXT_PUBLIC_FIELD_NAMES.split(",");

export function getOptionsTemplates(): WhatsAppTemplateConfig[] {
  return [
    {
      friendly_name: "Ask For Options",
      language: "en",
      variables: {},
      types: {
        "twilio/list-picker": {
          body: "Please select one of the following fields:",
          button: "Select",
          items: fields.map((field) => ({
            item: field,
            id: field,
            description: `Select ${field}`,
          })),
        },
      },
    },
    {
      friendly_name: "Frage nach Feld",
      language: "de",
      variables: {},
      types: {
        "twilio/list-picker": {
          body: "Auf welches der folgenden Felder möchten Sie setzen?",
          button: "Wählen",
          items: fields.map((field) => ({
            item: field,
            id: field,
            description: `Wähle ${field}`,
          })),
        },
      },
    },
  ];
}

export interface WhatsAppTemplateConfig {
  friendly_name: string;
  language: string;
  variables: Record<string, string>;
  types: {
    "twilio/quick-reply"?: {
      body: string;
      actions: Array<{
        id: string;
        title: string;
      }>;
    };
    "twilio/list-picker"?: {
      body: string;
      items: Array<{
        item: string;
        id: string;
        description: string;
      }>;
      button: string;
    };
    "twilio/text"?: {
      body: string;
    };
  };
  links?: {
    approval_fetch: string;
    approval_create: string;
  };
}

export interface WhatsAppTemplate extends WhatsAppTemplateConfig {
  date_updated: string;
  account_sid: string;
  url: string;
  sid: string;
  date_created: string;
  links: {
    approval_fetch: string;
    approval_create: string;
  };
}
