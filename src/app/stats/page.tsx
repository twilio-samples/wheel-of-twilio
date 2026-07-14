export const dynamic = "force-dynamic";

import { AutoRefresh } from "@/components/auto-refresh";
import { getStats } from "../twilio";
import { StatTile } from "./stat-tile";
import { BetsPieChart } from "./bets-pie-chart";
import { BetsOverTimeChart } from "./bets-over-time-chart";

export default async function StatsPage() {
  const stats = await getStats();

  return (
    <div className="h-full overflow-auto relative">
      <AutoRefresh />
      <div className="mx-4 py-8 flex flex-col gap-6">
        <div className="flex flex-wrap gap-4">
          <StatTile label="Total bets" value={stats.totalBets} />
          <StatTile label="Unique bettors" value={stats.uniqueBettors} />
          <StatTile label="Rounds played" value={stats.roundsPlayed} />
        </div>

        <div className="flex flex-wrap gap-4">
          <StatTile label="Unclaimed prizes" value={stats.winners.unclaimed} />
          <StatTile label="Claimed prizes" value={stats.winners.claimed} />
          <StatTile label="Raffle winners" value={stats.winners.raffle} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BetsPieChart data={stats.distribution} />
          <BetsOverTimeChart history={stats.history} />
        </div>
      </div>
    </div>
  );
}
