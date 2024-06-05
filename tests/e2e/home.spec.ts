import { test, expect } from "@playwright/test";
const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD } = process.env;

test("See default page", async ({ page }) => {
  await page.goto(
    `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`
  );

  await expect(page.locator('#spinButton')).toBeVisible();

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

test("Remove all chips after spinning", async ({ page }) => {
  await page.goto(
    `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`
  );
  await page.click("#spinButton");
  await page.waitForTimeout(5000);

  await expect(page.locator(".placed-bet")).toBeHidden();
});
