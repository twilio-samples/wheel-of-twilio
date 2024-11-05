import { getWinners, winnerPrizeClaimed } from "../twilio";
import { Stages } from "../types";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default async function WinnerPage(
  props: {
    searchParams: Promise<{ all: string }>;
  }
) {
  const searchParams = await props.searchParams;
  let winners = await getWinners(searchParams.all === "true");

  return (
    <div className="vh-full flex h-full item justify-center relative">
      <DataTable columns={columns} data={winners} />
    </div>
  );
}
