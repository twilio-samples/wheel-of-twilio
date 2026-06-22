import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "sharp",
    "twilio",
    "twilio-agent-connect",
    "pino",
    "thread-stream",
  ],
  outputFileTracingIncludes: {
    "/api/incoming": [
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/@img/sharp-linuxmusl-x64/**/*",
      "./node_modules/@img/sharp-libvips-linuxmusl-x64/**/*",
    ],
  },
};

export default nextConfig;
