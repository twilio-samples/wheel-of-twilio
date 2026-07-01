import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "twilio",
    "twilio-agent-connect",
    "pino",
    "thread-stream",
  ],
};

export default nextConfig;
