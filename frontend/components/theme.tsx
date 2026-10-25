"use client";

// TAATVA Obsidian - the light / dark mode switch (top-right of the header).
// The choice is saved in this browser (localStorage), so it stays after a refresh.
// If nothing is saved yet, we follow the computer's own light/dark setting.

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "obsidian-theme";

// Runs before the page is drawn, so the page never flashes the wrong colours
export const THEME_SCRIPT = `
try {
  var saved = localStorage.getItem("${KEY}");
  var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
} catch (e) {}
`;

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // Read the theme the script above already chose
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  function flip() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={flip}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="lift group grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-card/70 text-foreground hover:border-primary/40 md:h-9 md:w-9"
    >
      {/* The icon turns a little on hover */}
      {dark
        ? <Sun className="h-4 w-4 transition-transform duration-slow ease-out-soft group-hover:rotate-45" />
        : <Moon className="h-4 w-4 transition-transform duration-slow ease-out-soft group-hover:-rotate-12" />}
    </button>
  );
}
