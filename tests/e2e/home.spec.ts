import { test, expect } from "@playwright/test";
const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD } = process.env;

test("See default page", async ({ page }) => {
  await page.goto(
    `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`,
  );

  await expect(page.locator("#spinButton")).toBeVisible();

  const wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");

  for (const wedge of wedges) {
    await expect(
      page.locator("div").filter({ hasText: new RegExp(`^0${wedge}$`) }),
    ).toBeVisible();
  }
});

test("Remove all chips after spinning", async ({ page }) => {
  await page.goto(
    `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`,
  );
  await page.click("#spinButton");
  await page.waitForTimeout(5000);

  await expect(page.locator(".placed-bet")).toBeHidden();
});

test("Don't see the home page as unauthenticated user", async ({ page }) => {
  const response = await page.goto("http://localhost:3000/");

  if (!response) {
    throw new Error("No response");
  }

  await expect(response.status()).toBe(401);
});

test("QR code visibility based on HIDE_QR_CODE environment variable", async ({ page }) => {
  await page.goto(
    `http://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@localhost:3000/`,
  );

  const hideQrCode = process.env.NEXT_PUBLIC_HIDE_QR_CODE === "true";

  if (hideQrCode) {
    // When QR code is hidden, these elements should not be visible
    await expect(page.getByText("Scan the code and win prizes")).not.toBeVisible();
    await expect(page.getByText(/Please note that by scanning the QR code/)).not.toBeVisible();
    
    const phoneNumber = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER;
    if (phoneNumber) {
      await expect(page.getByText(phoneNumber)).not.toBeVisible();
    }
  } else {
    // When QR code is visible, these elements should be present
    // Check for QR code by looking for the react-qr-code component's SVG
    await expect(page.locator("svg").first()).toBeVisible();
    await expect(page.getByText("Scan the code and win prizes")).toBeVisible();
    await expect(page.getByText(/Please note that by scanning the QR code/)).toBeVisible();
    
    const phoneNumber = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER;
    if (phoneNumber) {
      await expect(page.getByText(phoneNumber)).toBeVisible();
    }
  }

  // Core functionality should always work regardless of QR code setting
  await expect(page.locator("#spinButton")).toBeVisible();
  await expect(page.getByText(/Your WhatsApp profile and phone number is necessary/)).toBeVisible();
  await expect(page.getByText(/Twilio employees and government officials/)).toBeVisible();
});

test("Prize inventory display when NEXT_PUBLIC_PRIZES_PER_FIELD is set", async ({ page }) => {
  await page.goto("/");

  // Check if prizes per field is configured
  const prizesPerField = process.env.NEXT_PUBLIC_PRIZES_PER_FIELD;
  
  if (prizesPerField && parseInt(prizesPerField) > 0) {
    // Check if prize counter is visible
    await expect(page.getByText(`Prizes per field: ${prizesPerField}`)).toBeVisible();
    
    // Check if wedges show prize counts (trophy emoji should be visible)
    await expect(page.locator("span").filter({ hasText: "🏆" }).first()).toBeVisible();
    
    // Check if reset button is visible for admins
    await expect(page.getByText("Reset Bets")).toBeVisible();
    
    // Verify that wedges show the correct initial prize count
    const wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");
    for (const wedge of wedges) {
      await expect(page.locator("span").filter({ hasText: `🏆 ${prizesPerField}` })).toBeVisible();
    }
  } else {
    // When prizes per field is not set, no prize indicators should show
    await expect(page.getByText(/Prizes per field:/)).not.toBeVisible();
    await expect(page.locator("span").filter({ hasText: "🏆" })).not.toBeVisible();
  }

  // Verify core functionality still works
  await expect(page.locator("#spinButton")).toBeVisible();
  
  const wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");
  for (const wedge of wedges) {
    await expect(
      page.locator("div").filter({ hasText: new RegExp(`^0${wedge}$`) }),
    ).toBeVisible();
  }
});
