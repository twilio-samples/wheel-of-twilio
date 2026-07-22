import { test, expect } from "@playwright/test";
const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD } = process.env;

test("See admin page", async ({ page }) => {
  await page.goto(
    `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/admin`,
  );

  await expect(page.getByPlaceholder("Search name...")).toBeVisible();
  await page.getByPlaceholder("Search sender...").click();

  // The winners table only renders once there's at least one tracked prize;
  // otherwise the empty state copy shows instead. Either is a valid render.
  await expect(
    page
      .getByRole("columnheader", { name: "Name" })
      .or(page.getByText("No winners match yet.")),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Show all winners" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "Running" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Paused" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Ended" })).toBeVisible();
});

test("Don't see the admin page as unauthenticated user", async ({ page }) => {
  const response = await page.goto("http://localhost:3000/admin");

  if (!response) {
    throw new Error("No response");
  }

  await expect(response.status()).toBe(401);
});
