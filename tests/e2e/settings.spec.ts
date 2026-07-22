import { test, expect } from "@playwright/test";
const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD } = process.env;

// Read-only: these tests must never click "Save changes" or "Reset to
// environment defaults" — that would persist to the real Sync "settings"
// document and could make other specs (e.g. home.spec.ts, which asserts the
// wheel against NEXT_PUBLIC_WEDGES directly) flaky or wrong.

test("See settings page pre-filled from environment defaults", async ({
  page,
}) => {
  await page.goto(
    `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/settings`,
  );

  await expect(page.getByRole("heading", { name: "Event settings" })).toBeVisible();

  const wedges = (process.env.NEXT_PUBLIC_WEDGES || "")
    .split(",")
    .map((w) => w.trim())
    .filter((w) => w !== "");

  await expect(page.getByText(`Wedges · ${wedges.length} configured`)).toBeVisible();
  await expect(page.getByText("8 wedges recommended for a balanced wheel.")).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset to environment defaults" }),
  ).toBeVisible();
});

test("Don't see the settings page as unauthenticated user", async ({ page }) => {
  const response = await page.goto("http://localhost:3000/settings");

  if (!response) {
    throw new Error("No response");
  }

  await expect(response.status()).toBe(401);
});
