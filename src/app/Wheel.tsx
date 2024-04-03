"use client";

import React, { useState, useEffect } from "react";
import { Wheel } from "react-custom-roulette";

export default ({
  fields,
  onStop,
  afterStart,
}: {
  fields: any[];
  onStop: (number: string) => void;
  afterStart: () => void;
}) => {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const data = fields.map((field) => ({
    option: field.number,
    style: { backgroundColor: field.color, textColor: "white" },
  }));

  const handleSpinClick = () => {
    if (!mustSpin) {
      const newPrizeNumber = Math.floor(Math.random() * data.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
      afterStart();
    }
  };

  return (
    <>
      <Wheel
        mustStartSpinning={mustSpin}
        prizeNumber={prizeNumber}
        data={data}
        onStopSpinning={() => {
          setMustSpin(false);
          onStop(data[prizeNumber].option);
        }}
      />
      <button
        className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded w-28"
        onClick={handleSpinClick}
      >
        Spin
      </button>
    </>
  );
};
