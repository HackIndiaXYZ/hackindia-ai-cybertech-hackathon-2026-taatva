import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // dark mode turns on when <html> has class="dark"
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: "hsl(var(--destructive))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Verdict colours
        pass: "hsl(var(--pass))",
        flag: "hsl(var(--flag))",
        "flag-ink": "hsl(var(--flag-ink))", // yellow for words (darker in light mode)
        quarantine: "hsl(var(--quarantine))",
        // The "beam" accent: steel white (dark) / graphite (light). Never cyan, never purple.
        beam: "hsl(var(--beam) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      // Design round 2: SHARP. Every corner size is 0 (no pills, no bubbly shapes).
      // The class names stay the same, only their value changes, so nothing breaks.
      // "hairline" = 2px, only where a hard corner would look broken.
      borderRadius: {
        none: "0px",
        sm: "var(--radius)",
        DEFAULT: "var(--radius)",
        md: "var(--radius)",
        lg: "var(--radius)",
        xl: "var(--radius)",
        "2xl": "var(--radius)",
        "3xl": "var(--radius)",
        full: "var(--radius)",
        hairline: "2px",
      },
      // ----- Design tokens (the values live in globals.css) -----
      // Spacing scale (design round 2): one page width, one side gutter, one gap between blocks
      maxWidth: {
        content: "var(--content-max)", // 1440px, 1600px on very wide screens
      },
      spacing: {
        gutter: "var(--gutter)", // page side padding: 16px phones, 32px tablets and up
        stack: "var(--stack)",   // gap between blocks on a page: 24px
      },
      boxShadow: {
        e1: "var(--shadow-1)", // resting card
        e2: "var(--shadow-2)", // hovered card / button
        e3: "var(--shadow-3)", // floating panels, menus
        glow: "var(--shadow-glow)", // soft beam glow
      },
      // Headings that grow smoothly with the screen (phone -> big screen)
      fontSize: {
        "display-sm": ["clamp(1.5rem, 1.1rem + 1.6vw, 2rem)", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "display-md": ["clamp(2rem, 1.3rem + 3vw, 3rem)", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2.5rem, 1.4rem + 5vw, 4.5rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
      },
      transitionTimingFunction: {
        "out-soft": "var(--ease-out)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)", // a small bounce at the end (switch knob)
      },
      transitionDuration: {
        fast: "150ms",
        base: "250ms",
        slow: "400ms",
      },
      keyframes: {
        // The scanner beam sliding down (scanning state, X-Ray sweep)
        // (the beam line sits in the middle of a full-size layer, so -50%..50% = top edge to bottom edge)
        "beam-sweep": {
          "0%": { transform: "translateY(-50%)", opacity: "0" },
          "8%": { opacity: "1" },
          "92%": { opacity: "1" },
          "100%": { transform: "translateY(50%)", opacity: "0" },
        },
        // X-Ray switched on: ONE beam pass over the page (then it is gone)
        "xray-sweep": {
          "0%": { transform: "translateY(-50%)", opacity: "1" },
          "85%": { opacity: "1" },
          "100%": { transform: "translateY(50%)", opacity: "0" },
        },
        // X-Ray boxes appear with a quick glow flash, then settle
        "xray-box": {
          "0%": { opacity: "0", transform: "scale(1.25)", boxShadow: "0 0 0 0 hsl(var(--quarantine) / 0)" },
          "60%": { opacity: "1", transform: "scale(1)", boxShadow: "0 0 22px 4px hsl(var(--quarantine) / 0.7)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // A light sweep across buttons on hover
        "light-sweep": {
          "0%": { transform: "translateX(-120%) skewX(-20deg)" },
          "100%": { transform: "translateX(220%) skewX(-20deg)" },
        },
      },
      animation: {
        "beam-sweep": "beam-sweep 2.2s cubic-bezier(0.45, 0, 0.55, 1) infinite",
        "light-sweep": "light-sweep 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
        "xray-sweep": "xray-sweep 0.8s cubic-bezier(0.45, 0, 0.55, 1) forwards",
        "xray-box": "xray-box 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
