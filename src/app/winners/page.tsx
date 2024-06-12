import { getWinners } from "../twilio";
import { Stages } from "../types";

export default async function WinnerPage() {
  const winners = await getWinners();

  return (
    <div className="vh-full flex h-full  item justify-center relative">
      <div className="w-1/2 flex  item justify-center relative">
        <ul className="list-disc my-auto">
          {winners.map((a) => (
            <li key={a.sender}>
              {/* @ts-ignore */}
              {a.name} | {a.sender} | {Stages[a.stage]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
