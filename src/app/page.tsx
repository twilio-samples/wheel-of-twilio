"use client";

import { useState, useEffect } from "react";
import { Client, SyncClient } from "twilio-sync";
import dynamic from "next/dynamic";
import {
  fetchToken,
  callWinners,
  messageOthers,
  clearBets,
  blockBets,
} from "./twilio";
import QRCode from "react-qr-code";

function App() {
  const [bets, setBets] = useState<any[]>([]);
  const [doc, setDoc] = useState<any>({});

  const wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");

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
          const doc = await syncClient.document("bets");
          setDoc(doc);
          doc.on("updated", (event: any) => {
            if (event.data.bets) setBets(Object.values(event.data.bets));
          });

          // @ts-ignore
          if (doc.data.bets) setBets(Object.values(doc.data.bets));
        }
      });
    });

    return () => {
      syncClient && syncClient.shutdown();
    };
  }, []);

  return (
    <div className="vh-full flex h-full">
      <div className="w-1/2 flex  item justify-center relative">
        <img
          src="/images/Wheel.svg"
          alt="wheel frame"
          className="w-5/12 mx-auto fixed top-44"
        />
        <img
          src="/images/Stopper.svg"
          alt="stopper"
          className="w-14 mx-auto fixed top-48"
        />

        {/* <div className=" h-[400px] w-[400px] rounded-full bg-[#F22F46] flex items-center animate-spin ani justify-center">
          Hello me
        </div> */}

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
        <div className="absolute my-auto w-1/2">
          <div className="flex flex-col text-3xl font-extrabold pb-8 w-2/3 mx-auto">
            <h1 className="text-[#FDF7F4]">Better communication</h1>
            <h1 className="text-[#F2BE5A]">in the blink of an API</h1>
          </div>
          <div className="w-2/3 mx-auto grid grid-cols-2 pb-8  gap-4 space-around text-center text-xl font-semibold ">
            {wedges.map((wedge, index) => {
              const isRed = Math.floor((index - 1) / 2) % 2 === 0;
              return (
                <div
                  key={wedge}
                  className={`relative ${isRed ? "bg-[#F22F46]" : "bg-[#FDF7F4]"} ${
                    isRed ? "text-[#FDF7F4]" : "text-[#121C2D]"
                  } py-5 rounded-t-lg w-full`}
                >
                  {Object.values(bets)
                    .filter((bet) => bet.bet === wedge)
                    .map((bet, index) => {
                      console.log(bet);
                      return (
                        <img
                          key={`bet-${bet.bet}-${index}`}
                          src="/images/Chip.png"
                          alt="bet chip"
                          className={`absolute scale-[0.25] z-10 translate-x-[${Math.floor(Math.random() * 40 + 70)}px]  translate-y-[-${Math.floor(Math.random() * 40 + 70)}px]`}
                        />
                      );
                    })}
                  {/* Test Chip, bottom-left */}
                  {/* <img
                    src="/images/Chip.png"
                    alt="bet chip"
                    className="absolute scale-[0.25] z-10 translate-x-[70px]  translate-y-[-70px]"
                  />
                  // Test Chip, top-right 
                  <img
                    src="/images/Chip.png"
                    alt="bet chip"
                    className="absolute scale-[0.25] z-10 translate-x-[110px]  translate-y-[-110px]"
                  /> */}
                  {wedge}
                </div>
              );
            })}
          </div>
          <div className="w-2/3 mx-auto grid grid-cols-2 gap-6 ">
            <span className="ml-auto text-right w-2/3 font-extrabold text-xl">
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

export default App;
