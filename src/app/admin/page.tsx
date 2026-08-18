export const dynamic = "force-dynamic";

import { getGameState, getWinners } from "../twilio";
import { getSettings } from "../settings";
import { RaffleButton } from "./raffleButton";
import { AutoRefresh } from "@/components/auto-refresh";
import { WinnersPanel } from "./winners-panel";

export default async function AdminPage() {
  const [winners, gameState, settings] = await Promise.all([
    getWinners(true),
    getGameState(),
    getSettings(),
  ]);
  const raffleEnabled =
    settings.offeredPrizes === "big" || settings.offeredPrizes === "both";

  return (
    <div className="h-full overflow-auto relative">
      <AutoRefresh />
      <div
        className={`mx-4 sm:mx-6 py-8 flex flex-col gap-6 ${raffleEnabled ? "pb-28" : ""}`}
      >
        <WinnersPanel winners={winners} initialGameState={gameState} />
      </div>
      {raffleEnabled && <RaffleButton />}
    </div>
  );
}
