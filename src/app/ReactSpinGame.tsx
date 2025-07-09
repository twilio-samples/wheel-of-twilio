// Copyright 2024 Twilio Inc.

import { useRef, useState, useLayoutEffect } from "react";

interface SpinGameData {
  wedges: string[];
  time?: number;
  minTime?: number;
  maxTime?: number;
  onAfterStarted: () => void;
  onAfterFinished: (selectedWedge: string) => void;
}

export default function SpinAndWin({
  wedges,
  time,
  minTime,
  maxTime,
  onAfterFinished,
  onAfterStarted,
}: SpinGameData) {
  const wheelRef = useRef<any>(undefined);
  const [state] = useState({ winnerAngle: 0 });

  useLayoutEffect(() => {
    const renderWheel = () => {
      if (document.visibilityState === "visible") {
        var wheelCanvas = document.getElementById("wheel");
        if (wheelCanvas && isCanvas(wheelCanvas)) {
          var wheel = wheelCanvas.getContext("2d");
          wheel?.reset();
          var wheelX = wheelCanvas.width / 2;
          var wheelY = wheelCanvas.height / 2;

          drawWheel(wedges, wheel, wheelX, wheelY);
        }
      }
    };
    renderWheel();
    document.addEventListener("visibilitychange", renderWheel);

    return () => document.removeEventListener("visibilitychange", renderWheel);
  }, [wedges]);
  function isCanvas(
    obj: HTMLCanvasElement | HTMLElement
  ): obj is HTMLCanvasElement {
    return obj.tagName === "CANVAS";
  }
  const degToRad = (deg: number) => {
    return (deg * Math.PI) / 180.0;
  };
  const drawWheel = (
    list: string[],
    wheel: any,
    wheelX: number,
    wheelY: number
  ) => {
    wheel.fillStyle = "#000D25";
    wheel.strokeStyle = "#FFF";
    wheel.lineWidth = 3;

    var segment = 360 / list.length;
    list.forEach((el: string, i: number) => {
      wheel.save();
      wheel.translate(wheelX, wheelY);

      // Rotate the canvas to the correct segment position
      wheel.rotate(degToRad(segment * i));
      wheel.translate(-wheelX, -wheelY);

      wheel.lineTo(wheelX, wheelY);
      wheel.lineTo(-wheelX, 0);
      wheel.stroke();

      // Fill the segment with alternating colors
      wheel.textAlign = "end";
      wheel.font = "2.3rem sans-serif";
      wheel.transform = "translate(50px, 100px)";
      wheel.rotate(-1.57);

      wheel.fillStyle = "white";
      wheel.fillText(el, -45, wheelY + 10);

      wheel.restore();
    });
  };

  const handleSpin = () => {
    onAfterStarted();
    let wheelCanvas = document.getElementById("wheel");
    if (wheelCanvas) {
      let transitionTime = time
        ? time
        : minTime && maxTime && minTime > 0 && maxTime > 0
          ? Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime
          : Math.floor(Math.random() * (4 - 3 + 1)) + 3;
      wheelCanvas.style.transition = transitionTime + "s";

      let winnerIndex = Math.floor(Math.random() * wedges.length);
      let offset = state.winnerAngle % 360;
      state.winnerAngle =
        state.winnerAngle + 2520 - (360 * winnerIndex) / wedges.length - offset;
      let deg = "rotate(" + state.winnerAngle + "deg)";
      wheelCanvas.style.transform = deg;
      setTimeout(() => {
        onAfterFinished(wedges[winnerIndex]);
      }, transitionTime * 1000);
    }
  };
  return (
    <div>
      <div className="m-0 p-0 flex justify-center items-center h-full relative">
        <div className="rounded-full min-h-[750px]  min-w-[750px] overflow-hidden relative">
          <canvas
            ref={wheelRef}
            id="wheel"
            className="rounded-full  h-[737px] w-[737px]  m-[6px] absolute   shadow-[0px_0px_30px_5px]  shadow-[#EF223A] "
            width="1000px"
            height="1000px"
          />
          <span
            id="spinButton"
            className="absolute flex top-[50%] left-[50%] z-10 bg-[#EF223A] shadow-[0px_0px_33px_30px]  shadow-[#EF223A] w-[70px] h-[70px] cursor-pointer p-2  rounded-full -translate-x-1/2 -translate-y-1/2"
            onClick={handleSpin}
          >
            <img
              src="/images/twilio-bug-white.png"
              className="pl-0.5 pt-0.5 rounded-full bg-green "
              alt="twilio"
            />
          </span>
        </div>
        <span className="absolute left-[50%] translate-x-[-50%] translate-y-[-530%] ">
          <img src="/images/stopper.png" alt="stopper" height="50px" />
        </span>
      </div>
    </div>
  );
}
