import QRCode from "react-qr-code";

export default function Second({}) {
  const wedges = [
    "Amsterdam",
    "Berlin",
    "Copenhagen",
    "Dublin",
    "Edinburgh",
    "Helsinki",
    "Lisbon",
    "Madrid",
    "Oslo",
    "Prague",
    "Rome",
    "Stockholm",
    // "Vienna",
    // "Warsaw",
    // "Zurich",
  ];

  return (
    <div
      style={{
        backgroundColor: "#121c2d",
        backgroundSize: "60px 60px",
        backgroundImage:
          "linear-gradient(to right, grey 1px, transparent 1px), linear-gradient(to bottom, grey 1px, transparent 1px)",
      }}
      className="vh-full flex h-full"
    >
      <div className="w-1/2 flex items-center justify-center">
        <img src="/images/second.png" alt="second" />

        <div className="absolute bottom-3 text-gray-300 font-light  text-xs ml-16">
          <p className="">
            Please note that by scanning the QR code a WhatsApp conversation
            will be prompted and your WhatsApp profile and phone number will be
            accessible by Twilio.
          </p>
          <p className="">
            Your WhatsApp profile and phone number is necessary for you to play
            the game and will be deleted at the end of the event. Your personal
            data collected as part of the game is processed in accordance with
            Twilio Privacy Notice available on Twilio website.
          </p>
        </div>
      </div>
      <div className="w-1/2 flex items-center justify-center">
        <div className="absolute top-16 w-1/2">
          <div className="flex flex-col text-3xl font-extrabold pb-8 w-1/2 mx-auto">
            <h1 className="text-white">Better communication</h1>
            <h1 className="text-amber-300">in the blink of an API</h1>
          </div>
          <div className="w-2/3 mx-auto grid grid-cols-2 pb-8  gap-6 space-around text-center text-xl font-semibold ">
            {wedges.map((wedge, index) => {
              const isRed = Math.floor((index - 1) / 2) % 2 === 0;
              return (
                <div
                  key={wedge}
                  className={`bg-${isRed ? "red-500" : "white"} text-${
                    isRed ? "white" : "black"
                  } py-5 rounded-t-lg w-full`}
                >
                  {wedge}
                </div>
              );
            })}
          </div>
          <div className="w-2/3 mx-auto grid grid-cols-2 pb-8 gap-6 ">
            <span className="ml-auto text-right w-1/2 font-extrabold text-xl">
              Scan the code and win prizes
            </span>
            {/* @ts-ignore */}
            <QRCode
              className="w-24 h-24 p-1 bg-white"
              value={`https://wa.me/${process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER}?text=Hit%20send%20to%20start!`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
