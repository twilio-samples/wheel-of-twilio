"use client";

import { useState, useTransition } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { setGameState } from "../twilio";
import { GameState } from "../types";

const OPTIONS = [
  { value: GameState.RUNNING, label: "Running" },
  { value: GameState.PAUSED, label: "Paused" },
  { value: GameState.ENDED, label: "Ended" },
];

const itemClassName =
  "border border-[#24365F] bg-[#0B1B3E] text-[#B9C3D9] hover:bg-[#12275A] hover:text-[#FDF7F4] data-[state=on]:bg-[#EF223A] data-[state=on]:text-[#FDF7F4]";

export function GameStateToggle({
  initialState,
}: {
  initialState: GameState;
}) {
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  return (
    <ToggleGroup
      type="single"
      value={state}
      disabled={isPending}
      onValueChange={(value) => {
        if (!value || value === state) return;
        setState(value as GameState);
        startTransition(() => {
          setGameState(value as GameState);
        });
      }}
    >
      {OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
          className={itemClassName}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
