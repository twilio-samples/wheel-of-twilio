import { getWinners, winnerPrizeClaimed } from "../twilio";
import { Stages } from "../types";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default async function WinnerPage({
  searchParams,
}: {
  searchParams: { all: string };
}) {
  let winners = await getWinners(searchParams.all === "true");

  // generate 100 winners with random attributes
  for (let i = 0; i < 100; i++) {
    winners.push({
      name: `Winner ${i}`,
      sender: `whatsapp:${Math.floor(Math.random() * 100000000)}`,
      stage:
        Math.random() > 0.5 ? Stages.WINNER_CLAIMED : Stages.WINNER_UNCLAIMED,
    });
  }

  return (
    <div className="vh-full flex h-full  item justify-center relative">
      <DataTable columns={columns} data={winners} />
    </div>
  );
}
