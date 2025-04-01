"use client";

import { Button } from "@/components/ui/button";
import { raffleWinner } from "../twilio";

export function RaffleButton() {
  return (
    <Button
      onClick={(el) => {
        const btn = el.currentTarget;
        btn.disabled = true;
        btn.innerText = "Loading...";
        raffleWinner()
          .then((res) => {
            btn.innerText = res.message;
          })
          .catch((err) => {
            btn.innerText = "Error";
          });
      }}
      className="absolute bottom-4 w-8/10"
    >
      Raffle Winner
    </Button>
  );
}
