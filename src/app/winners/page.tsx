export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { getWinners } from "../twilio";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { RaffleButton } from "./raffleButton";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function WinnerPage(props: {
  searchParams: Promise<{ all: string }>;
}) {
  const searchParams = await props.searchParams;
  let winners = await getWinners(searchParams.all === "true");

  return (
    <div className="vh-full flex h-full item justify-center relative">
      <AutoRefresh />
      {process.env.NODE_ENV === "development" && <RaffleButton />}
      <DataTable columns={columns} data={winners} />
    </div>
  );
}
