import { after } from "next/server";
import { getEnv } from "@/lib/env";
import { isValidWebhookToken } from "@/server/inbox/webhook";
import { channelDisabledResponse } from "@/server/channels/enabled";
import { whatsappZernioEnabled } from "@/server/whatsapp/zernio-flag";
import { zernioSignatureFrom } from "@/server/zernio";
import { isAuthenticZernioDelivery, processZernioPayload } from "@/server/zernio/dispatch";

/**
 * 031 — Webhook de Zernio para WhatsApp por la API oficial.
 *
 * Mismo patrón de dos capas que las demás rutas de Zernio: el segmento
 * [webhookToken] debe coincidir (si no → 404 sin efectos) y encima la firma.
 * Ruta propia porque las otras dependen de que Instagram, Messenger o TikTok
 * estén encendidos, y una instancia de solo WhatsApp no tiene ninguno.
 *
 * Zernio entrega todas las plataformas de una llave por el mismo webhook:
 * `processZernioPayload` reparte por plataforma, así que aquí también entran
 * los DMs de los canales opcionales si están conectados.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ webhookToken: string }> };

/** Zernio no hace handshake; esto sirve para comprobar la URL a mano. */
export async function GET(_req: Request, { params }: Params) {
  if (!whatsappZernioEnabled()) return channelDisabledResponse();
  const { webhookToken } = await params;
  if (!isValidWebhookToken(webhookToken, getEnv().META_WEBHOOK_VERIFY_TOKEN)) {
    return new Response(null, { status: 404 });
  }
  return Response.json({ ok: true });
}

export async function POST(req: Request, { params }: Params) {
  if (!whatsappZernioEnabled()) return channelDisabledResponse();
  const { webhookToken } = await params;
  if (!isValidWebhookToken(webhookToken, getEnv().META_WEBHOOK_VERIFY_TOKEN)) {
    return new Response(null, { status: 404 });
  }

  const rawBody = await req.text();

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Cuerpo ilegible: 200 igualmente para que la fuente no reintente en vano.
    return Response.json({ received: true });
  }

  // Sin la firma, quien conozca la URL podría inyectar mensajes y hacer que el
  // agente conteste de verdad a un número real.
  if (!(await isAuthenticZernioDelivery(rawBody, zernioSignatureFrom(req.headers)))) {
    return new Response(null, { status: 401 });
  }

  // Zernio corta a los 5 segundos y reintenta: se acusa recibo YA y se procesa
  // fuera de la ruta.
  after(async () => {
    try {
      await processZernioPayload(payload);
    } catch (err) {
      console.error("[zernio-wa] error procesando payload:", err);
    }
  });

  return Response.json({ received: true });
}
