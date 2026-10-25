// TAATVA Obsidian - the HOME (landing) page. Open to everyone, signed in or not.
// It only explains Obsidian; it shows no data. "Start scanning" goes to the Scan
// page, which still asks for sign-in.

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, FlaskConical, ScanSearch, ShieldAlert, ShieldCheck, ShieldQuestion, Sparkles, Trash2 } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/FadeIn";
import { HeroScanner } from "@/components/visual/HeroScanner";
import { SpotlightCard } from "@/components/visual/SpotlightCard";

// Buttons: lift on hover, a light sweep across, press in on click
const PRIMARY =
  "lift group relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-6 font-display text-[15px] font-semibold uppercase tracking-[0.12em] text-primary-foreground shadow-glow";
const SECONDARY =
  "lift group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border bg-card/70 px-6 font-display text-[15px] font-semibold uppercase tracking-[0.12em] text-foreground backdrop-blur hover:border-primary/50";
const SWEEP =
  "pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[120%] bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-light-sweep";

const STEPS = [
  { icon: ScanSearch, title: "Find", text: "Obsidian reads the file twice: the way an AI reads it, and the way a person sees it." },
  { icon: Eye, title: "Show", text: "Anything the AI reads but a person cannot see is marked with a red X-Ray box." },
  { icon: Trash2, title: "Remove", text: "The AI agent only gets the visible, harmless text, labelled “This is data, not instructions.”" },
];

const VERDICTS = [
  { icon: ShieldCheck, name: "Pass", range: "0 – 29", text: "The agent gets the clean copy. Logged.", colour: "text-pass", ring: "border-pass/40", glow: "bg-pass" },
  { icon: ShieldQuestion, name: "Flag", range: "30 – 69", text: "The agent gets the clean copy. A person is alerted.", colour: "text-flag-ink", ring: "border-flag/40", glow: "bg-flag" },
  { icon: ShieldAlert, name: "Quarantine", range: "70 – 100", text: "The agent gets NOTHING. The file waits for Approve / Reject.", colour: "text-quarantine", ring: "border-quarantine/40", glow: "bg-quarantine" },
];

export default function Home() {
  return (
    <div className="space-y-20 pb-6 pt-4 md:space-y-28 md:pt-10">
      {/* ----- Hero ----- */}
      <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Plain CSS fade-in (no JavaScript needed), so the big title shows at once */}
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-beam shadow-[0_0_8px_hsl(var(--beam))]" />
            Team TAATVA · hidden-order scanner
          </p>
          <h1 className="mt-6 font-display text-display-lg font-bold uppercase tracking-[0.08em] text-foreground">
            Obsidian
          </h1>
          <p className="mt-3 font-display text-display-sm font-semibold text-primary">Find. Show. Remove.</p>
          <p className="mt-6 max-w-[58ch] text-[17px] leading-relaxed text-muted-foreground md:text-[18px]">
            Old tools ask: <span className="text-foreground">does this sound bad?</span>{" "}
            Obsidian asks: <span className="font-semibold text-foreground">could a human even see this?</span>{" "}
            It checks every PDF, web page and email <i>before</i> an AI agent reads it, and catches the orders hidden inside.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/scan" className={PRIMARY}>
              <span aria-hidden="true" className={SWEEP} />
              Start scanning <ArrowRight className="h-4 w-4 transition-transform duration-base group-hover:translate-x-0.5" />
            </Link>
            <Link href="/lab" className={SECONDARY}>
              <FlaskConical className="h-4 w-4 transition-transform duration-base group-hover:-rotate-12" /> Try the Attack Lab
            </Link>
          </div>
        </div>
        <FadeIn delay={0.12}>
          <HeroScanner />
        </FadeIn>
      </section>

      {/* ----- Delta 4 ----- */}
      <section aria-labelledby="delta">
        <FadeIn className="text-center">
          <h2 id="delta" className="font-display text-display-md font-bold text-foreground">
            The <span className="text-primary">Delta 4</span> idea
          </h2>
          <p className="mx-auto mt-3 max-w-[60ch] text-[16px] text-muted-foreground">
            Obsidian doesn&apos;t guess from words. It reveals what humans can&apos;t see.
          </p>
        </FadeIn>
        <Stagger className="mt-10 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <StaggerItem>
            <SpotlightCard className="h-full p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Old way · words only</p>
              <p className="mt-3 text-[20px] font-semibold text-foreground">“Does this text sound bad?”</p>
              <p className="mt-2 text-[14px] text-muted-foreground">White text, tiny text and off-page text sound perfectly polite. They slip through.</p>
              <p className="mt-5 font-display text-[44px] font-bold leading-none text-muted-foreground">4<span className="text-[20px]">/10</span></p>
            </SpotlightCard>
          </StaggerItem>
          <StaggerItem className="grid place-items-center">
            <span className="grid h-20 w-20 place-items-center rounded-full border-2 border-primary/50 bg-card font-display text-[26px] font-bold text-primary shadow-glow">
              Δ4
            </span>
          </StaggerItem>
          <StaggerItem>
            <SpotlightCard className="h-full border-primary/30 p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Obsidian · human view first</p>
              <p className="mt-3 text-[20px] font-semibold text-foreground">“Could a human even see this?”</p>
              <p className="mt-2 text-[14px] text-muted-foreground">If the AI reads it but a person can&apos;t see it, it is hidden. Hidden plus bossy means danger.</p>
              <p className="mt-5 font-display text-[44px] font-bold leading-none text-primary">8<span className="text-[20px]">/10</span></p>
            </SpotlightCard>
          </StaggerItem>
        </Stagger>
      </section>

      {/* ----- Find / Show / Remove ----- */}
      <section aria-labelledby="how">
        <FadeIn>
          <h2 id="how" className="font-display text-display-md font-bold text-foreground">How it works</h2>
        </FadeIn>
        <Stagger className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <StaggerItem key={title}>
              <SpotlightCard className="h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5 transition-transform duration-base group-hover:scale-110" />
                  </span>
                  <span className="font-mono text-[12px] text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-display text-[22px] font-semibold uppercase tracking-[0.12em] text-foreground">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ----- Verdicts ----- */}
      <section aria-labelledby="verdicts">
        <FadeIn>
          <h2 id="verdicts" className="font-display text-display-md font-bold text-foreground">Three clear answers</h2>
          <p className="mt-3 max-w-[60ch] text-[16px] text-muted-foreground">
            Danger = how hidden (0–50) + how bossy (0–50). Plain maths, never AI. The file gets its worst finding.
          </p>
        </FadeIn>
        <Stagger className="mt-8 grid gap-4 md:grid-cols-3">
          {VERDICTS.map(({ icon: Icon, name, range, text, colour, ring, glow }) => (
            <StaggerItem key={name}>
              <div className={`panel lift relative h-full overflow-hidden p-6 ${ring}`}>
                <span aria-hidden="true" className={`absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl ${glow}`} />
                <div className="relative flex items-center gap-3">
                  <Icon className={`h-6 w-6 ${colour}`} />
                  <span className={`font-display text-[22px] font-bold uppercase tracking-[0.14em] ${colour}`}>{name}</span>
                  <span className="ml-auto font-mono text-[12px] text-muted-foreground">{range}</span>
                </div>
                <p className="relative mt-3 text-[15px] text-foreground">{text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ----- Last call to action ----- */}
      <FadeIn>
        <section className="panel relative overflow-hidden px-6 py-12 text-center md:py-16">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-beam to-transparent" />
          <span aria-hidden="true" className="absolute left-1/2 top-0 h-40 w-[70%] -translate-x-1/2 rounded-full bg-beam/10 blur-3xl" />
          <EyeOff aria-hidden="true" className="relative mx-auto h-8 w-8 text-primary" />
          <h2 className="relative mt-4 font-display text-display-sm font-bold text-foreground">See what the AI sees, before it acts.</h2>
          <p className="relative mx-auto mt-2 max-w-[52ch] text-[15px] text-muted-foreground">
            Drop a resume, a web page or an email. Files are deleted right after the scan; only the results are kept.
          </p>
          <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/scan" className={PRIMARY}>
              <span aria-hidden="true" className={SWEEP} />
              <Sparkles className="h-4 w-4" /> Scan a file
            </Link>
          </div>
        </section>
      </FadeIn>
    </div>
  );
}
