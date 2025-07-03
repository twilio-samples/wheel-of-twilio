import { changeGameLock } from "../twilio";

export default async function WinnerPage(props: {
  searchParams: Promise<{ kind: "running" | "break" | "end" }>;
}) {
  const searchParams = await props.searchParams;
  const kind = searchParams.kind;

  let heading = "";
  let subheading = "";

  if (kind === "running") {
    heading = "Game is running";
    subheading = "The Wheel of Twilio is currently running";
    changeGameLock(kind);
  } else if (kind === "break") {
    heading = "Be right back";
    subheading = "The Wheel of Twilio will return after a break";
    changeGameLock(kind);
  } else if (kind === "end") {
    heading = "The game has ended";
    subheading = "No more bets can be placed";
    changeGameLock(kind);
  } else {
    heading = "Unknown state";
    subheading = "Valid status are running, break, end";
  }

  return (
    <div className="vh-full flex h-full item justify-center align-center relative">
      <img
        src="/images/twilio.png"
        alt="logo"
        className="absolute w-1/3 mt-24"
      />
      <div className="my-auto text-center">
        <h1 className="text-[#EF223A] text-8xl mb-6">{heading}</h1>
        {/* TODO change font here */}
        <h1 className="text-3xl text-[#FDF7F4]">{subheading}</h1>
      </div>
    </div>
  );
}
