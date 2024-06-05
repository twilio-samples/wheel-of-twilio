import { expect, type FullConfig } from "@playwright/test";
import Axios from "axios";

async function placeBet(baseURL: string) {
  return Axios.post(
    `${baseURL}/api/incoming`,
    {
      Body: "Munich",
      From: "whatsapp:+4915112341234",
    },
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
}

async function globalSetup(config: FullConfig) {
  const baseURL = config?.webServer?.url || "http://localhost:3000";

  const response = await placeBet(baseURL);
  expect(response.status).toBe(200);
}

export default globalSetup;
