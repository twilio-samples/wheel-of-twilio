"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_INK, wedgeColor } from "./palette";

interface BetsPieChartProps {
  data: { wedge: string; count: number }[];
}

const RADIAN = Math.PI / 180;

// Recharts' built-in label defaults to black text, invisible on the dark
// page background — render it ourselves in the chart ink color instead.
function renderSliceLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, percent } = props;
  if (!percent || percent < 0.03) return null;

  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={CHART_INK.secondary}
      fontSize={12}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function BetsPieChart({ data }: BetsPieChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-[#c3c2b7] mb-2">Bets by wedge</div>
      {total === 0 ? (
        <div className="flex h-[320px] items-center justify-center text-sm text-[#898781]">
          No bets yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="wedge"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={2}
              stroke="#000D25"
              strokeWidth={2}
              labelLine={{ stroke: CHART_INK.muted, strokeWidth: 1 }}
              label={renderSliceLabel}
            >
              {data.map((entry, index) => (
                <Cell key={entry.wedge} fill={wedgeColor(index)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#0d0d0d",
                border: `1px solid ${CHART_INK.gridline}`,
                borderRadius: 6,
              }}
              itemStyle={{ color: CHART_INK.primary }}
              labelStyle={{ color: CHART_INK.secondary }}
            />
            <Legend wrapperStyle={{ color: CHART_INK.secondary, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
