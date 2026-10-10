import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Oswald } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { SettingsProvider } from "@/components/settings";

// Three fonts: bold tall letters for titles, a clean font for reading,
// and a "typewriter" font for file names and technical tags.
const display = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Obsidian by TAATVA",
  description: "Find, show and remove hidden instructions before an AI agent reads a file.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} ${mono.variable}`}>
        <SettingsProvider>
          <Header />
          <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 md:px-8">{children}</main>
        </SettingsProvider>
      </body>
    </html>
  );
}
