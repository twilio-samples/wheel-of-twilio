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
const NoSSRWheel = dynamic(() => import("./Wheel"), { ssr: false });

function App() {
  const [bets, setBets] = useState<any[]>([]);
  const [doc, setDoc] = useState<any>({});

  const wedges = (process.env.NEXT_PUBLIC_WEDGES || "")
    .split(",")
    .map((wedge, idx) => {
      return {
        name: wedge,
        color: idx % 2 === 0 ? "red" : "green",
      };
    });

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
    <div className="App">
      <div className="fixed z-10">
        <QRCode
          value={`https://wa.me/${process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER}?text=Hit%20send%20to%20start!`}
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-b w-full"
          onClick={() => {
            clearBets();
          }}
        >
          Reset Bets
        </button>
      </div>
      <div className="absolute w-full h-2/3 flex flex-col items-center justify-center">
        <NoSSRWheel
          wedges={wedges}
          afterStart={() => {
            blockBets();
          }}
          onStop={(wedge: string) => {
            const winners = bets.filter((bet) => bet.bet === wedge);
            callWinners(winners);
            messageOthers(
              bets.filter((bet) => bet.bet !== wedge),
              wedge,
            );

            let annoucement = `Winning wedge is ${wedge} and we got ${winners.length} winners.`;
            if (winners.length > 0) {
              annoucement += "The winners are: ";
              winners.forEach((winner) => {
                annoucement += `${winner.name}, `;
              });
            }

            alert(annoucement);

            clearBets();
          }}
        />
      </div>
      <div className="absolute w-full h-1/3 bottom-0 flex items-center justify-center">
        {wedges.map((wedge) => (
          <div
            key={wedge.name}
            className={`bg-${wedge.color}-500 h-full flex-1 m-0.5 rounded-lg py-8`}
          >
            <h1 className="text-2xl text-black text-center">{wedge.name}</h1>
            <div className="mt-4 grid grid-cols-5">
              {bets
                .filter((bet) => bet.bet === wedge.name)
                .map((bet) => (
                  <div
                    key={bet.hashedSender}
                    title={bet.name}
                    className="bg-black rounded-full w-6 h-6 animate-pulse m-2 placed-bet"
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
