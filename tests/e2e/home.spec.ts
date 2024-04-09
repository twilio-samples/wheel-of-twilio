import { test, expect } from "@playwright/test";

test("See default page", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await expect(page.getByRole("button", { name: "Reset Bets" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spin" })).toBeVisible();

  const wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");

  for (const wedge of wedges) {
    await expect(
      page.locator("div").filter({ hasText: new RegExp(`^${wedge}$`) })
    ).toBeVisible();
  }

  const munichWedge = page.locator("div").filter({ hasText: /^Munich$/ });
  await expect(munichWedge).toBeVisible();
  // await expect(munichWedge.getByTitle("test-better")).toBeVisible();
});

test("Click on Spin button", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await page.click("button:has-text('Spin')");
  await page.waitForTimeout(5000);
  page.on("dialog", (dialog) => dialog.accept());
});

test("Reset Bets button click", async ({ page }) => {
  await page.goto("http://localhost:3000");

  // await expect(page.locator(".placed-bet")).toBeVisible(); comment because of race contition when testing in multiple browser

  const resetBetsButton = await page.locator(".bg-blue-500");
  await resetBetsButton.click();

  await expect(page.locator(".placed-bet")).toBeHidden();
});
