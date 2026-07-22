"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Stages } from "../types";
import { MaskedPlayer } from "../twilio";
import { ClaimButton, StatusPill } from "./status";

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
  { accessorKey: "smallPrize", header: "Prize" },
  {
    accessorKey: "stage",
    header: "Status",
    cell: ({ row }) => {
      const stage = row.getValue("stage") as string;
      return (
        <div className="flex items-center gap-3 flex-wrap">
          <StatusPill stage={stage} />
          {stage === Stages.WINNER_UNCLAIMED && (
            <ClaimButton winnerKey={row.getValue("key")} />
          )}
        </div>
      );
    },
  },
];
