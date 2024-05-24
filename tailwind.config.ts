import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: ["bg-red-500", "bg-green-500", "#F22F46", "#FDF7F4"],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        "twilio-red": "#F22F46",
        "twilio-ink": "#121C2D",
        "twilio-paper": "#FDF7F4",
        "twilio-mint": "#6ADDB2",
        "twilio-sky": "#51A9E3",
        "twilio-saffron": "#F2BE5A",
        "twilio-sun": "#FF7A00",
      },
    },
  },
  plugins: [],
};
export default config;
