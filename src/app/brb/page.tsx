export default async function WinnerPage({
  searchParams,
}: {
  searchParams: Promise<{ all: string }>;
}) {
  return (
    <div className="vh-full flex h-full item justify-center align-center relative">
      <div className=" my-auto">
        <h1 className="text-[#EF223A] text-8xl mb-6">
          Be right back
        </h1>
        {/* TODO change font here */}
        <h1 className="text-3xl text-[#FDF7F4]">
          The Wheel of Twilio will return after a break
        </h1>
      </div>
    </div>
  );
}
