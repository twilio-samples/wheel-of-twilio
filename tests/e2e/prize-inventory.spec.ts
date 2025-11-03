import { test, expect } from "@playwright/test";

const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD } = process.env;

test.describe("Prize Inventory System", () => {
  test("Prize inventory functionality when NEXT_PUBLIC_PRIZES_PER_FIELD is enabled", async ({ page }) => {
    // This test assumes NEXT_PUBLIC_PRIZES_PER_FIELD is set to a positive number
    const prizesPerField = process.env.NEXT_PUBLIC_PRIZES_PER_FIELD;
    
    if (!prizesPerField || parseInt(prizesPerField) <= 0) {
      test.skip();
      return;
    }

    await page.goto(
      `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`,
    );

    // Test 1: Verify initial prize display
    await test.step("Initial prize display", async () => {
      // Check prize counter display
      await expect(page.getByText(`Prizes per field: ${prizesPerField}`)).toBeVisible();
      
      // Check that all wedges show trophy icons with initial count
      const wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");
      for (const wedge of wedges) {
        await expect(page.locator("span").filter({ hasText: `🏆 ${prizesPerField}` })).toBeVisible();
      }
      
      // Verify no fields are marked as "NO PRIZES LEFT" initially
      await expect(page.getByText("NO PRIZES LEFT")).not.toBeVisible();
    });

    // Test 2: Verify reset button functionality
    await test.step("Reset button functionality", async () => {
      const resetButton = page.getByText("Reset Bets");
      await expect(resetButton).toBeVisible();
      
      // Click reset button (this should reset prize inventory)
      page.on('dialog', dialog => dialog.accept()); // Accept confirmation dialog
      await resetButton.click();
      
      // Verify prizes are reset to initial values
      await expect(page.locator("span").filter({ hasText: `🏆 ${prizesPerField}` })).toBeVisible();
    });

    // Test 3: Verify field styling differences
    await test.step("Field styling verification", async () => {
      const wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");
      
      // All fields should have normal styling initially
      for (const wedge of wedges) {
        const wedgeElement = page.locator("div").filter({ hasText: new RegExp(`^0${wedge}$`) });
        await expect(wedgeElement).toHaveClass(/ring-\[#FFF1F3\]/);
        await expect(wedgeElement).not.toHaveClass(/ring-gray-500/);
        await expect(wedgeElement).not.toHaveClass(/opacity-60/);
      }
    });
  });

  test("Prize inventory disabled when NEXT_PUBLIC_PRIZES_PER_FIELD is not set", async ({ page }) => {
    const prizesPerField = process.env.NEXT_PUBLIC_PRIZES_PER_FIELD;
    
    if (prizesPerField && parseInt(prizesPerField) > 0) {
      test.skip();
      return;
    }

    await page.goto(
      `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`,
    );

    // Verify prize tracking elements are not visible
    await expect(page.getByText(/Prizes per field:/)).not.toBeVisible();
    await expect(page.locator("span").filter({ hasText: "🏆" })).not.toBeVisible();
    await expect(page.getByText("NO PRIZES LEFT")).not.toBeVisible();
    
    // Reset button should still be visible for other purposes
    await expect(page.getByText("Reset Bets")).toBeVisible();
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
      await expect(firstTrophy).toHaveClass(/top-1/);
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
        page.locator("div").filter({ hasText: new RegExp(`^0${wedge}$`) }),
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
      await expect(page.getByText(`Prizes per field: ${prizesPerField}`)).toBeVisible();
      await expect(page.getByText("Reset Bets")).toBeVisible();
      await expect(page.locator("span").filter({ hasText: "🏆" }).first()).toBeVisible();
    });

    await test.step("Test portrait orientation", async () => {
      await page.setViewportSize({ width: 800, height: 1200 });
      await page.waitForTimeout(500);
      
      // Prize counter should still be visible
      await expect(page.getByText(`Prizes per field: ${prizesPerField}`)).toBeVisible();
      await expect(page.getByText("Reset Bets")).toBeVisible();
      await expect(page.locator("span").filter({ hasText: "🏆" }).first()).toBeVisible();
    });

    await test.step("Test mobile size", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Elements should still be accessible
      await expect(page.getByText("Reset Bets")).toBeVisible();
      // Prize counter might be smaller but should be present
      await expect(page.getByText(`Prizes per field: ${prizesPerField}`)).toBeVisible();
    });
  });
});