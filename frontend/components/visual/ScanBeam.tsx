// TAATVA Obsidian - the scanner beam that slides over a box while a file is being checked.
// Pictures only: it does not know or change anything about the real scan.
// Put it inside a box that has "relative overflow-hidden".
// With "reduce motion" on, the beam stands still in the middle (no sliding).

export function ScanBeam() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-beam-sweep motion-reduce:animate-none">
      {/* The soft glow band with a bright line in its middle */}
      <span className="absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 bg-gradient-to-b from-transparent via-beam/15 to-transparent" />
      <span className="absolute inset-x-0 top-1/2 h-px bg-beam shadow-[0_0_12px_hsl(var(--beam))]" />
    </span>
  );
}
