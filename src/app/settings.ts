"use server";

import { Settings } from "./types";
import { settingsFromEnv, mergeSettings } from "./settings-defaults";

const {
  TWILIO_API_KEY = "",
  TWILIO_API_SECRET = "",
  TWILIO_ACCOUNT_SID = "",
  SYNC_SERVICE_SID = "",
} = process.env;

const client = require("twilio")(TWILIO_API_KEY, TWILIO_API_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

enum Privilege {
  FRONTEND = "FRONTEND",
}

// Unconditionally (re)grants FRONTEND read access, so a doc that was
// auto-created here before this permission grant existed self-heals on the
// next call, without requiring a re-run of `pnpm setup`.
async function ensureSettingsDocExists(syncService: any) {
  const doc = syncService.documents()("settings");
  try {
    await doc.fetch();
  } catch (e: any) {
    if (e.status !== 404) throw e;
    try {
      await syncService.documents().create({ uniqueName: "settings" });
    } catch (createError: any) {
      // Another concurrent caller (e.g. /admin and /settings racing on a
      // cold Sync service) may have created it in the meantime — that's
      // fine, the doc exists either way. Only re-throw a genuine failure.
      if (createError.status !== 409) throw createError;
    }
  }
  await doc.documentPermissions(Privilege.FRONTEND).update({
    read: true,
    write: false,
    manage: false,
  });
  return doc;
}

export async function getSettings(): Promise<Settings> {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const doc = await ensureSettingsDocExists(syncService);
  const fetched = await doc.fetch();
  return mergeSettings(settingsFromEnv(), fetched.data as Partial<Settings>);
}

function assertValidSettings(settings: Settings) {
  if (settings.wedges.length === 0) {
    throw new Error("At least one wedge is required");
  }
  if (!["MANUAL", "QR", "NONE"].includes(settings.leadCollection)) {
    throw new Error("Invalid lead collection mode");
  }
  if (!["", "small", "big", "both"].includes(settings.offeredPrizes)) {
    throw new Error("Invalid offered prizes value");
  }
  if (settings.maxBetsPerUser < 0) {
    throw new Error("Max bets per user cannot be negative");
  }
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const cleaned: Settings = {
    ...settings,
    wedges: settings.wedges.map((w) => w.trim()).filter((w) => w !== ""),
    smallPrizes: settings.smallPrizes.map((p) => p.trim()).filter((p) => p !== ""),
    eventName: settings.eventName.trim(),
  };
  assertValidSettings(cleaned);

  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const doc = await ensureSettingsDocExists(syncService);
  await doc.update({ data: cleaned });
  return cleaned;
}

export async function resetSettings(): Promise<Settings> {
  const syncService = await client.sync.v1.services(SYNC_SERVICE_SID).fetch();
  const doc = await ensureSettingsDocExists(syncService);
  await doc.update({ data: {} });
  return settingsFromEnv();
}
