// TAATVA Obsidian - the VERDICT card: a big gauge with the danger score,
// the verdict banner, plain reasons, and the "how hidden / how bossy" bar.

import { Info, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { ScanResult } from "@/lib/api";
import { BOSSY_TIP, HIDDEN_TIP, VERDICT_MEANING, VERDICT_STYLE } from "@/lib/verdict";
import { importantFindings } from "@/components/shared";
import { cn } from "@/lib/utils";

// Point on the gauge arc for a score from 0 to 100
function point(score: number, radius: number) {
  const angle = Math.PI * (1 - score / 100);
  return [110 + radius * Math.cos(angle), 112 - radius * Math.sin(angle)];
}

function Gauge({ score, color }: { score: number; color: string }) {
  const r = 84;
  const [sx, sy] = point(0, r);
  const [ex, ey] = point(Math.max(score, 0.5), r);
  const [tx, ty] = point(100, r);
  return (
    <svg viewBox="0 0 220 140" className="mx-auto w-full max-w-[260px]" aria-label={`Danger score ${score} out of 100`}>
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${tx} ${ty}`} fill="none" stroke="hsl(var(--muted))" strokeWidth="16" strokeLinecap="round" />
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />
      <circle cx={ex} cy={ey} r="9" fill="hsl(var(--card))" stroke={color} strokeWidth="4" />
      {/* Where Flag (30) and Quarantine (70) start */}
      {[30, 70].map((mark) => {
        const [lx, ly] = point(mark, r + 20);
        return <text key={mark} x={lx} y={ly} textAnchor="middle" className="font-mono" fontSize="9" fill="hsl(var(--muted-foreground))">{mark}</text>;
      })}
      <text x={sx - 6} y={sy + 16} textAnchor="middle" className="font-mono" fontSize="9" fill="hsl(var(--muted-foreground))">0</text>
      <text x={tx + 6} y={ty + 16} textAnchor="middle" className="font-mono" fontSize="9" fill="hsl(var(--muted-foreground))">100</text>
      <text x="110" y="100" textAnchor="middle" className="font-display" fontSize="44" fontWeight="700" fill={color}>{score}</text>
      <text x="110" y="128" textAnchor="middle" className="font-mono" fontSize="10" fill="hsl(var(--muted-foreground))">out of 100</text>
    </svg>
  );
}

export function VerdictCard({ result, scanning }: { result: ScanResult | null; scanning: boolean }) {
  if (!result) {
    return (
      <section className="panel p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="section-title">Verdict</h2>
          <span className="font-mono text-[11px] text-muted-foreground">danger score</span>
        </div>
        <Gauge score={0} color="hsl(var(--border))" />
        <p className="mt-2 text-center text-[16px] md:text-[14px] text-muted-foreground">
          {scanning ? "Checking the file… this can take up to a minute." : "No file checked yet. Drop a resume below."}
        </p>
      </section>
    );
  }

  const style = VERDICT_STYLE[result.verdict];
  const Icon = result.verdict === "pass" ? ShieldCheck : result.verdict === "flag" ? ShieldQuestion : ShieldAlert;
  const worst = result.findings[0];
  const hidden = worst?.hidden_points ?? 0;
  const bossy = worst?.bossy_points ?? 0;

  // Plain reasons: the titles of the findings that matter, or the backend's
  // message when the file was held for another reason (crash, wrong type...)
  const important = importantFindings(result.findings);
  const reasons = important.length
    ? important.slice(0, 3).map((f) => f.title)
    : result.verdict === "pass" ? ["No hidden orders found."]
      : result.reasons.filter((r) => !result.notes?.includes(r)).slice(0, 2);

  return (
    <section className={cn("panel overflow-hidden", result.verdict === "quarantine" && "border-quarantine/30")}>
      <div className={cn("px-5 pt-5", style.soft)}>
        <div className="flex items-baseline justify-between">
          <h2 className="section-title">Verdict</h2>
          <span className="font-mono text-[11px] text-muted-foreground">danger score</span>
        </div>
        <Gauge score={result.score} color={style.hex} />
      </div>
      <div className="px-5 pb-5">
        <div className={cn("mx-auto -mt-1 flex w-fit items-center gap-2.5 whitespace-nowrap rounded-full px-5 py-2.5 text-white dark:text-neutral-950 shadow-lg", style.solid)}>
          <Icon className="h-5 w-5 shrink-0" />
          <span className="font-display text-[24px] font-bold uppercase leading-none tracking-[0.14em]">{result.verdict}</span>
        </div>
        <p className="mt-3 text-center text-[16px] md:text-[14px] leading-snug text-foreground">{VERDICT_MEANING[result.verdict]}</p>

        <ul className="mt-3 space-y-1 text-[15px] text-muted-foreground md:text-[13px]">
          {reasons.map((reason, i) => (
            <li key={i} className="flex gap-2">
              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", style.solid)} />
              <span>{reason}</span>
            </li>
          ))}
        </ul>

        {/* Notes, e.g. when Gemini was busy and only our own reader was used */}
        {result.notes?.map((note, i) => (
          <p key={i} className="mt-3 flex gap-2 rounded-lg border border-flag/30 bg-flag/10 p-2.5 text-[12px] text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-flag-ink" />
            {note}
          </p>
        ))}

        {/* How hidden + how bossy = danger, for the worst finding */}
        {worst && (
          <div className="mt-4">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted" title="Danger = how hidden + how bossy">
              <div className={cn("h-full", style.solid)} style={{ width: `${hidden}%` }} />
              <div className={cn("h-full opacity-45", style.solid)} style={{ width: `${bossy}%` }} />
            </div>
            <div className="mt-2 grid gap-1 text-[13px]">
              <div className="flex items-center gap-2 text-muted-foreground" title={HIDDEN_TIP}>
                <span className={cn("h-2.5 w-2.5 rounded-sm", style.solid)} />
                How hidden <span className="font-mono font-medium text-foreground">{hidden}/50</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground" title={BOSSY_TIP}>
                <span className={cn("h-2.5 w-2.5 rounded-sm opacity-45", style.solid)} />
                How bossy <span className="font-mono font-medium text-foreground">{bossy}/50</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
