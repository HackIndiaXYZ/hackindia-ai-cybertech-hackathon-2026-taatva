import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Oswald } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { SettingsProvider } from "@/components/settings";
import { THEME_SCRIPT } from "@/components/theme";
import { UpdateBar } from "@/components/update-check";

// Three fonts: bold tall letters for titles, a clean font for reading,
// and a "typewriter" font for file names and technical tags.
// Only the weights we use (each weight is one more file to download on phones)
const display = Oswald({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
// The "typewriter" font is only used for small tags: it may load a moment later (faster first view on phones)
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", preload: false });

export const metadata: Metadata = {
  title: "Obsidian by TAATVA",
  description: "Find, show and remove hidden instructions before an AI agent reads a file.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the theme script changes <html> before React starts
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${display.variable} ${sans.variable} ${mono.variable}`}>
        <SettingsProvider>
          <Header />
          <UpdateBar />
          <main className="mx-auto max-w-[1440px] px-3 pb-16 pt-4 sm:px-4 md:px-8 md:pt-6">{children}</main>
        </SettingsProvider>
      </body>
    </html>
  );
}
