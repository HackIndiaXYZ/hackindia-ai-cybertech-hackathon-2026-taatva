// TAATVA Obsidian - the rules a new password must follow.
// The sign-up page shows each rule with a tick as soon as it is met.

export const PASSWORD_RULES = [
  { label: "At least 8 characters", met: (p: string) => p.length >= 8 },
  { label: "One capital letter (A-Z)", met: (p: string) => /[A-Z]/.test(p) },
  { label: "One small letter (a-z)", met: (p: string) => /[a-z]/.test(p) },
  { label: "One number (0-9)", met: (p: string) => /[0-9]/.test(p) },
  { label: "One special character (like ! @ # $ %)", met: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
];

export function passwordIsStrong(password: string) {
  return PASSWORD_RULES.every((rule) => rule.met(password));
}
