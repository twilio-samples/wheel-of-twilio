import { FullConfig } from "@playwright/test";
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
    },
  );
}

async function globalSetup(config: FullConfig) {
  // Updated baseURL to match the application's URL structure
  const baseURL = config.projects[0].use.baseURL || "http://localhost:3000";

  // Added missing setup steps necessary for the tests to run successfully
  const response = await placeBet(baseURL);
  console.assert(response.status === 200, `Expected status 200, got ${response.status}`);
}

export default globalSetup;
