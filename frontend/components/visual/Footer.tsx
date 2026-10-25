// TAATVA Obsidian - the footer at the bottom of every page (pictures and words only).

export function Footer() {
  return (
    <footer className="relative border-t border-border/70 bg-background/60 backdrop-blur">
      {/* A thin beam line along the top edge */}
      <span aria-hidden="true" className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-beam/60 to-transparent" />
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-2 px-4 py-6 text-center sm:flex-row sm:text-left md:px-8">
        <p className="font-display text-[13px] font-semibold uppercase tracking-[0.22em] text-foreground">
          Find. Show. Remove.
        </p>
        <p className="text-[13px] text-muted-foreground">
          Old tools ask: does this sound bad? Obsidian asks: could a human even see this?
        </p>
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground">
          Built by team <span className="text-primary">TAATVA</span>
        </p>
      </div>
    </footer>
  );
}
