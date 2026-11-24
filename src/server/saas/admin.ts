import { headers } from "next/headers";
import { and, count, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { leerSesion } from "@/lib/auth/leer-sesion";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { isSuperadminEmail } from "@/server/saas/mode";
import { ensureDefaultPlanId, startOfMonthUtc, type TenantStatus } from "@/server/saas/tenant";

/**
 * K4 — Panel del dueño de Kooni (/admin). Ve TODOS los negocios: aquí no se
 * usa `scoped()` a propósito, y por eso cada entrada exige superadmin.
 */

export type Superadmin = { userId: string; email: string; name: string };

export class ForbiddenError extends Error {}

/** El superadmin de la petición, o null si no lo es (o no hay sesión). */
export async function getSuperadmin(): Promise<Superadmin | null> {
  // Sin renovar la sesión: ver `leer-sesion.ts`.
  const session = await leerSesion(await headers());
  if (!session) return null;
  if (!isSuperadminEmail(session.user.email)) return null;
  return { userId: session.user.id, email: session.user.email, name: session.user.name };
}

/** Envuelve una ruta de /api/admin: 404 si no es superadmin (no se revela que existe). */
export function withSuperadmin<Args extends unknown[]>(
  handler: (admin: Superadmin, ...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const admin = await getSuperadmin();
    if (!admin) return Response.json({ error: { code: "not_found", message: "No encontrado" } }, { status: 404 });
    try {
      return await handler(admin, ...args);
    } catch (err) {
      console.error("[admin] error no controlado:", err);
      return Response.json({ error: { code: "internal", message: "Error interno" } }, { status: 500 });
    }
  };
}

export async function audit(
  admin: Superadmin,
  action: string,
  organizationId: string | null,
  detail: Record<string, unknown> = {}
) {
  await getDb().insert(schema.saasAuditLog).values({
    id: newId("saasAudit"),
    actorUserId: admin.userId,
    actorEmail: admin.email,
    organizationId,
    action,
    detail,
  });
}

/* ---------------- Resumen ---------------- */

export async function overview(now = new Date()) {
  const db = getDb();
  const month = startOfMonthUtc(now);
  const since7 = new Date(now.getTime() - 7 * 86_400_000);
  const [orgs] = await db.select({ n: count() }).from(schema.organization);
  const [users] = await db.select({ n: count() }).from(schema.user);
  const [newOrgs] = await db
    .select({ n: count() })
    .from(schema.organization)
    .where(gte(schema.organization.createdAt, since7));
  const byStatus = await db
    .select({ status: schema.saasTenant.status, n: count() })
    .from(schema.saasTenant)
    .groupBy(schema.saasTenant.status);
  const [msgs] = await db
    .select({ n: count() })
    .from(schema.message)
    .where(
      and(
        eq(schema.message.direction, "out"),
        inArray(schema.message.origin, ["ai", "operator", "template"]),
        gte(schema.message.createdAt, month)
      )
    );
  const [inbound] = await db
    .select({ n: count() })
    .from(schema.message)
    .where(and(eq(schema.message.direction, "in"), gte(schema.message.createdAt, month)));
  const [metaNumbers] = await db.select({ n: count() }).from(schema.metaCredentials);
  const [zernioNumbers] = await db.select({ n: count() }).from(schema.whatsappZernioCredentials);
  const status: Record<string, number> = {};
  for (const s of byStatus) status[s.status] = s.n;
  return {
    organizations: orgs?.n ?? 0,
    users: users?.n ?? 0,
    newOrganizations7d: newOrgs?.n ?? 0,
    status,
    outboundThisMonth: msgs?.n ?? 0,
    inboundThisMonth: inbound?.n ?? 0,
    whatsappNumbers: { meta: metaNumbers?.n ?? 0, zernio: zernioNumbers?.n ?? 0, waha: 0 },
  };
}

/* ---------------- Negocios ---------------- */

export type TenantRow = {
  organizationId: string;
  name: string;
  createdAt: string;
  ownerEmail: string | null;
  status: TenantStatus | null;
  planId: string | null;
  planName: string | null;
  trialEndsAt: string | null;
  members: number;
  outboundThisMonth: number;
  limit: number | null;
  whatsapp: "meta" | "zernio" | null;
};

export async function listTenants(opts: { q?: string; status?: string } = {}, now = new Date()): Promise<TenantRow[]> {
  const db = getDb();
  const q = opts.q?.trim();
  const conditions = [
    q
      ? or(
          ilike(schema.organization.name, `%${q}%`),
          ilike(schema.saasTenant.ownerEmail, `%${q}%`),
          eq(schema.organization.id, q)
        )
      : undefined,
    opts.status ? eq(schema.saasTenant.status, opts.status as TenantStatus) : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({
      organizationId: schema.organization.id,
      name: schema.organization.name,
      createdAt: schema.organization.createdAt,
      ownerEmail: schema.saasTenant.ownerEmail,
      status: schema.saasTenant.status,
      planId: schema.saasTenant.planId,
      planName: schema.saasPlan.name,
      planLimit: schema.saasPlan.maxMessagesMonth,
      override: schema.saasTenant.overrideMaxMessagesMonth,
      trialEndsAt: schema.saasTenant.trialEndsAt,
    })
    .from(schema.organization)
    .leftJoin(schema.saasTenant, eq(schema.saasTenant.organizationId, schema.organization.id))
    .leftJoin(schema.saasPlan, eq(schema.saasTenant.planId, schema.saasPlan.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.organization.createdAt))
    .limit(500);

  const ids = rows.map((r) => r.organizationId);
  if (ids.length === 0) return [];

  const members = await db
    .select({ org: schema.member.organizationId, n: count() })
    .from(schema.member)
    .where(inArray(schema.member.organizationId, ids))
    .groupBy(schema.member.organizationId);
  const usage = await db
    .select({ org: schema.message.organizationId, n: count() })
    .from(schema.message)
    .where(
      and(
        inArray(schema.message.organizationId, ids),
        eq(schema.message.direction, "out"),
        inArray(schema.message.origin, ["ai", "operator", "template"]),
        gte(schema.message.createdAt, startOfMonthUtc(now))
      )
    )
    .groupBy(schema.message.organizationId);
  const meta = await db
    .select({ org: schema.metaCredentials.organizationId })
    .from(schema.metaCredentials)
    .where(inArray(schema.metaCredentials.organizationId, ids));
  const zernio = await db
    .select({ org: schema.whatsappZernioCredentials.organizationId })
    .from(schema.whatsappZernioCredentials)
    .where(inArray(schema.whatsappZernioCredentials.organizationId, ids));
  // Dueño por membresía cuando la cuenta SaaS no lo guardó (negocios antiguos).
  const owners = await db
    .select({ org: schema.member.organizationId, email: schema.user.email })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(and(inArray(schema.member.organizationId, ids), eq(schema.member.role, "owner")));

  const mapOf = <T extends { org: string }>(list: T[]) => new Map(list.map((x) => [x.org, x]));
  const m = mapOf(members);
  const u = mapOf(usage);
  const o = mapOf(owners);
  const metaSet = new Set(meta.map((x) => x.org));
  const zernioSet = new Set(zernio.map((x) => x.org));

  return rows.map((r) => ({
    organizationId: r.organizationId,
    name: r.name,
    createdAt: r.createdAt.toISOString(),
    ownerEmail: r.ownerEmail ?? o.get(r.organizationId)?.email ?? null,
    status: r.status ?? null,
    planId: r.planId ?? null,
    planName: r.planName ?? null,
    trialEndsAt: r.trialEndsAt?.toISOString() ?? null,
    members: m.get(r.organizationId)?.n ?? 0,
    outboundThisMonth: u.get(r.organizationId)?.n ?? 0,
    limit: r.override ?? r.planLimit ?? null,
    whatsapp: zernioSet.has(r.organizationId) ? "zernio" : metaSet.has(r.organizationId) ? "meta" : null,
  }));
}

export async function tenantDetail(organizationId: string) {
  const db = getDb();
  const [org] = await db
    .select()
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId))
    .limit(1);
  if (!org) return null;
  const [tenant] = await db
    .select()
    .from(schema.saasTenant)
    .where(eq(schema.saasTenant.organizationId, organizationId))
    .limit(1);
  const users = await db
    .select({
      userId: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      role: schema.member.role,
      createdAt: schema.member.createdAt,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(eq(schema.member.organizationId, organizationId));
  const [contacts] = await db
    .select({ n: count() })
    .from(schema.contact)
    .where(eq(schema.contact.organizationId, organizationId));
  const [conversations] = await db
    .select({ n: count() })
    .from(schema.conversation)
    .where(and(eq(schema.conversation.organizationId, organizationId), eq(schema.conversation.isTest, false)));
  const log = await db
    .select()
    .from(schema.saasAuditLog)
    .where(eq(schema.saasAuditLog.organizationId, organizationId))
    .orderBy(desc(schema.saasAuditLog.createdAt))
    .limit(30);
  const [row] = await listTenants({ q: organizationId });
  return {
    organization: { id: org.id, name: org.name, createdAt: org.createdAt.toISOString() },
    tenant: tenant
      ? {
          status: tenant.status,
          planId: tenant.planId,
          trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
          suspendedReason: tenant.suspendedReason,
          overrideMaxMessagesMonth: tenant.overrideMaxMessagesMonth,
          notes: tenant.notes,
        }
      : null,
    summary: row ?? null,
    users: users.map((x) => ({ ...x, createdAt: x.createdAt.toISOString() })),
    counts: { contacts: contacts?.n ?? 0, conversations: conversations?.n ?? 0 },
    log: log.map((l) => ({
      id: l.id,
      action: l.action,
      actorEmail: l.actorEmail,
      detail: l.detail,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export type TenantPatch = {
  status?: TenantStatus;
  planId?: string | null;
  trialEndsAt?: string | null;
  suspendedReason?: string | null;
  overrideMaxMessagesMonth?: number | null;
  notes?: string | null;
  name?: string;
};

/** Cambia la cuenta de un negocio (crea la fila si era un negocio antiguo). */
export async function updateTenant(admin: Superadmin, organizationId: string, patch: TenantPatch) {
  const db = getDb();
  const [org] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId))
    .limit(1);
  if (!org) return false;

  if (patch.name !== undefined) {
    await db.update(schema.organization).set({ name: patch.name }).where(eq(schema.organization.id, organizationId));
  }
  const set: Partial<typeof schema.saasTenant.$inferInsert> = { updatedAt: new Date() };
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.planId !== undefined) set.planId = patch.planId;
  if (patch.trialEndsAt !== undefined) set.trialEndsAt = patch.trialEndsAt ? new Date(patch.trialEndsAt) : null;
  if (patch.suspendedReason !== undefined) set.suspendedReason = patch.suspendedReason || null;
  if (patch.overrideMaxMessagesMonth !== undefined) set.overrideMaxMessagesMonth = patch.overrideMaxMessagesMonth;
  if (patch.notes !== undefined) set.notes = patch.notes || null;
  // Al reactivar se olvida el motivo de la suspensión.
  if (patch.status && patch.status !== "suspended" && patch.suspendedReason === undefined) {
    set.suspendedReason = null;
  }

  const planId = set.planId ?? (await ensureDefaultPlanId(db));
  await db
    .insert(schema.saasTenant)
    .values({ organizationId, planId, status: set.status ?? "active", ...set })
    .onConflictDoUpdate({ target: schema.saasTenant.organizationId, set });

  await audit(admin, "tenant.update", organizationId, patch as Record<string, unknown>);
  return true;
}

/* ---------------- Planes ---------------- */

export async function listPlans() {
  const db = getDb();
  const plans = await db.select().from(schema.saasPlan).orderBy(schema.saasPlan.priceCents);
  const usage = await db
    .select({ planId: schema.saasTenant.planId, n: count() })
    .from(schema.saasTenant)
    .groupBy(schema.saasTenant.planId);
  const used = new Map(usage.map((u) => [u.planId, u.n]));
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    priceCents: p.priceCents,
    currency: p.currency,
    maxMessagesMonth: p.maxMessagesMonth,
    maxUsers: p.maxUsers,
    maxWhatsappNumbers: p.maxWhatsappNumbers,
    providers: p.providers,
    woocommerce: p.woocommerce,
    isDefault: p.isDefault,
    archived: p.archived,
    tenants: used.get(p.id) ?? 0,
  }));
}

export type PlanInput = {
  name: string;
  priceCents: number;
  currency: string;
  maxMessagesMonth: number | null;
  maxUsers: number | null;
  maxWhatsappNumbers: number;
  providers: string[];
  woocommerce: boolean;
  isDefault: boolean;
  archived: boolean;
};

export async function savePlan(admin: Superadmin, id: string | null, input: PlanInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    // Solo un plan por defecto.
    if (input.isDefault) {
      await tx.update(schema.saasPlan).set({ isDefault: false }).where(sql`true`);
    }
    let planId = id;
    if (planId) {
      await tx
        .update(schema.saasPlan)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(schema.saasPlan.id, planId));
    } else {
      planId = newId("saasPlan");
      await tx.insert(schema.saasPlan).values({ id: planId, ...input });
    }
    await tx.insert(schema.saasAuditLog).values({
      id: newId("saasAudit"),
      actorUserId: admin.userId,
      actorEmail: admin.email,
      organizationId: null,
      action: id ? "plan.update" : "plan.create",
      detail: { planId, ...input },
    });
    return planId;
  });
}

/* ---------------- Usuarios ---------------- */

export async function listUsers(q?: string) {
  const db = getDb();
  const term = q?.trim();
  const rows = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      createdAt: schema.user.createdAt,
      organizationId: schema.member.organizationId,
      organizationName: schema.organization.name,
      role: schema.member.role,
    })
    .from(schema.user)
    .leftJoin(schema.member, eq(schema.member.userId, schema.user.id))
    .leftJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .where(term ? or(ilike(schema.user.email, `%${term}%`), ilike(schema.user.name, `%${term}%`)) : undefined)
    .orderBy(desc(schema.user.createdAt))
    .limit(500);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function recentAudit(limit = 50) {
  const rows = await getDb()
    .select()
    .from(schema.saasAuditLog)
    .orderBy(desc(schema.saasAuditLog.createdAt))
    .limit(limit);
  return rows.map((l) => ({
    id: l.id,
    action: l.action,
    actorEmail: l.actorEmail,
    organizationId: l.organizationId,
    detail: l.detail,
    createdAt: l.createdAt.toISOString(),
  }));
}
