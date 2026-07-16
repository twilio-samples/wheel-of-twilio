export const dynamic = "force-dynamic";

import { getGameState, getWinners } from "../twilio";
import { RaffleButton } from "./raffleButton";
import { AutoRefresh } from "@/components/auto-refresh";
import { WinnersPanel } from "./winners-panel";

export default async function AdminPage() {
  const [winners, gameState] = await Promise.all([
    getWinners(true),
    getGameState(),
  ]);
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="h-full overflow-auto relative">
      <AutoRefresh />
      <div
        className={`mx-4 sm:mx-6 py-8 flex flex-col gap-6 ${isDev ? "pb-28" : ""}`}
      >
        <WinnersPanel winners={winners} initialGameState={gameState} />
      </div>
      {isDev && <RaffleButton />}
    </div>
  );
}
