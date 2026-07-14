export const dynamic = "force-dynamic";

import { getWinners } from "../twilio";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { RaffleButton } from "./raffleButton";
import { AutoRefresh } from "@/components/auto-refresh";
import { Stages } from "../types";
import { displayFont } from "../fonts";

export default async function WinnerPage(props: {
  searchParams: Promise<{ all: string }>;
}) {
  const searchParams = await props.searchParams;
  const winners = await getWinners(searchParams.all === "true");
  const unclaimedCount = winners.filter(
    (w) => w.stage === Stages.WINNER_UNCLAIMED,
  ).length;
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="h-full overflow-auto relative">
      <AutoRefresh />
      <div
        className={`mx-4 sm:mx-6 py-8 flex flex-col gap-6 ${isDev ? "pb-28" : ""}`}
      >
        <header>
          <h1
            className={`text-3xl sm:text-4xl text-[#E8B339] ${displayFont.className}`}
          >
            Winner&rsquo;s circle
          </h1>
          <p className="mt-1 text-sm text-[#B9C3D9]">
            {winners.length} {winners.length === 1 ? "prize" : "prizes"} tracked
            {unclaimedCount > 0 && (
              <>
                {" "}
                &middot;{" "}
                <span className="text-[#EF223A] font-medium">
                  {unclaimedCount} awaiting pickup
                </span>
              </>
            )}
          </p>
        </header>

        <DataTable columns={columns} data={winners} />
      </div>
      {isDev && <RaffleButton />}
    </div>
  );
}
