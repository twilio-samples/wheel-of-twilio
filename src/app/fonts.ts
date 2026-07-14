// Shared type tokens for the /stats and /winners back-of-house screens.
// Display face matches the main wheel screen's brand font; the mono face
// gives tabular data (odds, ticket numbers) a tote-board/ticket-printer feel.
import { IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";

export const displayFont = localFont({
  src: "../../public/fonts/BFBuffalo-Black.otf",
  weight: "900",
});

export const dataFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
