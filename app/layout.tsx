import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { Analytics } from "@vercel/analytics/next";

const description =
  "A free Wordle-style word game. Guess the hidden five-letter word - a new random word every game.";

export const metadata: Metadata = {
  metadataBase: new URL("https://notwordle.app"),
  title: {
    default: "Not Wordle",
    template: "%s | Not Wordle",
  },
  description,
  applicationName: "Not Wordle",
  openGraph: {
    title: "Not Wordle",
    description,
    url: "/",
    siteName: "Not Wordle",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Not Wordle",
    description,
  },
};

// browser UI color on mobile (address bar) + tells the browser the page is dark
export const viewport: Viewport = {
  themeColor: "#121213",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">{children}</body>
      <Analytics />
    </html>
  );
}
