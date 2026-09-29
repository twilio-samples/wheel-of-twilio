"use client";

import { useEffect, useState } from "react";

function formatAgo(ms: number): string {
  if (ms < 0) return "just now";
  const sec = Math.max(1, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function ClearedAgo({ timestamp }: { timestamp: number }) {
  const [now, setNow] = useState(timestamp);
  const [absolute, setAbsolute] = useState("");

  useEffect(() => {
    setNow(Date.now());
    setAbsolute(new Date(timestamp).toLocaleString());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [timestamp]);

  return <span title={absolute}>{formatAgo(now - timestamp)}</span>;
}
