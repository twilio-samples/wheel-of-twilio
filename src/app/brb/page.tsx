export default async function WinnerPage({
  searchParams,
}: {
  searchParams: Promise<{ all: string }>;
}) {
  return (
    <div className="vh-full flex h-full item justify-center align-center relative">
      <h1 className="text-3xl my-auto text-white">
        The Wheel of Twilio will be right back after a break
      </h1>
    </div>
  );
}
