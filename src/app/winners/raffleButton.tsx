"use client";

import { raffleWinner } from "../twilio";

export function RaffleButton() {
  return (
    <button
      onClick={(el) => {
        const btn = el.currentTarget;
        btn.disabled = true;
        btn.innerText = "Loading...";
        raffleWinner()
          .then((res) => {
            btn.innerText = res.message;
          })
          .catch(() => {
            btn.innerText = "Error";
          });
      }}
      className="fixed left-4 right-4 sm:left-auto sm:right-6 bottom-[calc(1rem+env(safe-area-inset-bottom))] rounded-md bg-[#EF223A] hover:bg-[#c81b30] active:bg-[#a91627] text-[#FDF7F4] font-semibold px-6 py-3 shadow-lg shadow-black/40 transition-colors disabled:opacity-60"
    >
      Raffle winner
    </button>
  );
}
