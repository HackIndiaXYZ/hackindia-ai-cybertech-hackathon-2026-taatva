// TAATVA Obsidian - the app manifest: the name and the "X-Ray Eye" icons a phone uses
// when someone adds Obsidian to their home screen. Served at /manifest.webmanifest.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Obsidian by TAATVA",
    short_name: "Obsidian",
    description: "Find, show and remove hidden instructions before an AI agent reads a file.",
    start_url: "/",
    display: "standalone",
    background_color: "#07080A",
    theme_color: "#07080A",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/obsidian-logo.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
