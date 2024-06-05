function getCountyTemplates(): WhatsAppTemplateConfig[] {
  return [
    {
      friendly_name: "Ask For Country",
      language: "en",
      variables: {},
      translationKey: "countryTemplateSID",
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
          body: "Your email address has been verified. In which country are you based? \nYou can hit a quick reply or use free form text.",
        },
      },
    },
    {
      friendly_name: "Frage nach Land",
      language: "de",
      variables: {},
      translationKey: "countryTemplateSID",
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
          body: "Deine E-Mail-Adresse wurde verifiziert. In welchem Land sind Sie ansässig? \nWählen Sie eine der Auswahlmöglichkeiten oder antworten Sie mit Freitext.",
        },
      },
    },
  ];
}

import "dotenv/config";
const { NEXT_PUBLIC_WEDGES = "" } = process.env;
const wedges = NEXT_PUBLIC_WEDGES.split(",");

function getOptionsTemplates(): WhatsAppTemplateConfig[] {
  return [
    {
      friendly_name: "Ask For Bets",
      language: "en",
      variables: {},
      translationKey: "betTemplateSID",
      types: {
        "twilio/list-picker": {
          body: `Please select one of the following options:\n`,
          button: "Select",
          items: wedges.map((wedge) => ({
            item: wedge,
            id: wedge,
            description: `Select ${wedge}`,
          })),
        },
      },
    },
    {
      friendly_name: "Frage nach Feld",
      language: "de",
      variables: {},
      translationKey: "betTemplateSID",
      types: {
        "twilio/list-picker": {
          body: `Auf welches Feld möchten Sie setzen?\n`,
          button: "Wählen",
          items: wedges.map((wedge) => ({
            item: wedge,
            id: wedge,
            description: `Wähle ${wedge}`,
          })),
        },
      },
    },
  ];
}

function getInvalidBetsTemplates(): WhatsAppTemplateConfig[] {
  return [
    {
      friendly_name: "Invalid Bet",
      language: "en",
      variables: {},
      translationKey: "invalidBetTemplateSID",
      types: {
        "twilio/list-picker": {
          body: `Sorry, this is not a valid bet. Please bet on one of the following options \n`,
          button: "Bet",
          items: wedges.map((wedge) => ({
            item: wedge,
            id: wedge,
            description: `Select ${wedge}`,
          })),
        },
      },
    },
    {
      friendly_name: "Ungültige Wette",
      language: "de",
      variables: {},
      translationKey: "invalidBetTemplateSID",
      types: {
        "twilio/list-picker": {
          body: `Entschuldigung, dies ist keine gültige Wette. Bitte setzen Sie auf eines der folgenden Felder  \n`,
          button: "Wählen",
          items: wedges.map((wedge) => ({
            item: wedge,
            id: wedge,
            description: `Wähle ${wedge}`,
          })),
        },
      },
    },
  ];
}

export function getTemplates(): WhatsAppTemplateConfig[] {
  return [
    ...getCountyTemplates(),
    ...getOptionsTemplates(),
    ...getInvalidBetsTemplates(),
  ];
}

export interface WhatsAppTemplateConfig {
  friendly_name: string;
  language: string;
  translationKey: string;
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
