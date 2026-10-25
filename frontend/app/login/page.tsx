"use client";

// TAATVA Obsidian - sign in and sign up (email + password, through Supabase Auth).
// Anyone can create an account, but must confirm their email address first:
// Supabase sends a link, and until it is clicked, sign-in is refused.

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CheckCircle2, Circle, Loader2, LogIn, MailCheck, TriangleAlert, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { safeNextPage } from "@/lib/safe-next";
import { domainProblem, formatProblem, typoProblem, type EmailProblem } from "@/lib/email-check";
import { PASSWORD_RULES, passwordIsStrong } from "@/lib/password-rules";
import { EmailPopup } from "@/components/email-popup";
import { PasswordInput } from "@/components/password-input";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/motion/FadeIn";

type Mode = "signin" | "signup";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

// Supabase error -> a sentence anyone understands
function plainError(message: string, code?: string) {
  const text = `${code ?? ""} ${message}`.toLowerCase();
  if (text.includes("email_not_confirmed") || text.includes("not confirmed")) {
    return "Sign-in failed. Please verify your email address before logging in. Check your inbox (and spam folder) for the verification link.";
  }
  if (text.includes("invalid login credentials") || text.includes("invalid_credentials")) {
    return "That email and password do not match. Check them and try again. New here? Choose “Sign up” above.";
  }
  if (text.includes("rate limit") || text.includes("over_email_send_rate_limit")) {
    return "Too many emails were sent in a short time. Please wait a few minutes and try again.";
  }
  if (text.includes("password") && (text.includes("short") || text.includes("at least") || text.includes("weak"))) {
    return "That password is too weak. Use at least 8 characters with a capital letter, a small letter, a number and a special character.";
  }
  if (text.includes("invalid") && text.includes("email")) {
    return "That does not look like a real email address. Please check it.";
  }
  if (text.includes("signups not allowed") || text.includes("signup_disabled")) {
    return "New sign-ups are switched off right now. Please ask the TAATVA team for access.";
  }
  return message;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "link" ? "That verification link did not work or has expired. Try signing in, or sign up again for a new link." : null,
  );
  const [checkInbox, setCheckInbox] = useState<string | null>(null);
  const [popup, setPopup] = useState<EmailProblem | null>(null);
  const closePopup = useCallback(() => {
    setPopup(null);
    document.getElementById("email")?.focus();
  }, []);
  const confirmed = params.get("confirmed") === "1";

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setCheckInbox(null);
    setPassword("");
    setRepeat("");
  }

  async function signIn() {
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) return setError(plainError(error.message, error.code));
    // Go where the person wanted to go, but ONLY to pages inside this website (bug QA-09:
    // "/\evil.com" looked like a local page, but browsers read it as another website)
    router.replace(safeNextPage(params.get("next"), window.location.origin));
    router.refresh();
  }

  // keepTyped = the person saw "is there a typo?" and chose to keep their address
  async function signUp(address = email.trim(), keepTyped = false) {
    // Check the email first. Anything wrong -> a pop-up, and no account is made.
    const problem = formatProblem(address) ?? (keepTyped ? null : typoProblem(address)) ?? (await domainProblem(address));
    if (problem) return setPopup(problem);
    if (!passwordIsStrong(password))
      return setError("Your password does not follow all the rules yet. Check the list under the password box.");
    if (password !== repeat) return setError("The two passwords are not the same.");
    const { data, error } = await supabase().auth.signUp({
      email: address,
      password,
      // The link in the email brings people back here, already confirmed
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return setError(plainError(error.message, error.code));
    // If email confirmation were ever switched off, Supabase signs people in at once
    if (data.session) {
      router.replace("/scan");
      router.refresh();
      return;
    }
    // Success: clear the form and ask them to confirm their email
    setEmail("");
    setPassword("");
    setRepeat("");
    setCheckInbox(address);
  }

  async function submit(e?: React.FormEvent, address?: string, keepTyped = false) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await (mode === "signin" ? signIn() : signUp(address, keepTyped));
    } catch {
      setError("Could not reach the sign-in service. Check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[70vh] items-center gap-10 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16 lg:py-10">
      {/* Left (wide screens): who we are, in a few words */}
      <FadeIn className="hidden lg:block">
        <p className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-beam shadow-[0_0_8px_hsl(var(--beam))]" />
          Team TAATVA · hidden-order scanner
        </p>
        <p className="mt-6 font-display text-display-lg font-bold uppercase tracking-[0.08em] text-foreground">Obsidian</p>
        <p className="mt-3 font-display text-display-sm font-semibold text-primary">Find. Show. Remove.</p>
        <p className="mt-6 max-w-[52ch] text-[17px] leading-relaxed text-muted-foreground">
          Old tools ask: <span className="text-foreground">does this sound bad?</span>{" "}
          Obsidian asks: <span className="font-semibold text-foreground">could a human even see this?</span>
        </p>
        <ul className="mt-8 space-y-3 text-[15px] text-foreground">
          {["Reads every file the way an AI does, and the way a person does", "Shows hidden orders with red X-Ray boxes", "Gives your AI agent only the clean, visible text"].map((line) => (
            <li key={line} className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary"><Check className="h-3.5 w-3.5" /></span>
              {line}
            </li>
          ))}
        </ul>
      </FadeIn>

      <FadeIn delay={0.08} className="mx-auto w-full max-w-md">
      <div className="panel relative w-full overflow-hidden p-5 shadow-e3 sm:p-8">
        {/* A thin beam line along the top of the card */}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-beam to-transparent" />
        <h1 className="section-title">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
        <p className="mt-1 text-[16px] md:text-[14px] text-muted-foreground">
          Check resumes and emails for hidden instructions before your AI tools read them. Your scans are private to you.
        </p>

        {/* Switch between Sign In and Sign Up */}
        <div className="mt-5 grid grid-cols-2 rounded-full border bg-muted/70 p-1" role="tablist">
          {([["signin", "Sign in"], ["signup", "Sign up"]] as const).map(([key, label]) => (
            <button key={key} role="tab" aria-selected={mode === key} onClick={() => switchTo(key)}
              className={cn("relative rounded-full py-2 max-lg:min-h-11 font-display text-[15px] font-semibold uppercase tracking-[0.14em] transition-colors duration-base",
                mode === key ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {/* The white pill slides between Sign in and Sign up */}
              {mode === key && (
                <motion.span layoutId="auth-tab" aria-hidden="true" className="absolute inset-0 rounded-full bg-card shadow-e1"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>

        {confirmed && mode === "signin" && !error && (
          <div className="mt-5 flex gap-3 rounded-xl border border-pass/40 bg-pass/10 p-4 text-[14px] text-foreground">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pass" />
            <span><b>Your email is confirmed.</b> You can sign in now.</span>
          </div>
        )}

        {checkInbox ? (
          // Big, clear "check your inbox" message after signing up
          <div className="mt-6 rounded-2xl border-2 border-pass/40 bg-pass/10 p-5 text-center" role="status" aria-live="polite">
            <MailCheck className="mx-auto h-10 w-10 text-pass" />
            <h2 className="mt-3 font-display text-[22px] font-bold uppercase tracking-[0.12em] text-foreground">Check your inbox</h2>
            <p className="mt-2 text-[16px] md:text-[14px] text-foreground">
              We sent a verification link to <b className="break-all">{checkInbox}</b>.
              Click the link in that email to activate your account, then come back and sign in.
            </p>
            <p className="mt-2 text-[14px] md:text-[12px] text-muted-foreground">
              Nothing arrived after a few minutes? Check your spam folder, or sign up again to get a new link.
            </p>
            <button onClick={() => switchTo("signin")}
              className="lift mt-4 rounded-xl border-2 border-primary/60 px-4 py-2 font-display text-[15px] font-semibold uppercase tracking-[0.14em] text-primary hover:bg-primary/5">
              Go to sign in
            </button>
          </div>
        ) : (
          // Sign up: our own pop-up checks the email (noValidate turns off the browser's small tooltip)
          <form onSubmit={submit} noValidate={mode === "signup"} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[13px] font-medium text-foreground">Email</span>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-11 bg-card" placeholder="you@company.com" />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-foreground">Password</span>
              <PasswordInput required minLength={mode === "signup" ? 8 : undefined} aria-describedby={mode === "signup" ? "password-rules" : undefined}
                autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null); // an old "password" warning goes away as soon as they fix it
                }} className="mt-1 h-11 bg-card" />
            </label>
            {mode === "signup" && (
              // Each rule gets a green tick as soon as the password follows it
              <ul id="password-rules" className="space-y-1 text-[14px] md:text-[12px]" aria-label="Password rules">
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.met(password);
                  return (
                    <li key={rule.label} className={cn("flex items-center gap-2", met ? "text-pass" : "text-muted-foreground")}>
                      {met ? <Check className="h-4 w-4 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0" />}
                      <span>{rule.label}</span>
                      <span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {mode === "signup" && (
              <label className="block">
                <span className="text-[13px] font-medium text-foreground">Type the password again</span>
                <PasswordInput required autoComplete="new-password" value={repeat}
                  onChange={(e) => setRepeat(e.target.value)} className="mt-1 h-11 bg-card" />
                {repeat && (
                  <span className={cn("mt-1 block text-[14px] md:text-[12px]", repeat === password ? "text-pass" : "text-quarantine")}>
                    {repeat === password ? "Both passwords match." : "The two passwords are not the same yet."}
                  </span>
                )}
              </label>
            )}

            {error && (
              <p className="flex gap-2 rounded-lg border border-quarantine/40 bg-quarantine/10 p-3 text-[15px] md:text-[13px] text-foreground" role="alert">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-quarantine" />
                {error}
              </p>
            )}

            <button type="submit" disabled={busy}
              className="lift group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 py-3 font-display text-[17px] font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-glow disabled:cursor-wait disabled:opacity-60">
              {/* A light sweep across the button on hover */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[120%] bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-light-sweep" />
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "signin" ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        )}

        {popup && (
          <EmailPopup problem={popup} onClose={closePopup}
            onUseSuggestion={() => {
              // Fill in the address we suggested and carry on creating the account
              const suggestion = popup.suggestion!;
              setEmail(suggestion);
              setPopup(null);
              submit(undefined, suggestion);
            }}
            onKeepTyped={() => {
              setPopup(null);
              submit(undefined, email.trim(), true);
            }} />
        )}

        <p className="mt-6 text-[14px] md:text-[12px] text-muted-foreground">
          {mode === "signin"
            ? <>New to Obsidian? <button onClick={() => switchTo("signup")} className="font-medium text-primary underline max-lg:inline-flex max-lg:min-h-11 max-lg:min-w-11 max-lg:items-center max-lg:justify-center">Create an account</button>.</>
            : <>Already have an account? <button onClick={() => switchTo("signin")} className="font-medium text-primary underline max-lg:inline-flex max-lg:min-h-11 max-lg:min-w-11 max-lg:items-center max-lg:justify-center">Sign in</button>.</>}
        </p>
      </div>
      </FadeIn>
    </div>
  );
}
