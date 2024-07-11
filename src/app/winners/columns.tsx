"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Stages } from "../types";
import { MaskedPlayer, winnerPrizeClaimed } from "../twilio";

export const columns: ColumnDef<MaskedPlayer>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "key",
    header: "key",
  },
  {
    accessorKey: "sender",
    header: "Sender",
  },
  {
    accessorKey: "stage",
    header: "State",
    cell: ({ row }) => {
      return (
        <div className="flex items-center flex-wrap">
          <div className="mr-4">
            {row.getValue("stage") === Stages.WINNER_CLAIMED
              ? "Claimed"
              : row.getValue("stage") === Stages.WINNER_UNCLAIMED
                ? "Unclaimed"
                : row.getValue("stage") === Stages.RAFFLE_WINNER
                  ? "Raffle Winner"
                  : "Unknown State"}
          </div>
          {row.getValue("stage") === Stages.WINNER_UNCLAIMED && (
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded "
              onClick={async () => {
                await winnerPrizeClaimed(row.getValue("key"));
                window.location.reload();
              }}
            >
              Prize received
            </button>
          )}
        </div>
      );
    },
  },
];
