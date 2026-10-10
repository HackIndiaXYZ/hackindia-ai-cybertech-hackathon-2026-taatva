"use client";

// TAATVA Obsidian - sign in and sign up (email + password, through Supabase Auth).
// Anyone can create an account, but must confirm their email address first:
// Supabase sends a link, and until it is clicked, sign-in is refused.

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, LogIn, MailCheck, TriangleAlert, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
    return "That password is too weak. Use at least 8 characters, mixing letters and numbers.";
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
    // Go where the person wanted to go (only pages inside this website)
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/scan");
    router.refresh();
  }

  async function signUp() {
    if (password.length < 8) return setError("Please use a password of at least 8 characters.");
    if (password !== repeat) return setError("The two passwords are not the same.");
    const address = email.trim();
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await (mode === "signin" ? signIn() : signUp());
    } catch {
      setError("Could not reach the sign-in service. Check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[70vh] place-items-center py-4">
      <div className="panel w-full max-w-md p-5 sm:p-8">
        <h1 className="section-title">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Check resumes and emails for hidden instructions before your AI tools read them. Your scans are private to you.
        </p>

        {/* Switch between Sign In and Sign Up */}
        <div className="mt-5 grid grid-cols-2 rounded-xl border bg-muted p-1" role="tablist">
          {([["signin", "Sign in"], ["signup", "Sign up"]] as const).map(([key, label]) => (
            <button key={key} role="tab" aria-selected={mode === key} onClick={() => switchTo(key)}
              className={cn("rounded-lg py-2 font-display text-[15px] font-semibold uppercase tracking-[0.14em] transition",
                mode === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {label}
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
            <p className="mt-2 text-[14px] text-foreground">
              We sent a verification link to <b className="break-all">{checkInbox}</b>.
              Click the link in that email to activate your account, then come back and sign in.
            </p>
            <p className="mt-2 text-[12px] text-muted-foreground">
              Nothing arrived after a few minutes? Check your spam folder, or sign up again to get a new link.
            </p>
            <button onClick={() => switchTo("signin")}
              className="mt-4 rounded-xl border-2 border-primary/60 px-4 py-2 font-display text-[15px] font-semibold uppercase tracking-[0.14em] text-primary hover:bg-primary/5">
              Go to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[13px] font-medium text-foreground">Email</span>
              <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-11 bg-card" placeholder="you@company.com" />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-foreground">Password</span>
              <Input type="password" required minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password}
                onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11 bg-card" />
              {mode === "signup" && <span className="mt-1 block text-[12px] text-muted-foreground">At least 8 characters.</span>}
            </label>
            {mode === "signup" && (
              <label className="block">
                <span className="text-[13px] font-medium text-foreground">Type the password again</span>
                <Input type="password" required autoComplete="new-password" value={repeat}
                  onChange={(e) => setRepeat(e.target.value)} className="mt-1 h-11 bg-card" />
              </label>
            )}

            {error && (
              <p className="flex gap-2 rounded-lg border border-quarantine/40 bg-quarantine/10 p-3 text-[13px] text-foreground" role="alert">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-quarantine" />
                {error}
              </p>
            )}

            <button type="submit" disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-display text-[18px] font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "signin" ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-[12px] text-muted-foreground">
          {mode === "signin"
            ? <>New to Obsidian? <button onClick={() => switchTo("signup")} className="font-medium text-primary underline">Create an account</button>.</>
            : <>Already have an account? <button onClick={() => switchTo("signin")} className="font-medium text-primary underline">Sign in</button>.</>}
        </p>
      </div>
    </div>
  );
}
