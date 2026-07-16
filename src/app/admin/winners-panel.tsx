"use client";

import { useMemo, useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { GameStateToggle } from "./game-state-toggle";
import { Stages, GameState } from "../types";
import { MaskedPlayer } from "../twilio";
import { displayFont } from "../fonts";

export function WinnersPanel({
  winners,
  initialGameState,
}: {
  winners: MaskedPlayer[];
  initialGameState: GameState;
}) {
  const [showAll, setShowAll] = useState(false);

  const unclaimedCount = useMemo(
    () => winners.filter((w) => w.stage === Stages.WINNER_UNCLAIMED).length,
    [winners],
  );

  const visibleWinners = useMemo(
    () =>
      showAll
        ? winners
        : winners.filter((w) => w.stage === Stages.WINNER_UNCLAIMED),
    [winners, showAll],
  );

  return (
    <>
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className={`text-3xl sm:text-4xl text-[#E8B339] ${displayFont.className}`}
          >
            Winner&rsquo;s circle
          </h1>
          <p className="mt-1 text-sm text-[#B9C3D9]">
            {visibleWinners.length}{" "}
            {visibleWinners.length === 1 ? "prize" : "prizes"} tracked
            {unclaimedCount > 0 && (
              <>
                {" "}
                &middot;{" "}
                <span className="text-[#EF223A] font-medium">
                  {unclaimedCount} awaiting pickup
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Toggle
            pressed={showAll}
            onPressedChange={setShowAll}
            aria-label="Show all winners"
            className="border border-[#24365F] bg-[#0B1B3E] text-[#B9C3D9] hover:bg-[#12275A] hover:text-[#FDF7F4] data-[state=on]:bg-[#12275A] data-[state=on]:text-[#FDF7F4]"
          >
            Show all
          </Toggle>
          <GameStateToggle initialState={initialGameState} />
        </div>
      </header>

      <DataTable columns={columns} data={visibleWinners} />
    </>
  );
}
