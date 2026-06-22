import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["twilio", "twilio-agent-connect", "pino", "thread-stream"],
};

export default nextConfig;
