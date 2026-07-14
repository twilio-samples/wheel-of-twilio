"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK, SURFACE, wedgeColor } from "./palette";

interface HistoryPoint {
  timestamp: number;
  roundBets: number;
  cumulativeTotal: number;
}

export function BetsOverTimeChart({ history }: { history: HistoryPoint[] }) {
  const color = wedgeColor(0);
  const data = history.map((point, index) => ({
    round: index + 1,
    time: new Date(point.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    roundBets: point.roundBets,
  }));

  return (
    <div
      className="rounded-md border p-4"
      style={{ borderColor: SURFACE.line, backgroundColor: SURFACE.card }}
    >
      <div className="text-xs uppercase tracking-widest text-[#7C89AC] mb-2">
        Bets per round over time
      </div>
      {data.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-[#7C89AC]">
          No rounds played yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_INK.gridline} vertical={false} />
            <XAxis
              dataKey="time"
              stroke={CHART_INK.baseline}
              tick={{ fill: CHART_INK.muted, fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              stroke={CHART_INK.baseline}
              tick={{ fill: CHART_INK.muted, fontSize: 12 }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: SURFACE.raised,
                border: `1px solid ${CHART_INK.gridline}`,
                borderRadius: 6,
              }}
              labelStyle={{ color: CHART_INK.secondary }}
              itemStyle={{ color: CHART_INK.primary }}
              formatter={(value) => [value, "Bets"]}
            />
            <Area
              type="monotone"
              dataKey="roundBets"
              name="Bets"
              stroke={color}
              strokeWidth={2}
              fill={color}
              fillOpacity={0.15}
              dot={{ r: 4, fill: color, stroke: SURFACE.card, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
