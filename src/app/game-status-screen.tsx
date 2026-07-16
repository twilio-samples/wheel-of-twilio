// Copyright 2024 Twilio Inc.

export function GameStatusScreen({
  heading,
  subheading,
}: {
  heading: string;
  subheading: string;
}) {
  return (
    <div className="vh-full flex h-full item justify-center align-center relative">
      <img
        src="/images/twilio.png"
        alt="logo"
        className="absolute w-1/3 mt-24"
      />
      <div className="my-auto text-center">
        <h1 className="text-[#EF223A] text-8xl mb-6">{heading}</h1>
        <h1 className="text-3xl text-[#FDF7F4]">{subheading}</h1>
      </div>
    </div>
  );
}
