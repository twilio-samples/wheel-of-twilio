// Copyright 2024 Twilio Inc.

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wheel of Twilio",
  description: "Powered by Twilio and Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full" lang="en">
      <head>
        <link
          rel="icon"
          href="https://www.twilio.com/content/dam/twilio-com/core-assets/social/favicon-32x32.png"
          sizes="any"
        />
      </head>
      <body className={"h-full overflow-hidden " + inter.className}>
        <div
          style={{
            backgroundColor: "#000D25",
          }}
          className="vh-full h-full "
        >
          {children}
        </div>
      </body>
    </html>
  );
}
