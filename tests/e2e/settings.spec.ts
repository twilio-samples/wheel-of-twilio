import { test, expect } from "@playwright/test";
const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD } = process.env;

// Read-only: these tests must never click "Save changes" or "Reset to
// environment defaults" — that would persist to the real Sync "settings"
// document and could make other specs (e.g. home.spec.ts, which asserts the
// wheel against NEXT_PUBLIC_WEDGES directly) flaky or wrong.
//
// They also don't assert an exact wedge count tied to NEXT_PUBLIC_WEDGES.
// The Sync "settings" document is a real, persistent resource this suite
// doesn't own or reset — if anything was ever saved at /settings against
// the same Twilio account (e.g. during manual testing), that override
// outlives any single CI run and would make an exact-count assertion fail
// forever after, even though the page is rendering correctly. The merge
// precedence between env defaults and a saved override is already covered
// by tests/vitest/settings.test.ts against controlled inputs — this spec
// only needs to smoke-test that the real page renders with real data.

test("See settings page pre-filled with data", async ({ page }) => {
  await page.goto(
    `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/settings`,
  );

  await expect(page.getByRole("heading", { name: "Event settings" })).toBeVisible();
  await expect(page.getByText(/Wedges · \d+ configured/)).toBeVisible();
  await expect(page.getByText("8 wedges recommended for a balanced wheel.")).toBeVisible();

  const wedgesField = page.getByPlaceholder("San Francisco, London, Paris, ...");
  await expect(wedgesField).toBeVisible();
  await expect(wedgesField).not.toBeEmpty();

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
