"use client";

import { Stages } from "../types";
import { winnerPrizeClaimed } from "../twilio";
import { dataFont } from "../fonts";

export const STATUS_LABEL: Record<string, string> = {
  [Stages.WINNER_CLAIMED]: "Claimed",
  [Stages.WINNER_UNCLAIMED]: "Unclaimed",
  [Stages.RAFFLE_WINNER]: "Raffle winner",
};

export const STATUS_COLOR: Record<string, string> = {
  [Stages.WINNER_CLAIMED]: "#E8B339",
  [Stages.WINNER_UNCLAIMED]: "#EF223A",
  [Stages.RAFFLE_WINNER]: "#3987e5",
};

export function statusColor(stage: string) {
  return STATUS_COLOR[stage] ?? "#7C89AC";
}

export function StatusPill({ stage }: { stage: string }) {
  const color = statusColor(stage);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs uppercase tracking-wide whitespace-nowrap ${dataFont.className}`}
      style={{ borderColor: `${color}55`, color, backgroundColor: `${color}1A` }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {STATUS_LABEL[stage] ?? "Unknown"}
    </span>
  );
}

export function ClaimButton({ winnerKey }: { winnerKey: string }) {
  return (
    <button
      className="rounded-md bg-[#EF223A] hover:bg-[#c81b30] active:bg-[#a91627] text-[#FDF7F4] text-sm font-semibold px-3 py-1.5 transition-colors whitespace-nowrap"
      onClick={async (event) => {
        const btn = event.currentTarget;
        btn.disabled = true;
        await winnerPrizeClaimed(winnerKey);
        window.location.reload();
      }}
    >
      Mark received
    </button>
  );
}
