import { z } from "zod";
import { eq } from "drizzle-orm";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { channelDisabledResponse } from "@/server/channels/enabled";
import { whatsappZernioEnabled } from "@/server/whatsapp/zernio-flag";
import { urlDeConexion, zernioPlataforma } from "@/server/zernio/plataforma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  /** coexistencia = sigue usando la app de WhatsApp Business; api = número solo para la API. */
  modo: z.enum(["coexistencia", "api"]),
});

/**
 * K5 — Empieza a conectar el WhatsApp del negocio con la cuenta de Zernio de
 * la plataforma. Devuelve la URL de Zernio a la que ir; al terminar, Zernio
 * vuelve a `/api/settings/whatsapp-zernio/callback`.
 */
export const POST = withAuth(async (session, req: Request) => {
  if (!whatsappZernioEnabled()) return channelDisabledResponse();
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede conectar WhatsApp");
  }
  if (!(await zernioPlataforma())) {
    return apiError(409, "sin_plataforma", "La conexión con Zernio todavía no está disponible. Avisa al soporte.");
  }
  const body = await parseBody(req, bodySchema);
  if (!body.ok) return body.response;

  const [org] = await getDb()
    .select({ name: schema.organization.name })
    .from(schema.organization)
    .where(eq(schema.organization.id, session.organizationId))
    .limit(1);
  try {
    const authUrl = await urlDeConexion({
      organizationId: session.organizationId,
      nombreNegocio: org?.name ?? "",
      modo: body.data.modo,
    });
    return Response.json({ authUrl });
  } catch (err) {
    console.error("[zernio-plataforma] no se pudo iniciar la conexión:", err);
    return apiError(502, "zernio_error", "Zernio no respondió. Prueba otra vez en un momento.");
  }
});
