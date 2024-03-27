export function getCountyTemplate(): WhatsAppTemplateConfig {
  return {
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
  };
}

export function getOptionsTemplate(): WhatsAppTemplateConfig {
  return {
    friendly_name: "Ask For Options",
    language: "en",
    variables: {},
    types: {
      "twilio/list-picker": {
        body: "Please select one of the following fields:",
        button: "Select",
        items: [
          {
            id: "1",
            item: "Field 1",
            description: "",
          },
          {
            id: "2",
            item: "Field 2",
            description: "",
          },
          {
            id: "3",
            item: "Field 3",
            description: "",
          },
          {
            id: "4",
            item: "Field 4",
            description: "",
          },
          {
            id: "5",
            item: "Field 5",
            description: "",
          },
          {
            id: "6",
            item: "Field 6",
            description: "",
          },
        ],
      },
    },
  };
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
