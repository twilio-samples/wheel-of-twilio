import { Settings } from "./types";

function toCsvList(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

// Reads process.env at call time (not module load time) so changes to
// .env.local / deployment env vars take effect without a restart, matching
// the rest of the app's "read at request time" convention.
export function settingsFromEnv(): Settings {
  return {
    wedges: toCsvList(process.env.NEXT_PUBLIC_WEDGES),
    eventName: process.env.EVENT_NAME || "",
    hideQrCode: process.env.NEXT_PUBLIC_HIDE_QR_CODE === "true",
    prizesPerField: parseInt(process.env.NEXT_PUBLIC_PRIZES_PER_FIELD || "0", 10) || 0,
    offeredPrizes: (process.env.OFFERED_PRIZES || "") as Settings["offeredPrizes"],
    smallPrizes: toCsvList(process.env.SMALL_PRIZES),
    leadCollection: (process.env.LEAD_COLLECTION || "MANUAL") as Settings["leadCollection"],
    maxBetsPerUser: parseInt(process.env.MAX_BETS_PER_USER || "0", 10) || 0,
  };
}

export function mergeSettings(
  defaults: Settings,
  overrides?: Partial<Settings> | null,
): Settings {
  if (!overrides) return defaults;
  return {
    wedges: overrides.wedges ?? defaults.wedges,
    eventName: overrides.eventName ?? defaults.eventName,
    hideQrCode: overrides.hideQrCode ?? defaults.hideQrCode,
    prizesPerField: overrides.prizesPerField ?? defaults.prizesPerField,
    offeredPrizes: overrides.offeredPrizes ?? defaults.offeredPrizes,
    smallPrizes: overrides.smallPrizes ?? defaults.smallPrizes,
    leadCollection: overrides.leadCollection ?? defaults.leadCollection,
    maxBetsPerUser: overrides.maxBetsPerUser ?? defaults.maxBetsPerUser,
  };
}
