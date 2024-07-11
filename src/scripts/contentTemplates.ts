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
    {
      friendly_name: "Preguntar por País",
      language: "es",
      variables: {},
      translationKey: "countryTemplateSID",
      types: {
        "twilio/quick-reply": {
          actions: [
            {
              id: "Germany",
              title: "Alemania 🇩🇪",
            },
            {
              id: "Austria",
              title: "Austria 🇦🇹",
            },
            {
              id: "United Kingdom",
              title: "Reino Unido 🇬🇧",
            },
          ],
          body: "Tu dirección de correo electrónico ha sido verificada. ¿En qué país te encuentras?\nPuedes usar una respuesta rápida o un texto libre.",
        },
      },
    },
    {
      friendly_name: "Demander le Pays",
      language: "fr",
      variables: {},
      translationKey: "countryTemplateSID",
      types: {
        "twilio/quick-reply": {
          actions: [
            {
              id: "Germany",
              title: "Allemagne 🇩🇪",
            },
            {
              id: "Austria",
              title: "Autriche 🇦🇹",
            },
            {
              id: "United Kingdom",
              title: "Royaume-Uni 🇬🇧",
            },
          ],
          body: "Votre adresse e-mail a été vérifiée. Dans quel pays êtes-vous basé(e) ?\nVous pouvez choisir une réponse rapide ou utiliser un texte libre.",
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
    {
      friendly_name: "Pedir Apuestas",
      language: "es",
      variables: {},
      translationKey: "betTemplateSID",
      types: {
        "twilio/list-picker": {
          body: "Por favor, selecciona una de las siguientes opciones:\n",
          button: "Seleccionar",
          items: wedges.map((wedge) => ({
            item: wedge,
            id: wedge,
            description: `Seleccionar ${wedge}`,
          })),
        },
      },
    },
    {
      friendly_name: "Demander les Paris",
      language: "fr",
      variables: {},
      translationKey: "betTemplateSID",
      types: {
        "twilio/list-picker": {
          body: "Veuillez sélectionner l'une des options suivantes:\n",
          button: "Sélectionner",
          items: wedges.map((wedge) => ({
            item: wedge,
            id: wedge,
            description: `Sélectionner ${wedge}`,
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
    {
      friendly_name: "Apuesta No Válida",
      language: "es",
      variables: {},
      translationKey: "invalidBetTemplateSID",
      types: {
        "twilio/list-picker": {
          body: "Lo siento, esta no es una apuesta válida. Por favor, apuesta por una de las siguientes opciones \n",
          button: "Apostar",
          items: wedges.map((wedge) => ({
            item: wedge,
            id: wedge,
            description: `Seleccionar ${wedge}`,
          })),
        },
      },
    },
    {
      friendly_name: "Pari Non Valide",
      language: "fr",
      variables: {},
      translationKey: "invalidBetTemplateSID",
      types: {
        "twilio/list-picker": {
          body: "Désolé, ce n'est pas un pari valide. Veuillez parier sur l'une des options suivantes \n",
          button: "Parier",
          items: wedges.map((wedge) => ({
            item: wedge,
            id: wedge,
            description: `Sélectionner ${wedge}`,
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
