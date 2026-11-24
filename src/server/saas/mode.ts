/**
 * K1 — Interruptores del modo SaaS. Se leen de `process.env` directamente
 * (como `ALLOW_SIGNUP`) para que los tests puedan cambiarlos con stubEnv.
 */

/** true si la instancia es el SaaS multi-negocio de Kooni. */
export function saasModeEnabled(): boolean {
  return (process.env.SAAS_MODE ?? "").trim().toLowerCase() === "on";
}

/** true si el registro público está cerrado a propósito en modo SaaS. */
export function saasSignupClosed(): boolean {
  return process.env.SIGNUP_CLOSED === "true";
}

/** Días de prueba de un negocio nuevo (14 por defecto). */
export function trialDays(): number {
  const raw = (process.env.SAAS_TRIAL_DAYS ?? "").trim();
  if (!raw) return 14;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 14;
}

/** Correos del superadmin, en minúsculas y sin espacios. */
export function superadminEmails(): Set<string> {
  return new Set(
    (process.env.SUPERADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return superadminEmails().has(email.trim().toLowerCase());
}
