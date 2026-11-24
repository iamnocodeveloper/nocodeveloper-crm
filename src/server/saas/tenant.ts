import { and, count, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { saasModeEnabled, trialDays } from "@/server/saas/mode";

/**
 * K1 — La cuenta SaaS de un negocio: crearla en el alta, leer su estado y
 * decidir si puede operar (suspensión, prueba vencida, límite de mensajes).
 */

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type TenantStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled";

/** El plan que se crea solo si no hay ninguno marcado por defecto. */
export const DEFAULT_PLAN = {
  name: "Prueba",
  priceCents: 0,
  maxMessagesMonth: 1000,
  maxUsers: 3,
  maxWhatsappNumbers: 1,
} as const;

/** Id del plan por defecto; lo crea si todavía no existe. */
export async function ensureDefaultPlanId(tx: Tx | Db): Promise<string> {
  const [found] = await tx
    .select({ id: schema.saasPlan.id })
    .from(schema.saasPlan)
    .where(and(eq(schema.saasPlan.isDefault, true), eq(schema.saasPlan.archived, false)))
    .limit(1);
  if (found) return found.id;
  const id = newId("saasPlan");
  await tx.insert(schema.saasPlan).values({ id, ...DEFAULT_PLAN, isDefault: true });
  return id;
}

/** Crea la fila de cuenta SaaS de un negocio nuevo (en prueba). Idempotente. */
export async function createTenant(
  tx: Tx | Db,
  organizationId: string,
  ownerEmail: string | null,
  now: Date = new Date()
): Promise<void> {
  const planId = await ensureDefaultPlanId(tx);
  const days = trialDays();
  await tx
    .insert(schema.saasTenant)
    .values({
      organizationId,
      planId,
      status: days > 0 ? "trial" : "active",
      trialEndsAt: days > 0 ? new Date(now.getTime() + days * 86_400_000) : null,
      ownerEmail,
    })
    .onConflictDoNothing();
}

export type TenantGate =
  | { blocked: false }
  | { blocked: true; code: "suspended" | "trial_expired" | "cancelled"; message: string };

/** Puro: ¿puede operar este negocio? */
export function gateFor(
  tenant: { status: TenantStatus; trialEndsAt: Date | null; suspendedReason?: string | null } | null,
  now: Date = new Date()
): TenantGate {
  // Sin fila (instancia antigua o modo no SaaS): no se bloquea nada.
  if (!tenant) return { blocked: false };
  if (tenant.status === "suspended") {
    return {
      blocked: true,
      code: "suspended",
      message: tenant.suspendedReason
        ? `Tu cuenta está suspendida: ${tenant.suspendedReason}`
        : "Tu cuenta está suspendida. Escríbenos para reactivarla.",
    };
  }
  if (tenant.status === "cancelled") {
    return { blocked: true, code: "cancelled", message: "Tu cuenta está cancelada." };
  }
  if (tenant.status === "trial" && tenant.trialEndsAt && tenant.trialEndsAt <= now) {
    return {
      blocked: true,
      code: "trial_expired",
      message: "Tu prueba gratis terminó. Elige un plan para seguir usando Kooni.",
    };
  }
  return { blocked: false };
}

export async function getTenant(organizationId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.saasTenant)
    .where(eq(schema.saasTenant.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

/** El candado de un negocio. Fuera del modo SaaS nunca bloquea. */
export async function tenantGate(organizationId: string): Promise<TenantGate> {
  if (!saasModeEnabled()) return { blocked: false };
  return gateFor(await getTenant(organizationId));
}

/** Puro: el aviso que enseña la franja de la cuenta (o null si no hay nada que decir). */
export function avisoCuentaDe(
  tenant: { status: TenantStatus; trialEndsAt: Date | null; suspendedReason?: string | null } | null,
  now: Date = new Date()
): { tono: "bloqueo" | "aviso"; mensaje: string } | null {
  const gate = gateFor(tenant, now);
  if (gate.blocked) {
    return { tono: "bloqueo", mensaje: `${gate.message} Puedes ver tus datos, pero no enviar ni cambiar nada.` };
  }
  if (tenant?.status === "trial" && tenant.trialEndsAt) {
    const dias = Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / 86_400_000);
    if (dias <= 3) {
      return {
        tono: "aviso",
        mensaje: dias <= 1 ? "Tu prueba gratis termina hoy." : `Tu prueba gratis termina en ${dias} días.`,
      };
    }
  }
  return null;
}

/** Primer instante del mes en curso (UTC). */
export function startOfMonthUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Mensajes salientes que cuentan para el plan este mes: los que manda Kooni
 * (IA, operador, plantillas). Los escritos a mano desde el móvil
 * (coexistencia, origin='manual') y los del Laboratorio no cuentan.
 */
export async function outboundMessagesThisMonth(organizationId: string, now = new Date()) {
  const db = getDb();
  const [row] = await db
    .select({ n: count() })
    .from(schema.message)
    .innerJoin(schema.conversation, eq(schema.message.conversationId, schema.conversation.id))
    .where(
      and(
        eq(schema.message.organizationId, organizationId),
        eq(schema.message.direction, "out"),
        inArray(schema.message.origin, ["ai", "operator", "template"]),
        eq(schema.conversation.isTest, false),
        gte(schema.message.createdAt, startOfMonthUtc(now))
      )
    );
  return row?.n ?? 0;
}

/** Límite de mensajes del negocio (null = sin límite). */
export async function messageLimitFor(organizationId: string): Promise<number | null> {
  const db = getDb();
  const [row] = await db
    .select({
      override: schema.saasTenant.overrideMaxMessagesMonth,
      plan: schema.saasPlan.maxMessagesMonth,
    })
    .from(schema.saasTenant)
    .leftJoin(schema.saasPlan, eq(schema.saasTenant.planId, schema.saasPlan.id))
    .where(eq(schema.saasTenant.organizationId, organizationId))
    .limit(1);
  if (!row) return null;
  return row.override ?? row.plan ?? null;
}

/** ¿Cabe un usuario más en el plan? Fuera del modo SaaS siempre cabe. */
export async function canAddUser(
  organizationId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!saasModeEnabled()) return { ok: true };
  const db = getDb();
  const [plan] = await db
    .select({ maxUsers: schema.saasPlan.maxUsers })
    .from(schema.saasTenant)
    .innerJoin(schema.saasPlan, eq(schema.saasTenant.planId, schema.saasPlan.id))
    .where(eq(schema.saasTenant.organizationId, organizationId))
    .limit(1);
  if (!plan || plan.maxUsers === null) return { ok: true };
  const [members] = await db
    .select({ n: count() })
    .from(schema.member)
    .where(eq(schema.member.organizationId, organizationId));
  if ((members?.n ?? 0) >= plan.maxUsers) {
    return {
      ok: false,
      message: `Tu plan permite ${plan.maxUsers} usuarios. Mejora tu plan para añadir más.`,
    };
  }
  return { ok: true };
}

/**
 * ¿Puede mandar un mensaje más este mes? Devuelve el motivo si no.
 * Fuera del modo SaaS siempre puede.
 */
export async function canSendMore(organizationId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!saasModeEnabled()) return { ok: true };
  const gate = await tenantGate(organizationId);
  if (gate.blocked) return { ok: false, message: gate.message };
  const limit = await messageLimitFor(organizationId);
  if (limit === null) return { ok: true };
  const used = await outboundMessagesThisMonth(organizationId);
  if (used >= limit) {
    return {
      ok: false,
      message: `Llegaste al límite de ${limit} mensajes de este mes. Mejora tu plan para seguir enviando.`,
    };
  }
  return { ok: true };
}
