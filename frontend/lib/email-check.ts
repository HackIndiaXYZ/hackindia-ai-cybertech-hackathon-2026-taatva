// TAATVA Obsidian - is this email address real enough to sign up with?
// Three checks, from quick to slow:
// 1. Is it written like an email? (name@company.com)
// 2. Is it a small typo of a common email provider? (gmial.com -> gmail.com)
// 3. Can the company part (after @) receive emails at all? (asked from our own server)
// We cannot know if the mailbox itself exists: the verification email checks that.

export type EmailProblem = {
  title: string;
  message: string;
  suggestion?: string; // the address we think they meant
};

// Email providers people use most. A tiny typo in one of these is almost always a mistake.
const COMMON_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.in", "outlook.com", "hotmail.com",
  "live.com", "msn.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
  "rediffmail.com", "zoho.com", "gmx.com", "yandex.com",
  // Real providers that look close to the ones above, so they are never called a typo
  "mail.com", "ymail.com", "rocketmail.com", "outlook.in", "live.in", "hotmail.co.uk", "yahoo.co.uk",
];

// How many letters must change to turn one word into the other
function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

// Check 1: written like an email?
export function formatProblem(address: string): EmailProblem | null {
  const bad = (message: string): EmailProblem => ({ title: "This email address is not valid", message });
  if (!address) return bad("Please type your email address.");
  if (/\s/.test(address)) return bad("An email address cannot contain spaces.");
  const parts = address.split("@");
  if (parts.length !== 2) return bad("An email address needs exactly one @ sign, like name@company.com.");
  const [name, domain] = parts;
  if (!name) return bad("Something is missing before the @ sign, like name@company.com.");
  if (!domain) return bad("Something is missing after the @ sign, like name@company.com.");
  if (address.length > 254 || name.length > 64) return bad("This email address is too long.");
  if (name.startsWith(".") || name.endsWith(".") || name.includes(".."))
    return bad("The part before the @ sign cannot start or end with a dot, or have two dots in a row.");
  if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i.test(name))
    return bad("The part before the @ sign has a character that email addresses cannot use.");
  const labels = domain.split(".");
  if (labels.length < 2) return bad(`“${domain}” is missing its ending, like .com or .in.`);
  if (labels.some((label) => !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(label)))
    return bad(`“${domain}” is not a valid email company name. Check for extra dots or symbols.`);
  if (!/^[a-z]{2,}$/i.test(labels[labels.length - 1]))
    return bad(`“${domain}” has an ending that does not exist, like .com or .in.`);
  return null;
}

// Check 2: a small typo of a common provider? (gmial.com, gmail.con, hotmial.com)
export function typoProblem(address: string): EmailProblem | null {
  const [name, domain] = address.split("@");
  const lower = domain.toLowerCase();
  if (COMMON_DOMAINS.includes(lower)) return null;
  // Pick the closest common provider, and only if it is 1 or 2 letters away
  let best: string | null = null;
  let bestDistance = 3;
  for (const known of COMMON_DOMAINS) {
    const d = distance(lower, known);
    if (d < bestDistance) [best, bestDistance] = [known, d];
  }
  if (!best) return null;
  const suggestion = `${name}@${best}`;
  return {
    title: "Is there a typo in your email?",
    message: `“${domain}” looks like a typo. Did you mean ${suggestion}?`,
    suggestion,
  };
}

// Check 3: can this company receive emails? Asks our own server (it looks up the internet's address book).
// If our server cannot answer (no internet, timeout), we let the person continue: never block by mistake.
export async function domainProblem(address: string): Promise<EmailProblem | null> {
  try {
    const answer = await fetch("/api/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: address }),
      signal: AbortSignal.timeout(6_000),
    });
    if (!answer.ok) return null;
    const { ok } = (await answer.json()) as { ok: boolean | null };
    if (ok !== false) return null;
    const domain = address.split("@")[1];
    return {
      title: "This email address is not valid",
      message: `“${domain}” cannot receive emails, so we could not send you a verification link. Please check the part after the @ sign.`,
    };
  } catch {
    return null;
  }
}
