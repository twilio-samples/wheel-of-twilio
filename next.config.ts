import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "sharp",
    "twilio",
    "twilio-agent-connect",
    "pino",
    "thread-stream",
  ],
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/@img/sharp-linuxmusl-*/**/*",
      "./node_modules/@img/sharp-libvips-linuxmusl-*/**/*",
      "./node_modules/@img/sharp-darwin-*/**/*",
      "./node_modules/@img/sharp-libvips-darwin-*/**/*",
      "./node_modules/@img/sharp-win32-*/**/*",
      "./node_modules/@img/sharp-freebsd-*/**/*",
    ],
  },
};

export default nextConfig;
