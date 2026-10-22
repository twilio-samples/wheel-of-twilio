export const TEMPLATE_PREFIX = "WheelOfTwilio";

function getOptionsTemplates(wedges: string[]): WhatsAppTemplateConfig[] {
  return [
    {
      friendly_name: `${TEMPLATE_PREFIX}_AskForBets_en`,
      language: "en",
      variables: {},
      types: {
        "twilio/list-picker": {
          body: `Cast your bet on where our wheel will land:\n`,
          button: "Select",
          items: wedges.map((wedge) => ({
            item: wedge,
            id: wedge,
            description: `Bet on ${wedge}`,
          })),
        },
        "twilio/text": {
          body: `Cast your bet on where our wheel will land:\n${wedges.map((wedge) => `- ${wedge}`).join("\n")}`,
        },
      },
    },
  ];
}

function getInvalidBetsTemplates(wedges: string[]): WhatsAppTemplateConfig[] {
  return [
    {
      friendly_name: `${TEMPLATE_PREFIX}_InvalidBet_en`,
      language: "en",
      variables: {},
      types: {
        "twilio/list-picker": {
          body: `Sorry, that's not a valid bet. Cast your bet on where our wheel will land:\n`,
          button: "Bet",
          items: wedges.map((wedge) => ({
            item: wedge,
            id: wedge,
            description: `Bet on ${wedge}`,
          })),
        },
        "twilio/text": {
          body: `Sorry, that's not a valid bet. Cast your bet on where our wheel will land:\n${wedges.map((wedge) => `- ${wedge}`).join("\n")}`,
        },
      },
    },
  ];
}

export function getTemplates(wedges: string[]): WhatsAppTemplateConfig[] {
  return [...getOptionsTemplates(wedges), ...getInvalidBetsTemplates(wedges)];
}

// Content templates are immutable snapshots of the wedge list they were built
// from, so they go stale whenever the wedges change (e.g. via /settings).
export function templateMatchesWedges(
  template: Pick<WhatsAppTemplateConfig, "types">,
  wedges: string[],
): boolean {
  const items =
    template.types?.["twilio/list-picker"]?.items?.map((i) => i.item) ?? [];
  return (
    items.length === wedges.length &&
    items.every((item, i) => item === wedges[i])
  );
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
