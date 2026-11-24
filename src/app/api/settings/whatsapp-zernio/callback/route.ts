import { requireSession } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { zernioFetch } from "@/server/zernio";
import type { ZernioAccount } from "@/server/zernio/cuentas";
import { asegurarWebhookPlataforma, perfilEsDelNegocio, zernioPlataforma } from "@/server/zernio/plataforma";
import {
  PLATFORM_TOKEN,
  saveWhatsappZernioCredentials,
} from "@/server/whatsapp/zernio-credentials";
import { whatsappZernioEnabled } from "@/server/whatsapp/zernio-flag";

export const dynamic = "force-dynamic";

/**
 * K5 — Zernio vuelve aquí al terminar de conectar el WhatsApp del negocio
 * (`connected=whatsapp&profileId&accountId&username`, o `error=...`).
 *
 * Nada de la URL se da por bueno: el perfil tiene que ser de ESTE negocio
 * (`externalId`) y la cuenta tiene que existir en Zernio dentro de ese perfil.
 */
export async function GET(req: Request) {
  const base = getEnv().APP_BASE_URL.replace(/\/$/, "");
  const volver = (q: string) => Response.redirect(`${base}/settings/whatsapp?${q}`, 303);

  if (!whatsappZernioEnabled()) return volver("zernio=error&motivo=desactivado");
  let session;
  try {
    session = await requireSession();
  } catch {
    return Response.redirect(`${base}/login`, 303);
  }
  if (session.role !== "owner") return volver("zernio=error&motivo=solo_propietario");

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) return volver(`zernio=error&motivo=${encodeURIComponent(error.slice(0, 60))}`);

  const accountId = url.searchParams.get("accountId");
  const profileId = url.searchParams.get("profileId");
  const telefono = url.searchParams.get("username");
  if (!accountId || !profileId) return volver("zernio=error&motivo=respuesta_incompleta");

  const p = await zernioPlataforma();
  if (!p) return volver("zernio=error&motivo=sin_plataforma");

  try {
    if (!(await perfilEsDelNegocio(p.apiKey, profileId, session.organizationId))) {
      return volver("zernio=error&motivo=perfil_ajeno");
    }
    // Filtrado por el perfil: con una llave para todos los negocios, la lista
    // completa puede pasar de las 500 cuentas que Zernio devuelve sin paginar.
    const json = (await zernioFetch(
      `/accounts?profileId=${encodeURIComponent(profileId)}&platform=whatsapp`,
      { token: p.apiKey, timeoutMs: 10_000 }
    )) as { accounts?: ZernioAccount[] } | null;
    const cuentas = Array.isArray(json?.accounts) ? json.accounts : [];
    const cuenta = cuentas.find((a) => a._id === accountId && a.platform === "whatsapp");
    if (!cuenta) return volver("zernio=error&motivo=cuenta_no_encontrada");

    await saveWhatsappZernioCredentials({
      organizationId: session.organizationId,
      accountRef: accountId,
      displayPhoneNumber:
        telefono?.trim() || cuenta.displayName?.trim() || cuenta.username?.trim() || null,
      token: PLATFORM_TOKEN,
      // El secreto es el de la plataforma: se resuelve al leer.
      webhookSecret: null,
    });
    const webhook = await asegurarWebhookPlataforma();
    if (!webhook.ok) console.error("[zernio-plataforma] webhook:", webhook.message);
    return volver("zernio=conectado");
  } catch (err) {
    console.error("[zernio-plataforma] error al cerrar la conexión:", err);
    return volver("zernio=error&motivo=zernio_error");
  }
}
