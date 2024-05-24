import QRCode from "react-qr-code";
import Wheel from "./Wheel";

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
    <div className="vh-full flex h-full">
      <div className="w-1/2 flex items-center justify-center">
        <div className=" h-[400px] w-[400px] rounded-full bg-[#F22F46] flex items-center animate-spin ani justify-center">
          Hello me
        </div>

        <div className="absolute bottom-3 font-light  text-xs ml-16">
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
        <div className="absolute top-20 w-1/2">
          <div className="flex flex-col text-3xl font-extrabold pb-8 w-1/2 mx-auto">
            <h1 className="text-[#FDF7F4]">Better communication</h1>
            <h1 className="text-[#F2BE5A]">in the blink of an API</h1>
          </div>
          <div className="w-2/3 mx-auto grid grid-cols-2 pb-8  gap-4 space-around text-center text-xl font-semibold ">
            {wedges.map((wedge, index) => {
              const isRed = Math.floor((index - 1) / 2) % 2 === 0;
              return (
                <div
                  key={wedge}
                  className={`${isRed ? "bg-[#F22F46]" : "bg-[#FDF7F4]"} ${
                    isRed ? "text-[#FDF7F4]" : "text-[#121C2D]"
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
              className="w-24 h-24 p-1 bg-[#FDF7F4]"
              value={`https://wa.me/${process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER}?text=Hit%20send%20to%20start!`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
