import { and, eq, inArray } from "drizzle-orm";
import { syncTemplates } from "@/server/whatsapp/templates";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { canConfigure } from "@/lib/auth/roles";
import { getDb, schema } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { countVariables } from "@/lib/templates";
import { ajustesTienda, ultimosPedidos } from "@/server/tienda/pedidos";

export const dynamic = "force-dynamic";

/** K6 — Ajustes de la tienda, plantillas aprobadas y últimos pedidos. */
export const GET = withAuth(async (session) => {
  const ajustes = await ajustesTienda(session.organizationId);
  const leer = () =>
    getDb()
      .select({
        id: schema.template.id,
        name: schema.template.name,
        language: schema.template.language,
        body: schema.template.body,
        status: schema.template.status,
      })
      .from(schema.template)
      .where(
        and(
          eq(schema.template.organizationId, session.organizationId),
          inArray(schema.template.status, ["approved", "pending"])
        )
      );
  let plantillas = await leer();
  // Con alguna pendiente se pregunta a Meta cómo van (aprobación en curso).
  if (plantillas.some((t) => t.status === "pending")) {
    const ok = await syncTemplates(session.organizationId).then(
      () => true,
      () => false
    );
    if (ok) plantillas = await leer();
  }
  return Response.json({
    apiUrl: getEnv().APP_BASE_URL.replace(/\/$/, ""),
    settings: {
      enabled: ajustes.enabled,
      requireOptIn: ajustes.requireOptIn,
      createLeads: ajustes.createLeads,
      rules: ajustes.rules ?? {},
      storeUrl: ajustes.storeUrl,
      storeName: ajustes.storeName,
      lastEventAt: ajustes.lastEventAt?.toISOString() ?? null,
    },
    templates: plantillas.map((t) => ({ ...t, variables: countVariables(t.body) })),
    orders: await ultimosPedidos(session.organizationId),
  });
});

const reglaSchema = z.object({
  enabled: z.boolean(),
  templateId: z.string().min(1).nullable(),
  variables: z.array(z.string().max(60)).max(20),
  text: z.string().max(1000).nullable(),
});

const putSchema = z.object({
  enabled: z.boolean(),
  requireOptIn: z.boolean(),
  createLeads: z.boolean(),
  rules: z.record(z.string().max(60), reglaSchema),
});

export const PUT = withAuth(async (session, req: Request) => {
  if (!canConfigure(session.role)) {
    return apiError(403, "forbidden", "Solo el propietario puede cambiar los avisos de la tienda");
  }
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;
  await ajustesTienda(session.organizationId);
  await getDb()
    .update(schema.storeSettings)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(schema.storeSettings.organizationId, session.organizationId));
  return Response.json({ ok: true });
});
