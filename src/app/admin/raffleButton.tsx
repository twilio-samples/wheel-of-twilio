"use client";

import { useRef, useState } from "react";
import { raffleWinner } from "../twilio";

const HOLD_SECONDS = 5;

export function RaffleButton() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState("Hold to raffle winner");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function triggerRaffle() {
    setStatus("loading");
    setMessage("Loading...");
    raffleWinner()
      .then((res) => {
        setStatus("done");
        setMessage(res.message);
      })
      .catch(() => {
        setStatus("done");
        setMessage("Error");
      });
  }

  function startHold() {
    if (status !== "idle" || intervalRef.current !== null) return;
    let remaining = HOLD_SECONDS;
    setSecondsLeft(remaining);
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearTimer();
        setSecondsLeft(null);
        triggerRaffle();
      } else {
        setSecondsLeft(remaining);
      }
    }, 1000);
  }

  function cancelHold() {
    clearTimer();
    setSecondsLeft(null);
  }

  const label = secondsLeft !== null ? `Hold... ${secondsLeft}` : message;

  return (
    <button
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      disabled={status !== "idle"}
      className="fixed left-4 right-4 sm:left-auto sm:right-6 bottom-[calc(1rem+env(safe-area-inset-bottom))] rounded-md bg-[#EF223A] hover:bg-[#c81b30] active:bg-[#a91627] text-[#FDF7F4] font-semibold px-6 py-3 shadow-lg shadow-black/40 transition-colors disabled:opacity-60 select-none touch-none"
    >
      {label}
    </button>
  );
}
