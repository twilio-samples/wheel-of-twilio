"use client";
import { useState, useEffect } from "react";

const getOrientation = () => {
  if (typeof window !== "undefined") {
    return window.innerWidth >= window.innerHeight ? "landscape-primary" : "portrait-primary";
  }
  return "landscape-primary";
};

export const useScreenOrientation = () => {
  const [orientation, setOrientation] = useState(getOrientation());

  useEffect(() => {
    setOrientation(getOrientation());
    const handleOrientationChange = () => setOrientation(getOrientation());

    window.addEventListener("resize", handleOrientationChange);

    return () => window.removeEventListener("resize", handleOrientationChange);
  }, []);

  return orientation;
};
