import { test, expect } from "@playwright/test";
const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD } = process.env;

test("See admin page", async ({ page }) => {
  await page.goto(
    `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/admin`,
  );

  await expect(page.getByPlaceholder("Search name...")).toBeVisible();
  await page.getByPlaceholder("Search sender...").click();
  await page.getByRole("columnheader", { name: "Name" }).click();
  await page.getByRole("columnheader", { name: "Sender" }).click();
  await page.getByRole("columnheader", { name: "Status" }).click();
  await expect(page.getByRole("button", { name: "Running" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Paused" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ended" })).toBeVisible();
});

test("Don't see the admin page as unauthenticated user", async ({ page }) => {
  const response = await page.goto("http://localhost:3000/admin");

  if (!response) {
    throw new Error("No response");
  }

  await expect(response.status()).toBe(401);
});
