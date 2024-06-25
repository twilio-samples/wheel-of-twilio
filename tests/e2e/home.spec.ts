import { test, expect } from "@playwright/test";
const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD } = process.env;

test.describe("Home page tests", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate using basic auth if required by the application
    await page.goto(`http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`);
  });

  test("See default page", async ({ page }) => {
    // Ensure the test waits for necessary elements to be visible before interacting with them
    await expect(page.locator("#spinButton")).toBeVisible();

    const wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");

    for (const wedge of wedges) {
      await expect(
        page.locator("div").filter({ hasText: new RegExp(`^${wedge}$`) }),
      ).toBeVisible();
    }
  });

  test("Remove all chips after spinning", async ({ page }) => {
    // Add error handling for failed navigation or element interaction
    try {
      await page.click("#spinButton");
      await page.waitForTimeout(5000);

      await expect(page.locator(".placed-bet")).toBeHidden();
    } catch (error) {
      console.error("Failed to navigate or interact with the element", error);
      throw error;
    }
  });
});
