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
  const wheelRef = useRef<any>();
  const [state] = useState({ winnerAngle: 0 });

  useLayoutEffect(() => {
    const renderWheel = () => {
      if (document.visibilityState === "visible") {
        var wheelCanvas = document.getElementById("wheel");
        if (wheelCanvas && isCanvas(wheelCanvas)) {
          var wheel = wheelCanvas.getContext("2d");
          var wheelX = wheelCanvas.width / 2;
          // wheelCanvas.style.width = wheelCanvas.width + "px";
          var wheelY = wheelCanvas.height / 2;

          // wheelCanvas.style.height = wheelCanvas.height + "px";
          var wheelRadius = Math.min(wheelX, wheelY);

          drawWheel(wedges, wheel, wheelX, wheelY, wheelRadius);
        }
      }
    };
    renderWheel();
    document.addEventListener("visibilitychange", renderWheel);

    return () => document.removeEventListener("visibilitychange", renderWheel);
  }, [wedges]);
  function isCanvas(
    obj: HTMLCanvasElement | HTMLElement,
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
    wheelY: number,
    wheelRadius: number,
  ) => {
    var segment = 360 / list.length;

    list.map((el: string, i: number) => {
      wheel.save();
      wheel.translate(wheelX, wheelY);
      wheel.rotate(degToRad(segment * i));
      wheel.translate(-wheelX, -wheelY);

      wheel.fillStyle = i % 2 === 0 ? "#ea4638" : "#5e1718";

      wheel.beginPath();
      wheel.moveTo(wheelX, wheelY);
      wheel.arc(
        wheelX,
        wheelY,
        wheelRadius,
        0 - degToRad(90) - degToRad(segment / 2),
        degToRad(segment) - degToRad(90) - degToRad(segment / 2),
        false,
      );
      wheel.moveTo(wheelX, wheelY);
      wheel.fill();

      wheel.fillStyle = i % 2 === 0 ? "#FDF7F4" : "#121C2D";
      wheel.textAlign = "end";
      wheel.font = "2.5rem sans-serif";
      wheel.transform = "translate(50px, 100px)";
      wheel.rotate(-1.57);
      wheel.fillStyle = "white";
      wheel.fillText(el, -25, wheelY + 10);

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
        <div className="rounded-full min-h-[562.5px]  min-w-[562.5px] overflow-hidden relative">
          <canvas
            ref={wheelRef}
            id="wheel"
            className="rounded-full p-1  h-[550px] w-[550px]  m-[6px] absolute "
            width="840px"
            height="840px"
          />
          <span
            id="spinButton"
            className="absolute flex top-[50%] left-[50%] z-10 bg-[#000D25] w-[120px] h-[120px] cursor-pointer p-2 border-solid border-4 border-black rounded-full -translate-x-1/2 -translate-y-1/2"
            onClick={handleSpin}
          >
            <img
              src="/images/twilio-bug-white.png"
              className="pl-0.5 pt-0.5"
              alt="twilio"
            />
          </span>
        </div>
        <span className="absolute left-[50%] translate-x-[-30%] translate-y-[-290%] ">
          <img src="/images/stopper.png" alt="stopper" height="50px" />
        </span>
      </div>
    </div>
  );
}
