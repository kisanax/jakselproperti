import "server-only";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Entry = { count: number; resetAt: number };
const globalForRegistration = globalThis as typeof globalThis & {
  registrationAttempts?: Map<string, Entry>;
};

const attempts = globalForRegistration.registrationAttempts ?? new Map<string, Entry>();
globalForRegistration.registrationAttempts = attempts;

export function consumeRegistrationAttempt(key: string) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (current.count >= MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}
