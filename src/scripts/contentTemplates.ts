import "dotenv/config";
const { NEXT_PUBLIC_WEDGES = "" } = process.env;
const wedges = NEXT_PUBLIC_WEDGES.split(",");

export const TEMPLATE_PREFIX = "WheelOfTwilio";

function getOptionsTemplates(): WhatsAppTemplateConfig[] {
  return [
    {
      friendly_name: `${TEMPLATE_PREFIX}_AskForBets_en`,
      language: "en",
      variables: {},
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
        "twilio/text": {
          body: `Please select one of the following options:\n${wedges.map((wedge) => `- ${wedge}`).join("\n")}`,
        },
      },
    },
  ];
}

function getInvalidBetsTemplates(): WhatsAppTemplateConfig[] {
  return [
    {
      friendly_name: `${TEMPLATE_PREFIX}_InvalidBet_en`,
      language: "en",
      variables: {},
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
        "twilio/text": {
          body: `Sorry, this is not a valid bet. Please bet on one of the following options \n${wedges.map((wedge) => `- ${wedge}`).join("\n")}`,
        },
      },
    },
  ];
}

export function getTemplates(): WhatsAppTemplateConfig[] {
  return [...getOptionsTemplates(), ...getInvalidBetsTemplates()];
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
    "twilio/text": {
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
