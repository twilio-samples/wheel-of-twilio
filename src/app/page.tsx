// Copyright 2024 Twilio Inc.

"use client";

import { useState, useEffect } from "react";
import { Client, SyncClient } from "twilio-sync";
import {
  fetchToken,
  notifyAndUpdateWinners,
  messageOthers,
  tempUnlockGame,
  tempLockGame,
} from "./twilio";
import SpinAndWin from "./ReactSpinGame";
import QRCode from "react-qr-code";
import localFont from "next/font/local";
import { useScreenOrientation } from "./utils/use-screen-orientation";

const myFont = localFont({
  src: "../../public/fonts/BFBuffalo-Black.otf",
});

function App() {
  const [bets, setBets] = useState<any[]>([]);
  const [isFull, setIsFull] = useState(false);
  const screenOrientation = useScreenOrientation();

  let wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");
  const hideQrCode = process.env.NEXT_PUBLIC_HIDE_QR_CODE === "true";

  useEffect(() => {
    let syncClient: SyncClient;
    fetchToken().then(async (token) => {
      syncClient = new Client(token);
      syncClient.on("tokenAboutToExpire", async () => {
        const token = await fetchToken();
        syncClient.updateToken(token);
      });
      syncClient.on("connectionError", (error: any) => {
        console.error(error);
      });
      syncClient.on("connectionStateChanged", async (state: string) => {
        if (state === "connected") {
          const doc: any = await syncClient.document("bets");
          doc.on("updated", (event: any) => {
            if (event.data.bets) setBets(event.data.bets);
            setIsFull(event?.data?.full || false);
          });

          if (doc.data) {
            setBets(doc.data.bets || []);
            setIsFull(doc.data.full);
          }
        }
      });
    });

    return () => {
      syncClient && syncClient.shutdown();
    };
  }, []);

  const spinner = (
    <SpinAndWin
      wedges={wedges}
      time={3}
      onAfterStarted={() => {
        tempLockGame();
      }}
      onAfterFinished={(selectedWedge: string) => {
        // selectedWedge = "Java" to test the winning condition
        notifyAndUpdateWinners(bets.filter((bet) => bet[1] === selectedWedge));
        messageOthers(
          bets.filter((bet) => bet[1] !== selectedWedge),
          selectedWedge
        );
        tempUnlockGame();
      }}
    />
  );

  const legalText = (
    <>
      {!hideQrCode && (
        <p className="">
          Please note that by scanning the QR code a WhatsApp conversation will be
          prompted and your WhatsApp profile and phone number will be accessible
          by Twilio.
        </p>
      )}
      <p className="">
        Your WhatsApp profile and phone number is necessary for you to play the
        game and will be deleted at the end of the event. Your personal data
        collected as part of the game is processed in accordance with Twilio
        Privacy Notice available on Twilio website.
      </p>
      <p className="">
        Twilio employees and government officials are not eligible to win.
      </p>
    </>
  );

  const CTA = "Scan the code and win prizes";
  const QR_LINK_URL = `https://wa.me/${process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER}?text=Hit%20send%20to%20start!`;

  const logoAndHeading = (
    <>
      {/* <img src="/images/twilio_devs.png" alt="logo" className="w-2/3 mb-10" />*/}
      <img src="/images/twilio.png" alt="logo" className="w-1/3 mb-10" />
      <h1 className={`text-[#EF223A] text-7xl ${myFont.className} `}>
        Builder is a mindset
      </h1>
      <h1 className="text-[#FDF7F4] text-7xl font-medium mt-1">
        not a job title
      </h1>
    </>
  );

  const fieldsWithBets = wedges.map((wedge) => {
    return (
      <div
        key={wedge}
        className={`relative text-[#FDF7F4]  py-3 rounded-full w-full ring-[#FFF1F3] ring-2 shadow-[0px_0px_15px_1px]  shadow-[#FFF1F3]`}
      >
        <span className="text-[6px] absolute bottom-3 left-5">
          {bets.filter((bet) => bet[1] === wedge).length}
        </span>
        {bets
          .filter((bet) => bet[1] === wedge)
          .map((bet, index) => {
            const randomNumberBetween70And110InStepsOf5 =
              70 + Math.floor(Math.random() * ((110 - 70) / 5 + 1)) * 5;
            const randomNumberBetweenMinus120AndMinus160InStepsOf5 =
              -120 - Math.floor(Math.random() * (40 / 5 + 1)) * 5;
            return (
              <img
                key={`bet-${bet[1]}-${index}`}
                src="/images/chip.png"
                alt={`${bet[2]} bet chip on ${bet[1]}`}
                title={`${bet[2]} bets on ${bet[1]}`}
                className={`absolute scale-[0.15] z-10 translate-x-[${randomNumberBetween70And110InStepsOf5}px]  translate-y-[${randomNumberBetweenMinus120AndMinus160InStepsOf5}px]`}
              />
            );
          })}
        {/* Test Chip, bottom-left */}
        {/* <img
                    src="/images/chip.png"
                    alt="bet chip"
                    className="absolute scale-[0.15] z-10 translate-x-[70px]  translate-y-[-120px]"
                  /> */}
        {/* // Test Chip, top-right  */}
        {/* <img
                    src="/images/chip.png"
                    alt="bet chip"
                    className="absolute scale-[0.15] z-10 translate-x-[110px]  translate-y-[-160px]"
                  /> */}
        <span className="text-base ">{wedge}</span>
      </div>
    );
  });

  const verticalLayout = (
    <div className="flex flex-col mt-12 w-full h-full ">
      <div className="flex flex-col text-3xl font-extrabold pb-8 w-4/5 mx-auto">
        {logoAndHeading}
      </div>
      <div className="my-16">
        {spinner}
        <div className="w-4/5 mx-auto grid grid-cols-2 py-20 gap-6 space-around text-center text-xl font-semibold ">
          {fieldsWithBets}
        </div>
      </div>

      <div className="absolute bottom-5  text-gray-500 text-xs mb-2">
        {!hideQrCode && (
          <div className="mx-auto grid grid-cols-3 gap-6 mb-5 mr-12 ">
            <p className="ml-auto my-auto text-right col-span-2 font-extrabold text-4xl text-[#FDF7F4]">
              {CTA}
            </p>
            <div>
              <QRCode
                className="mx-auto w-62 h-62 p-1 bg-[#FDF7F4]"
                value={QR_LINK_URL}
              />
              <p className="text-center text-lg text-gray-500">
                {process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER}
              </p>
            </div>
          </div>
        )}
        <div className="mx-12">{legalText}</div>
      </div>
    </div>
  );

  const horizontalLayout = (
    <>
      <div className="w-1/2 flex flex-col mt-24 relative">
        <div className="flex flex-col text-3xl font-extrabold pb-8 w-9/10 mx-auto">
          {logoAndHeading}
        </div>
        <div className="w-9/10 mx-auto grid grid-cols-2 py-8  gap-7 space-around text-center text-xl font-semibold ">
          {fieldsWithBets}
        </div>
        <div className="absolute bottom-3  text-gray-500 text-xs ml-16 mb-2">
          {legalText}
        </div>
      </div>
      <div className="w-1/2 flex items-center justify-center">
        <div className="absolute pt-14 my-auto w-1/2">
          {spinner}
          {!hideQrCode && (
            <div className="w-2/3 mx-auto grid grid-cols-3 gap-6 ">
              <p className="ml-auto my-auto text-right col-span-2 font-extrabold text-2xl text-[#FDF7F4]">
                {CTA}
              </p>
              <div>
                <QRCode
                  className="mx-auto w-36 h-36 p-1 bg-[#FDF7F4]"
                  value={QR_LINK_URL}
                />
                <p className="text-center text-lg text-gray-500">
                  {process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="vh-full flex h-full">
      {isFull && (
        <div className="absolute z-10 animate-bounce bottom-10 left-1/2 transform -translate-x-1/2 w-8/10">
          <div className="bg-[#F22F46] text-[#FDF7F4] p-2 rounded-lg">
            <p className="text-center">
              Max bets reached. Please spin the wheel!
            </p>
          </div>
        </div>
      )}
      {screenOrientation.includes("landscape")
        ? horizontalLayout
        : verticalLayout}
    </div>
  );
}

export default App;
