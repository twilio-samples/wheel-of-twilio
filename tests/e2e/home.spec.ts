import { test, expect } from "@playwright/test";

test("See default page", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await expect(page.getByRole("button", { name: "Reset Bets" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset Bets" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spin" })).toBeVisible();

  const wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");

  for (const wedge of wedges) {
    await expect(
      page.locator("div").filter({ hasText: new RegExp(`^${wedge}$`) }),
    ).toBeVisible();
  }

  const munichWedge = page.locator("div").filter({ hasText: /^Munich$/ });
  await expect(munichWedge.getByTitle("test-better")).toBeVisible();
});
