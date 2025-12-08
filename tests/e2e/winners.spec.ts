import { test, expect } from "@playwright/test";
const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD } = process.env;

test("See winners page", async ({ page }) => {
  await page.goto(
    `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/winners`,
  );

  await expect(page.getByPlaceholder("Filter name...")).toBeVisible();
  await page.getByPlaceholder("Filter sender...").click();
  await page.getByRole('columnheader', { name: 'Name' }).click();
  await page.getByRole('columnheader', { name: 'Sender' }).click();
  await page.getByRole('columnheader', { name: 'State' }).click();
  await expect(page.locator("td")).toContainText("No results.");
});

test("Don't see the winners page as unauthenticated user", async ({ page }) => {
  const response = await page.goto("http://localhost:3000/winners");

  if (!response) {
    throw new Error("No response");
  }

  await expect(response.status()).toBe(401);
});
