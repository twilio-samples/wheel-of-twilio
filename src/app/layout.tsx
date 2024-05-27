import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wheel of Fortune",
  description: "Build by Twilio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full" lang="en">
      <body className={"h-full " + inter.className}>
        <div
          style={{
            backgroundColor: "#121C2D",
            backgroundSize: "60px 60px",
            backgroundImage:
              "linear-gradient(to right, darkgray 1px, transparent 1px), linear-gradient(to bottom, dimgray 1px, transparent 1px)",
          }}
          className="vh-full h-full "
        >
          <img
            src="/images/ConfettiLeft.svg"
            alt="confetti left"
            className="absolute top-0 left-0"
          />
          <img
            src="/images/TwilioCircle.svg"
            alt="asteriks"
            className="absolute top-0 left-0"
          />
          <img
            src="/images/ConfettiRight.svg"
            alt="confetti right"
            className="absolute top-0 left-0"
          />
     
          <div className="absolute top-0 left-0 w-full">
            {/* needed because chrome won't render <image> in SVGs */}
            <img
              src="/images/twilio_devs.png"
              alt="logo"
              className="w-1/4 mx-auto"
            />
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
