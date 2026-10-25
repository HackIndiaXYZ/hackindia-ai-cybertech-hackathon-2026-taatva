"use client";

// TAATVA Obsidian - the calm moving background behind every page ("Forensic Light Table").
// The story without words: a field of very faint letters, like a document. A slow
// scanner beam moves down the screen. Where it passes, the letters light up for a
// moment, and hidden words appear that were not there before. That is Obsidian:
// it shows what a person cannot see.
//
// Safety rules for this file:
// - It only draws pictures. It touches NO app state, no backend, no Supabase.
// - pointer-events: none, so it never blocks a click, a drag, a switch or scrolling.
// - It never uses the verdict colours (green / yellow / red).
// - Smooth: the faint letters are drawn ONCE into a hidden picture; each frame only
//   redraws the few rows under the beam.
// - Pauses while the browser tab is hidden, and goes on at once when it is back.
// - "Reduce motion" on: the beam moves 3x slower and the paper sheets barely drift.

import { useEffect, useRef } from "react";

// Letters that look like code and text
const LETTERS = "abcdefghijklmnopqrstuvwxyz0123456789{}<>/=+-*#:;.";
// Hidden words that only appear under the beam
const HIDDEN = ["find. show. remove.", "could a human see this?", "this is data, not instructions", "hidden text", "delta 4"];

type Sheet = { x: number; y: number; w: number; h: number; speed: number; tilt: number };

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const base = document.createElement("canvas"); // the faint letters, drawn once
    const baseCtx = base.getContext("2d")!;

    let width = 0, height = 0, ratio = 1, cell = 22;
    let cols = 0, rows = 0;
    let grid: string[] = [];          // the letter in each spot ("" = a hidden-word spot)
    let hidden = new Map<number, string>(); // spot number -> hidden letter
    let sheets: Sheet[] = [];
    let colours = { glyph: "", beam: "", dark: false };
    let frame = 0;
    let last = performance.now();
    let beamY = -200;

    // Read the theme colours from the design tokens in globals.css
    function readColours() {
      const style = getComputedStyle(document.documentElement);
      colours = {
        glyph: style.getPropertyValue("--glyph").trim(),
        beam: style.getPropertyValue("--beam").trim(),
        dark: document.documentElement.classList.contains("dark"),
      };
    }

    // Build the letter grid, the hidden words and the paper sheets for this screen size
    function layout() {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      const small = width < 768;
      cell = small ? 28 : 22; // fewer letters on phones
      cols = Math.ceil(width / cell) + 1;
      rows = Math.ceil(height / cell) + 1;
      for (const c of [canvas!, base]) {
        c.width = Math.round(width * ratio);
        c.height = Math.round(height * ratio);
      }
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;

      // A fixed "random" pattern (same every time, so it never jumps on resize)
      let seed = 7;
      const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      grid = Array.from({ length: cols * rows }, () => LETTERS[Math.floor(random() * LETTERS.length)]);

      // Hide a few words in the grid, on rows spread down the screen
      hidden = new Map();
      const wordRows = small ? 4 : 7;
      for (let i = 0; i < wordRows; i++) {
        const word = HIDDEN[i % HIDDEN.length];
        const row = Math.floor(((i + 0.5) / wordRows) * rows);
        const start = Math.floor(random() * Math.max(cols - word.length - 2, 1)) + 1;
        word.split("").forEach((letter, k) => {
          const spot = row * cols + start + k;
          hidden.set(spot, letter);
          grid[spot] = ""; // a blank spot: nothing shows until the beam passes
        });
      }

      // A few faint paper sheets drifting slowly, like documents on a light table
      const count = small ? 2 : 4;
      sheets = Array.from({ length: count }, (_, i) => ({
        x: (i + 0.3) * (width / count) + random() * 60,
        y: random() * height,
        w: small ? 120 : 170 + random() * 60,
        h: small ? 160 : 230 + random() * 60,
        speed: 4 + random() * 5, // pixels per second, very slow
        tilt: (random() - 0.5) * 0.2,
      }));
      drawBase();
    }

    // Draw all the faint letters once into the hidden picture
    function drawBase() {
      readColours();
      baseCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
      baseCtx.clearRect(0, 0, width, height);
      baseCtx.font = `${cell * 0.5}px ui-monospace, "JetBrains Mono", monospace`;
      baseCtx.textAlign = "center";
      baseCtx.textBaseline = "middle";
      baseCtx.fillStyle = `hsl(${colours.glyph} / ${colours.dark ? 0.07 : 0.06})`;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const letter = grid[r * cols + c];
          if (letter) baseCtx.fillText(letter, c * cell + cell / 2, r * cell + cell / 2);
        }
      }
    }

    function draw(now: number) {
      const seconds = Math.min((now - last) / 1000, 0.1); // never jump after a pause
      last = now;
      const slow = calm.matches ? 3 : 1;
      const band = Math.max(height * 0.16, 110); // how tall the beam's glow is

      // Move the beam down; start again at the top. One pass takes ~14 s (42 s calm).
      beamY += ((height + band * 2) / 14 / slow) * seconds;
      if (beamY > height + band) beamY = -band;

      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.drawImage(base, 0, 0);
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);

      // The paper sheets (very faint outlines with a few text lines)
      for (const sheet of sheets) {
        sheet.y -= (sheet.speed / slow) * seconds;
        if (sheet.y + sheet.h < -40) sheet.y = height + 40;
        ctx!.save();
        ctx!.translate(sheet.x, sheet.y);
        ctx!.rotate(sheet.tilt);
        ctx!.strokeStyle = `hsl(${colours.glyph} / ${colours.dark ? 0.1 : 0.09})`;
        ctx!.fillStyle = `hsl(${colours.glyph} / ${colours.dark ? 0.025 : 0.03})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        // Rounded corners where the browser can draw them (older phones: square)
        if ("roundRect" in ctx!) ctx!.roundRect(0, 0, sheet.w, sheet.h, 6);
        else ctx!.rect(0, 0, sheet.w, sheet.h);
        ctx!.fill();
        ctx!.stroke();
        for (let line = 0; line < 7; line++) {
          ctx!.fillRect(16, 22 + line * 22, (sheet.w - 32) * (line % 3 === 2 ? 0.55 : 0.9), 3);
        }
        ctx!.restore();
      }

      // The beam: a soft glowing band with a bright thin line in the middle
      const glow = ctx!.createLinearGradient(0, beamY - band, 0, beamY + band);
      glow.addColorStop(0, `hsl(${colours.beam} / 0)`);
      glow.addColorStop(0.5, `hsl(${colours.beam} / ${colours.dark ? 0.07 : 0.06})`);
      glow.addColorStop(1, `hsl(${colours.beam} / 0)`);
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, beamY - band, width, band * 2);
      ctx!.fillStyle = `hsl(${colours.beam} / ${colours.dark ? 0.35 : 0.3})`;
      ctx!.fillRect(0, beamY - 0.5, width, 1);

      // Letters under the beam light up; the hidden words appear.
      // The light fades smoothly with distance (no flashing).
      ctx!.font = `${cell * 0.5}px ui-monospace, "JetBrains Mono", monospace`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      const first = Math.max(Math.floor((beamY - band) / cell), 0);
      const lastRow = Math.min(Math.ceil((beamY + band) / cell), rows - 1);
      for (let r = first; r <= lastRow; r++) {
        const y = r * cell + cell / 2;
        const light = 1 - Math.min(Math.abs(y - beamY) / band, 1); // 1 at the beam, 0 at the edge
        if (light <= 0) continue;
        const eased = light * light;
        for (let c = 0; c < cols; c++) {
          const spot = r * cols + c;
          const secret = hidden.get(spot);
          const letter = secret ?? grid[spot];
          if (!letter || letter === " ") continue;
          const alpha = secret ? eased * (colours.dark ? 0.75 : 0.65) : eased * (colours.dark ? 0.22 : 0.18);
          ctx!.fillStyle = `hsl(${colours.beam} / ${alpha})`;
          ctx!.fillText(letter, c * cell + cell / 2, y);
        }
      }
      frame = requestAnimationFrame(draw);
    }

    function start() {
      cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(draw);
    }
    // Pause while the tab is hidden, go on at once when it is shown again
    function visibility() {
      if (document.hidden) cancelAnimationFrame(frame);
      else start();
    }
    // Light / dark switch: redraw the faint letters in the new colours
    const themeWatch = new MutationObserver(drawBase);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let resizeTimer = 0;
    function resized() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layout, 120);
    }

    layout();
    start();
    window.addEventListener("resize", resized);
    document.addEventListener("visibilitychange", visibility);

    // Clean up everything when the component goes away
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", resized);
      document.removeEventListener("visibilitychange", visibility);
      themeWatch.disconnect();
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* A soft veil over the animation, so text on top is always easy to read */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--background)/0.55),hsl(var(--background)/0.15)_70%)]" />
    </div>
  );
}
