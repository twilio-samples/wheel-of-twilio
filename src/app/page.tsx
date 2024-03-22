"use client";

import { useState, useEffect } from "react";
import { Client, SyncClient } from "twilio-sync";
import dynamic from "next/dynamic";
import { fetchToken, callWinners, messageLosers } from "./twilio";
import QRCode from "react-qr-code";
const NoSSRWheel = dynamic(() => import("./Wheel"), { ssr: false });

function App() {
  const [bets, setBets] = useState<any[]>([]);
  const [doc, setDoc] = useState<any>({});

  const fields = [
    {
      number: "1",
      color: "green",
    },
    {
      number: "2",
      color: "red",
    },
    {
      number: "3",
      color: "green",
    },
    {
      number: "4",
      color: "red",
    },
    {
      number: "5",
      color: "green",
    },
    {
      number: "6",
      color: "red",
    },
  ];

  useEffect(() => {
    let syncClient: SyncClient;
    fetchToken().then(async (token) => {
      syncClient = new Client(token);
      syncClient.on("tokenAboutToExpire", async () => {
        const token = await fetchToken();
        syncClient.updateToken(token);
      });
      syncClient.on("connectionStateChanged", async (state: string) => {
        if (state === "connected") {
          const doc = await syncClient.document("wheel_entries");
          setDoc(doc);
          doc.on("updated", (event: any) => {
            setBets(Object.values(event.data.bets));
          });
          // @ts-ignore
          setBets(Object.values(doc.data.bets));
        }
      });
    });

    return () => {
      syncClient && syncClient.shutdown();
    };
  }, []);

  return (
    <div className="App">
      <div className="fixed z-10">
        <QRCode
          value={`https://wa.me/${process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER}?text=Hit send to start!`}
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-b w-full"
          onClick={() => {
            doc.update({
              bets: {},
              blocked: false,
            });
          }}
        >
          Reset Bets
        </button>
      </div>
      <div className="absolute w-full h-2/3 flex flex-col items-center justify-center">
        <NoSSRWheel
          fields={fields}
          afterStart={() => {}}
          onStop={(number: string) => {
            callWinners(bets.filter((bet) => bet.bet === number));
            messageLosers(bets.filter((bet) => bet.bet !== number));

            // TODO Show number or names of winners

            doc.update({
              bets: {},
              blocked: false,
            });
          }}
        />
      </div>
      <div className="absolute w-full h-1/3 bottom-0 flex items-center justify-center">
        {fields.map((field) => (
          <div
            key={field.number}
            className={`bg-${field.color}-500 h-full flex-1 m-0.5 rounded-lg p-8`}
          >
            <h1 className="text-2xl text-black text-center">
              Bet on {field.number}
            </h1>
            <div className="mt-4 grid grid-cols-5">
              {bets
                .filter((bet) => bet.bet === field.number)
                .map((bet) => (
                  <div
                    key={bet.sender}
                    title={bet.name}
                    className="bg-black rounded-full w-8 h-8 animate-pulse m-2"
                  />
                ))}
              {}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
