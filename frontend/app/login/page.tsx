"use client";

// TAATVA Obsidian - the sign-in page. Email + password, checked by Supabase Auth.
// There is no "sign up" button: team members are added by an admin in Supabase,
// so only TAATVA users can get in.

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/header";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "That email and password do not match. Check them, or ask your TAATVA admin."
        : error.message);
      setBusy(false);
      return;
    }
    // Go where the person wanted to go (only pages inside this website)
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/scan");
    router.refresh();
  }

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="panel w-full max-w-md p-8">
        <div className="flex items-center gap-3">
          <Logo className="h-12 w-12" />
          <div>
            <div className="font-display text-[32px] font-bold leading-none tracking-[0.22em]">OBSIDIAN</div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground">BY TEAM TAATVA · HIDDEN-ORDER SCANNER</div>
          </div>
        </div>

        <h1 className="section-title mt-8">Sign in</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">For TAATVA team members only. Your scans are private to you.</p>

        <form onSubmit={signIn} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[13px] font-medium text-foreground">Work email</span>
            <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-11 bg-white" placeholder="you@company.com" />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-foreground">Password</span>
            <Input type="password" required autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11 bg-white" />
          </label>

          {error && <p className="rounded-lg border border-quarantine/30 bg-quarantine/5 p-3 text-[13px] text-quarantine">{error}</p>}

          <button type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-display text-[18px] font-semibold uppercase tracking-[0.16em] text-white shadow hover:bg-primary/90 disabled:opacity-60">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
            Sign in
          </button>
        </form>

        <p className="mt-6 text-[12px] text-muted-foreground">
          No account yet, or forgot your password? Ask your TAATVA admin to add or reset you in Supabase.
        </p>
      </div>
    </div>
  );
}
