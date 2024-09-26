// Copyright 2024 Twilio Inc.

"use client";

import { useState, useEffect } from "react";
import { Client, SyncClient } from "twilio-sync";
import {
  fetchToken,
  notifyAndUpdateWinners,
  messageOthers,
  unblockGame,
  blockGame,
} from "./twilio";
import SpinAndWin from "./ReactSpinGame";
import QRCode from "react-qr-code";

function App() {
  const [bets, setBets] = useState<any[]>([]);
  const [isFull, setIsFull] = useState(false);

  let wedges = (process.env.NEXT_PUBLIC_WEDGES || "").split(",");

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

  return (
    <div className="vh-full flex h-full">
      {isFull && (
        <div className="absolute z-10 animate-bounce bottom-10 left-1/2 transform -translate-x-1/2">
          <div className="bg-[#F22F46] text-[#FDF7F4] p-2 rounded-lg">
            <p className="text-center">Game is full!</p>
          </div>
        </div>
      )}
      <div className="w-1/2 flex  item justify-center relative">
        <SpinAndWin
          wedges={wedges}
          time={3}
          onAfterStarted={() => {
            blockGame();
          }}
          onAfterFinished={(selectedWedge: string) => {
            // selectedWedge = "Java" to test the winning condition
            notifyAndUpdateWinners(
              bets.filter((bet) => bet[1] === selectedWedge)
            );
            messageOthers(
              bets.filter((bet) => bet[1] !== selectedWedge),
              selectedWedge
            );
            unblockGame();
          }}
        />
        <div className="absolute bottom-3  text-gray-500 text-xs ml-16">
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
          <p className="">
            Twilio employees and government officials are not eligible to win.
          </p>
        </div>
      </div>
      <div className="w-1/2 flex items-center justify-center">
        <div className="absolute pt-14 my-auto w-1/2">
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
                  <span className="text-[6px] absolute bottom-0 left-1">
                    {bets.filter((bet) => bet[1] === wedge).length}
                  </span>
                  {bets
                    .filter((bet) => bet[1] === wedge)
                    .map((bet, index) => {
                      const randomNumberBetween70And110InStepsOf5 =
                        70 +
                        Math.floor(Math.random() * ((110 - 70) / 5 + 1)) * 5;
                      const randomNumberBetweenMinus100AndMinus140InStepsOf5 =
                        -100 -
                        Math.floor(Math.random() * ((140 - 100) / 5 + 1)) * 5;

                      return (
                        <img
                          key={`bet-${bet[1]}-${index}`}
                          src="/images/chip.png"
                          alt={`${bet[2]} bet chip on ${bet[1]}`}
                          title={`${bet[2]} bets on ${bet[1]}`}
                          className={`absolute scale-[0.25] z-10 translate-x-[${randomNumberBetween70And110InStepsOf5}px]  translate-y-[${randomNumberBetweenMinus100AndMinus140InStepsOf5}px]`}
                        />
                      );
                    })}
                  {/* Test Chip, bottom-left */}
                  {/* <img
                    src="/images/chip.png"
                    alt="bet chip"
                    className="absolute scale-[0.25] z-10 translate-x-[70px]  translate-y-[-100px]"
                  /> */}
                  {/* // Test Chip, top-right  */}
                  {/* <img
                    src="/images/chip.png"
                    alt="bet chip"
                    className="absolute scale-[0.25] z-10 translate-x-[110px]  translate-y-[-140px]"
                  /> */}
                  {wedge}
                </div>
              );
            })}
          </div>
          <div className="w-2/3 mx-auto grid grid-cols-2 gap-6 ">
            <p className="ml-auto my-auto text-right w-2/3 font-extrabold text-xl text-[#FDF7F4]">
              Scan the code and win prizes
            </p>
            <div>
              <QRCode
                className="mx-auto w-36 h-36 p-1 bg-[#FDF7F4]"
                value={`https://wa.me/${process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER}?text=Hit%20send%20to%20start!`}
              />
              <p className="text-center text-s text-gray-500">
                {process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
