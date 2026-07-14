import { dataFont } from "../fonts";
import { SURFACE } from "./palette";

interface StatItem {
  label: string;
  value: number | string;
}

// A single tote-board strip instead of separate boxes per number — reads as
// one instrument with segments, closer to a scoreboard than a card grid.
export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 rounded-md border"
      style={{ borderColor: SURFACE.line, backgroundColor: SURFACE.card }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`px-6 py-5 ${i > 0 ? "border-t sm:border-t-0 sm:border-l" : ""}`}
          style={{ borderColor: SURFACE.line }}
        >
          <div className="text-xs uppercase tracking-[0.15em] text-[#7C89AC]">
            {item.label}
          </div>
          <div
            className={`mt-1 text-4xl sm:text-5xl font-medium tabular-nums text-[#FDF7F4] ${dataFont.className}`}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
