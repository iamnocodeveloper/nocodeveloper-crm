import { randomBytes } from "node:crypto";
import { getEnv } from "@/lib/env";
import { getIntegrationCredentials, setIntegrationWebhookSecret } from "@/server/saas/integrations";
import { ZERNIO_WA_EVENTS } from "@/server/whatsapp/zernio-events";
import { webhookUrl, webhookVerifyToken } from "@/server/whatsapp/webhook-url";
import { zernioFetch } from "@/server/zernio";
import {
  forgetZernioWebhooks,
  fetchZernioWebhooks,
  pointsHere,
  ZERNIO_MESSAGE_EVENT,
  ZERNIO_REACTION_EVENT,
} from "@/server/zernio/webhooks";

/**
 * K5 — WhatsApp por Zernio con la cuenta de la PLATAFORMA (docs.zernio.com,
 * «Multi-tenant»): una sola llave para todos los negocios, un perfil de Zernio
 * por negocio (`externalId` = id de la organización) y un único webhook que
 * cubre todas las cuentas. El negocio solo pulsa «Conectar» y escanea el QR
 * (coexistencia) o elige su número (solo API).
 */

export type ZernioPlataforma = { apiKey: string; webhookSecret: string | null };

/** La cuenta de Zernio de la plataforma, si está encendida y tiene llave. */
export async function zernioPlataforma(): Promise<ZernioPlataforma | null> {
  const c = await getIntegrationCredentials("zernio");
  if (!c?.enabled || !c.apiKey) return null;
  return { apiKey: c.apiKey, webhookSecret: c.webhookSecret };
}

type Perfil = { _id: string; name?: string; externalId?: string | null };

/** Puro: la lista de perfiles venga como venga (`profiles`, `data` o array). */
export function perfilesDe(json: unknown): Perfil[] {
  if (Array.isArray(json)) return json as Perfil[];
  const o = json as { profiles?: unknown; data?: unknown } | null;
  if (Array.isArray(o?.profiles)) return o.profiles as Perfil[];
  if (Array.isArray(o?.data)) return o.data as Perfil[];
  return [];
}

/** El perfil de Zernio del negocio; lo crea si no existe. */
export async function perfilDelNegocio(
  token: string,
  organizationId: string,
  nombre: string
): Promise<string> {
  const lista = perfilesDe(await zernioFetch("/profiles", { token, timeoutMs: 10_000 }));
  const ya = lista.find((p) => p.externalId === organizationId);
  if (ya) return ya._id;
  const creado = (await zernioFetch("/profiles", {
    method: "POST",
    token,
    timeoutMs: 10_000,
    body: {
      name: nombre.slice(0, 80) || organizationId,
      externalId: organizationId,
      description: "Negocio de Kooni",
    },
  })) as { profile?: Perfil } | null;
  const id = creado?.profile?._id;
  if (!id) throw new Error("Zernio no devolvió el perfil creado");
  return id;
}

/** ¿Ese perfil es de este negocio? (lo que vuelve en la redirección no es de fiar). */
export async function perfilEsDelNegocio(
  token: string,
  profileId: string,
  organizationId: string
): Promise<boolean> {
  const json = (await zernioFetch(`/profiles/${encodeURIComponent(profileId)}`, {
    token,
    timeoutMs: 10_000,
  })) as { profile?: Perfil } & Perfil;
  const p = json?.profile ?? json;
  return p?.externalId === organizationId;
}

export type ModoConexion = "coexistencia" | "api";

/** Puro: la consulta de `GET /connect/whatsapp`. */
export function consultaDeConexion(input: {
  profileId: string;
  redirectUrl: string;
  modo: ModoConexion;
  marca: string;
}): string {
  const q = new URLSearchParams({
    profileId: input.profileId,
    redirect_url: input.redirectUrl,
    // Sin `onboarding` Zernio ya hace coexistencia; se dice explícito.
    onboarding: input.modo === "api" ? "api" : "business_app",
    // Página de Zernio que abre el popup de Meta y conecta el número elegido.
    signup: "hosted",
    language: "es",
  });
  const marca = input.marca.trim().slice(0, 60);
  if (marca) q.set("brandName", marca);
  return q.toString();
}

/** La URL a la que se manda al negocio para conectar su WhatsApp. */
export async function urlDeConexion(input: {
  organizationId: string;
  nombreNegocio: string;
  modo: ModoConexion;
}): Promise<string> {
  const p = await zernioPlataforma();
  if (!p) throw new Error("La plataforma todavía no tiene Zernio conectado");
  const profileId = await perfilDelNegocio(p.apiKey, input.organizationId, input.nombreNegocio);
  const base = getEnv().APP_BASE_URL.replace(/\/$/, "");
  const json = (await zernioFetch(
    `/connect/whatsapp?${consultaDeConexion({
      profileId,
      redirectUrl: `${base}/api/settings/whatsapp-zernio/callback`,
      modo: input.modo,
      marca: input.nombreNegocio,
    })}`,
    { token: p.apiKey, timeoutMs: 15_000 }
  )) as { authUrl?: string } | null;
  if (!json?.authUrl) throw new Error("Zernio no devolvió el enlace de conexión");
  return json.authUrl;
}

/** Los eventos del webhook de la plataforma. */
export const EVENTOS_PLATAFORMA = [
  ...new Set([...ZERNIO_WA_EVENTS, ZERNIO_MESSAGE_EVENT, ZERNIO_REACTION_EVENT, "message.edited", "account.disconnected"]),
];

export type ResultadoWebhook =
  | { ok: true; creado: boolean; url: string }
  | { ok: false; message: string };

/**
 * Deja en Zernio UN webhook de la plataforma hacia esta instancia: todas las
 * cuentas (sin lista), con los eventos de WhatsApp y el secreto de firma que
 * guarda Kooni (lo genera si no hay). Nunca lanza.
 */
export async function asegurarWebhookPlataforma(): Promise<ResultadoWebhook> {
  const p = await zernioPlataforma();
  if (!p) return { ok: false, message: "Zernio no está activado o no tiene llave" };
  const url = webhookUrl("zernio");
  if (!url.startsWith("https://") && !process.env.ZERNIO_BASE_URL) {
    return { ok: false, message: "APP_BASE_URL no es https: Zernio no podría entregar mensajes" };
  }
  try {
    let secret = p.webhookSecret;
    if (!secret) {
      secret = randomBytes(24).toString("hex");
      await setIntegrationWebhookSecret("zernio", secret);
    }
    const segment = webhookVerifyToken();
    const existentes = await fetchZernioWebhooks(p.apiKey);
    const previo = existentes.find((w) => pointsHere(w, segment));
    const body = {
      name: `kooni-${new URL(getEnv().APP_BASE_URL).host}`.slice(0, 50),
      url,
      events: EVENTOS_PLATAFORMA,
      secret,
      isActive: true,
      // Vacío = todas las cuentas de la llave: los negocios nuevos entran solos.
      accountIds: [] as string[],
    };
    if (previo) {
      await zernioFetch("/webhooks/settings", {
        method: "PUT",
        token: p.apiKey,
        timeoutMs: 15_000,
        body: { webhookId: previo._id, ...body },
      });
    } else {
      await zernioFetch("/webhooks/settings", {
        method: "POST",
        token: p.apiKey,
        timeoutMs: 15_000,
        body,
      });
    }
    forgetZernioWebhooks(p.apiKey);
    return { ok: true, creado: !previo, url };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
