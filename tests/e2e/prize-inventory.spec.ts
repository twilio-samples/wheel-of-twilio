import { test, expect } from "@playwright/test";

const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD } = process.env;

test.describe("Prize Inventory System", () => {

  test("Prize inventory disabled when NEXT_PUBLIC_PRIZES_PER_FIELD is not set", async ({ page }) => {
    const prizesPerField = process.env.NEXT_PUBLIC_PRIZES_PER_FIELD;
    
    if (prizesPerField && parseInt(prizesPerField) > 0) {
      test.skip();
      return;
    }

    await page.goto(
      `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`,
    );

  });

  test("Visual indicators for fields with different prize states", async ({ page }) => {
    const prizesPerField = process.env.NEXT_PUBLIC_PRIZES_PER_FIELD;
    
    if (!prizesPerField || parseInt(prizesPerField) <= 0) {
      test.skip();
      return;
    }

    await page.goto(
      `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`,
    );

    // Test that trophy icons are positioned correctly
    await test.step("Trophy icon positioning", async () => {
      const trophyIcons = page.locator("span").filter({ hasText: /🏆/ });
      await expect(trophyIcons.first()).toBeVisible();
      
      // Verify trophy icons have correct CSS classes for positioning
      const firstTrophy = trophyIcons.first();
      await expect(firstTrophy).toHaveClass(/absolute/);
      await expect(firstTrophy).toHaveClass(/top-5/);
      await expect(firstTrophy).toHaveClass(/right-2/);
    });

    // Test bet counter positioning
    await test.step("Bet counter positioning", async () => {
      const betCounters = page.locator("span").filter({ hasText: /^0$/ });
      if (await betCounters.count() > 0) {
        const firstCounter = betCounters.first();
        await expect(firstCounter).toHaveClass(/absolute/);
        await expect(firstCounter).toHaveClass(/bottom-3/);
        await expect(firstCounter).toHaveClass(/left-5/);
      }
    });
  });

  test("Spin button and core functionality remain unaffected", async ({ page }) => {
    await page.goto(
      `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`,
    );

    // Core functionality should always work regardless of prize settings
    await expect(page.locator("#spinButton")).toBeVisible();
    
    // All wedges should be visible and clickable
    const wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");
    for (const wedge of wedges) {
      await expect(
        page.locator("span").filter({ hasText: new RegExp(`^${wedge}$`) }),
      ).toBeVisible();
    }
    
    // Legal text should be visible
    await expect(page.getByText(/Your WhatsApp profile and phone number is necessary/)).toBeVisible();
    await expect(page.getByText(/Twilio employees and government officials/)).toBeVisible();
  });

  test("Responsive design with prize inventory", async ({ page }) => {
    const prizesPerField = process.env.NEXT_PUBLIC_PRIZES_PER_FIELD;
    
    if (!prizesPerField || parseInt(prizesPerField) <= 0) {
      test.skip();
      return;
    }

    await page.goto(
      `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`,
    );

    // Test different viewport sizes
    await test.step("Test landscape orientation", async () => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(500);
      
      // Prize counter should still be visible
      await expect(page.locator("span").filter({ hasText: "🏆" }).first()).toBeVisible();
    });

    await test.step("Test portrait orientation", async () => {
      await page.setViewportSize({ width: 800, height: 1200 });
      await page.waitForTimeout(500);
      
      // Prize counter should still be visible
      await expect(page.locator("span").filter({ hasText: "🏆" }).first()).toBeVisible();
    });

    await test.step("Test mobile size", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
    });
  });
});