import { expect, test, describe, vi, afterEach } from "vitest";

// Mock twilio.ts before any imports that pull it in, to prevent jwa/AccessToken
// from crashing in jsdom (Buffer not available at module evaluation time) —
// same guard responses.test.tsx uses.
vi.mock("@/app/twilio", () => ({
  getTemplate: async () => ({ sid: "HXmock" }),
  getAllTemplates: async () => [],
}));

import { settingsFromEnv, mergeSettings } from "@/app/settings-defaults";
import { handleProfileMode } from "@/app/api/incoming/profile-mode";
import { Settings, Stages } from "@/app/types";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("settingsFromEnv", () => {
  test("returns env-free defaults when nothing is set", () => {
    vi.stubEnv("NEXT_PUBLIC_WEDGES", "");
    vi.stubEnv("EVENT_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_HIDE_QR_CODE", "");
    vi.stubEnv("OFFERED_PRIZES", "");
    vi.stubEnv("SMALL_PRIZES", "");
    vi.stubEnv("LEAD_COLLECTION", "");
    vi.stubEnv("MAX_BETS_PER_USER", "");

    expect(settingsFromEnv()).toEqual({
      wedges: [],
      eventName: "",
      hideQrCode: false,
      offeredPrizes: "",
      smallPrizes: [],
      leadCollection: "MANUAL",
      maxBetsPerUser: 0,
    });
  });

  test("parses CSV lists, trimming whitespace and dropping empty entries", () => {
    vi.stubEnv("NEXT_PUBLIC_WEDGES", "Java, Python ,, JavaScript");
    vi.stubEnv("SMALL_PRIZES", " Sticker Pack ,Tote Bag,");

    const settings = settingsFromEnv();
    expect(settings.wedges).toEqual(["Java", "Python", "JavaScript"]);
    expect(settings.smallPrizes).toEqual(["Sticker Pack", "Tote Bag"]);
  });

  test("parses booleans and numbers", () => {
    vi.stubEnv("NEXT_PUBLIC_HIDE_QR_CODE", "true");
    vi.stubEnv("MAX_BETS_PER_USER", "3");

    const settings = settingsFromEnv();
    expect(settings.hideQrCode).toBe(true);
    expect(settings.maxBetsPerUser).toBe(3);
  });

  test("falls back to 0 for non-numeric values instead of NaN", () => {
    vi.stubEnv("MAX_BETS_PER_USER", "not-a-number");

    const settings = settingsFromEnv();
    expect(settings.maxBetsPerUser).toBe(0);
  });

  test("defaults leadCollection to MANUAL when unset", () => {
    vi.stubEnv("LEAD_COLLECTION", "");
    expect(settingsFromEnv().leadCollection).toBe("MANUAL");
  });
});

describe("mergeSettings", () => {
  const defaults: Settings = {
    wedges: ["Java", "Python"],
    eventName: "Default Event",
    hideQrCode: false,
    offeredPrizes: "small",
    smallPrizes: ["Sticker"],
    leadCollection: "MANUAL",
    maxBetsPerUser: 3,
  };

  test("returns the defaults untouched when there are no overrides", () => {
    expect(mergeSettings(defaults, undefined)).toEqual(defaults);
    expect(mergeSettings(defaults, null)).toEqual(defaults);
    expect(mergeSettings(defaults, {})).toEqual(defaults);
  });

  test("prefers override fields over defaults, field by field", () => {
    const merged = mergeSettings(defaults, {
      eventName: "Override Event",
      leadCollection: "QR",
    });
    expect(merged.eventName).toBe("Override Event");
    expect(merged.leadCollection).toBe("QR");
    // Untouched fields keep the default
    expect(merged.wedges).toEqual(defaults.wedges);
    expect(merged.maxBetsPerUser).toBe(defaults.maxBetsPerUser);
  });

  test("respects an explicit 0 override instead of falling back to a non-zero default", () => {
    const merged = mergeSettings(defaults, { maxBetsPerUser: 0 });
    expect(merged.maxBetsPerUser).toBe(0);
  });
});

// Alias matching the one in responses.test.tsx, so these read the same way.
const generateResponse = (user: any, client: any, ctx: any) =>
  handleProfileMode(user, client, {
    ...ctx,
    leadCollection: ctx.settings?.leadCollection ?? "MANUAL",
  });

describe("Sync-sourced settings override env vars", () => {
  test("a wedge only present in ctx.settings.wedges (not in env) is accepted", async () => {
    // NEXT_PUBLIC_WEDGES doesn't contain "Rust" — only the settings override does.
    vi.stubEnv("NEXT_PUBLIC_WEDGES", "Java,Python");
    vi.stubEnv("LEAD_COLLECTION", "MANUAL");

    const currentUser = {
      name: "test-better",
      sender: "+115112341234",
      recipient: "+4915156785678",
      submittedBets: 0,
      stage: Stages.VERIFIED_USER,
    };

    const settings: Settings = {
      ...settingsFromEnv(),
      wedges: ["Rust"],
    };

    const response = await generateResponse(currentUser, undefined, {
      messageContent: "I'd like to bet on Rust",
      attendeesMap: {
        syncMapItems: () => ({
          update: async (data: any) => data,
        }),
      },
      betsDoc: {
        data: { bets: [], temporaryBlock: false, closed: false },
        update: async (data: any) => data,
      },
      settings,
    });

    expect(response).toContain(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>🎯 Bet confirmed!`,
    );
  });

  test("ctx.settings.maxBetsPerUser overrides a more permissive MAX_BETS_PER_USER env var", async () => {
    // Env alone would allow this bet (limit 20 > submittedBets 1); the
    // settings override should be the one enforced.
    vi.stubEnv("MAX_BETS_PER_USER", "20");
    vi.stubEnv("LEAD_COLLECTION", "MANUAL");

    const currentUser = {
      name: "test-better",
      sender: "+115112341234",
      recipient: "+4915156785678",
      submittedBets: 1,
      stage: Stages.VERIFIED_USER,
    };

    const settings: Settings = {
      ...settingsFromEnv(),
      wedges: ["Java", "Python"],
      maxBetsPerUser: 1,
    };

    const response = await generateResponse(currentUser, undefined, {
      messageContent: "I'd like to bet on Java",
      attendeesMap: {},
      betsDoc: {
        data: { bets: [], temporaryBlock: false, closed: false },
      },
      settings,
    });

    expect(response).toContain(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Message>You've reached the maximum number of bets for this session!",
    );
  });

  test("ctx.settings.offeredPrizes overrides the OFFERED_PRIZES env var for a returning winner", async () => {
    // Env says "big" (raffle-qualification copy); settings override says "small".
    vi.stubEnv("OFFERED_PRIZES", "big");
    vi.stubEnv("LEAD_COLLECTION", "MANUAL");

    const currentUser = {
      name: "test-better",
      sender: "+115112341234",
      recipient: "+4915156785678",
      stage: Stages.WINNER_UNCLAIMED,
    };

    const settings: Settings = {
      ...settingsFromEnv(),
      offeredPrizes: "small",
    };

    let sentBody = "";
    await generateResponse(
      currentUser,
      {
        messages: {
          create: (c: any) => {
            sentBody = c.body;
          },
        },
      },
      {
        messageContent: "Hello",
        attendeesMap: {},
        betsDoc: { data: { bets: {}, temporaryBlock: true, closed: false } },
        settings,
      },
    );

    expect(sentBody).toContain(
      "Congrats, you already won. Stop by the Twilio booth to claim your prize!",
    );
  });
});
