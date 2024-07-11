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

  return (
    <div className="vh-full flex h-full item justify-center relative">
      <DataTable columns={columns} data={winners} />
    </div>
  );
}
