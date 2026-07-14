export const dynamic = "force-dynamic";

import { AutoRefresh } from "@/components/auto-refresh";
import { getStats } from "../twilio";
import { StatStrip } from "./stat-tile";
import { BetsPieChart } from "./bets-pie-chart";
import { BetsOverTimeChart } from "./bets-over-time-chart";
import { displayFont, dataFont } from "../fonts";
import { ACCENT, SURFACE } from "./palette";

export default async function StatsPage() {
  const stats = await getStats();

  const ledger = [
    { label: "Unclaimed", value: stats.winners.unclaimed, color: ACCENT.red },
    { label: "Claimed", value: stats.winners.claimed, color: ACCENT.gold },
    { label: "Raffle winners", value: stats.winners.raffle, color: "#3987e5" },
  ];

  return (
    <div className="h-full overflow-auto relative">
      <AutoRefresh />
      <div className="mx-4 sm:mx-6 py-8 flex flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#7C89AC]">
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                  style={{ backgroundColor: ACCENT.red }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: ACCENT.red }}
                />
              </span>
              Live &middot; refreshes every 5s
            </div>
            <h1
              className={`mt-2 text-3xl sm:text-4xl text-[#FDF7F4] ${displayFont.className}`}
            >
              Live odds
            </h1>
          </div>
          <img
            src="/images/twilio-bug-white.svg"
            alt=""
            className="w-6 h-6 opacity-30 mt-1 shrink-0"
          />
        </header>

        <StatStrip
          items={[
            { label: "Total bets", value: stats.totalBets },
            { label: "Unique bettors", value: stats.uniqueBettors },
            { label: "Rounds played", value: stats.roundsPlayed },
          ]}
        />

        <div
          className="rounded-md border px-6 py-4"
          style={{ borderColor: SURFACE.line, backgroundColor: SURFACE.card }}
        >
          <div className="text-xs uppercase tracking-[0.15em] text-[#7C89AC] mb-3">
            Prize ledger
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {ledger.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-[#B9C3D9]">{item.label}</span>
                <span
                  className={`text-lg font-medium tabular-nums text-[#FDF7F4] ${dataFont.className}`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BetsPieChart data={stats.distribution} />
          <BetsOverTimeChart history={stats.history} />
        </div>
      </div>
    </div>
  );
}
