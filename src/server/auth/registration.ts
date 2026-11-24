import { count } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { saasModeEnabled, saasSignupClosed } from "@/server/saas/mode";

/**
 * Registro público cerrado tras la primera organización (FR-060), salvo la
 * variable de escape ALLOW_SIGNUP=true. Las cuentas de equipo las crea el
 * propietario (bypass interno del gate).
 *
 * K1 — En modo SaaS (SAAS_MODE=on) el registro está abierto: cada alta es un
 * negocio nuevo. Se puede cerrar con SIGNUP_CLOSED=true.
 */
export async function isPublicSignupAllowed(): Promise<boolean> {
  if (saasModeEnabled()) return !saasSignupClosed();
  if (process.env.ALLOW_SIGNUP === "true") return true;
  const db = getDb();
  const rows = await db.select({ n: count() }).from(schema.organization);
  return (rows[0]?.n ?? 0) === 0;
}
