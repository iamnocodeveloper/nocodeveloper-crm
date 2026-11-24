import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { canConfigure } from "@/lib/auth/roles";
import { getDb, schema } from "@/lib/db";
import type { StoreNotifyRule } from "@/lib/db/schema";
import { ajustesTienda } from "@/server/tienda/pedidos";
import { ESTADOS_PEDIDO, PLANTILLAS_PEDIDO } from "@/server/tienda/formato";
import { createTemplate, TemplateError } from "@/server/whatsapp/templates";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  /** Estados para los que crear la plantilla; vacío = todos. */
  estados: z.array(z.string().max(60)).max(20).default([]),
  language: z.string().trim().min(2).max(10).default("es"),
});

/**
 * K6 — Crea las plantillas de pedidos y las manda a aprobación de Meta (por
 * la conexión de WhatsApp del negocio: la API oficial, directa o por la
 * plataforma). Cada una queda enlazada al aviso de su estado, con el dato de
 * cada variable ya elegido. Meta tarda hasta 24 h en aprobarlas.
 */
export const POST = withAuth(async (session, req: Request) => {
  if (!canConfigure(session.role)) {
    return apiError(403, "forbidden", "Solo el propietario puede crear plantillas");
  }
  const body = await parseBody(req, bodySchema);
  if (!body.ok) return body.response;

  const elegidas = PLANTILLAS_PEDIDO.filter(
    (p) => body.data.estados.length === 0 || body.data.estados.includes(p.slug)
  );
  const ajustes = await ajustesTienda(session.organizationId);
  const reglas: Record<string, StoreNotifyRule> = { ...(ajustes.rules ?? {}) };
  const resultados: { estado: string; name: string; ok: boolean; message: string }[] = [];

  for (const p of elegidas) {
    try {
      const t = await createTemplate(session.organizationId, {
        name: p.name,
        language: body.data.language,
        category: "UTILITY",
        body: p.body,
        examples: p.examples,
      });
      const previa = reglas[p.slug];
      reglas[p.slug] = {
        enabled: previa?.enabled ?? true,
        templateId: t.id,
        variables: p.variables,
        text: previa?.text ?? ESTADOS_PEDIDO.find((e) => e.slug === p.slug)?.sugerido ?? null,
      };
      resultados.push({ estado: p.slug, name: p.name, ok: true, message: "Enviada a aprobación" });
    } catch (err) {
      const message = err instanceof TemplateError || err instanceof Error ? err.message : "Error";
      resultados.push({ estado: p.slug, name: p.name, ok: false, message });
      // Sin conexión de WhatsApp no tiene sentido seguir intentando las demás.
      if (err instanceof TemplateError && (err.code === "not_connected" || err.code === "reconnect_required")) break;
    }
  }

  await getDb()
    .update(schema.storeSettings)
    .set({ rules: reglas, updatedAt: new Date() })
    .where(eq(schema.storeSettings.organizationId, session.organizationId));

  return Response.json({ resultados });
});
