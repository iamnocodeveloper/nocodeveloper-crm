import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { channelDisabledResponse } from "@/server/channels/enabled";
import {
  deleteWhatsappZernioCredentials,
  getWhatsappZernioCredentialsByOrg,
  saveWhatsappZernioCredentials,
} from "@/server/whatsapp/zernio-credentials";
import { whatsappZernioEnabled } from "@/server/whatsapp/zernio-flag";
import { tokenLast4 } from "@/server/whatsapp/credentials";
import { webhookUrl } from "@/server/whatsapp/webhook-url";
import { ensureWebhookForOrg } from "@/server/zernio/conexiones";
import { accountHealth, zernioAccountName } from "@/server/zernio/cuentas";
import { resolveZernioAccount } from "@/server/zernio/guardar";

export const dynamic = "force-dynamic";

/** 031 — Estado de WhatsApp por Zernio (la llave nunca sale entera). */
export const GET = withAuth(async (session) => {
  if (!whatsappZernioEnabled()) return channelDisabledResponse();
  const creds = await getWhatsappZernioCredentialsByOrg(session.organizationId);
  return Response.json({
    webhookUrl: webhookUrl("zernio"),
    connection: creds
      ? {
          accountRef: creds.accountRef,
          displayPhoneNumber: creds.displayPhoneNumber,
          status: creds.status,
          tokenLast4: tokenLast4(creds.token),
          hasWebhookSecret: Boolean(creds.webhookSecret),
        }
      : null,
  });
});

const putSchema = z.object({
  /** `accountId` de la cuenta de WhatsApp en Zernio. Opcional si la llave tiene una sola. */
  accountRef: z.string().trim().min(1).nullish(),
  token: z.string().trim().min(1),
  webhookSecret: z.string().trim().min(1).nullish(),
});

/**
 * Conecta WhatsApp por Zernio: valida la llave y la cuenta contra Zernio ANTES
 * de guardar, cifra, retira la conexión de Meta directo (un solo transporte) y
 * da de alta el webhook con los eventos de WhatsApp. Solo el propietario.
 */
export const PUT = withAuth(async (session, req: Request) => {
  if (!whatsappZernioEnabled()) return channelDisabledResponse();
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede conectar WhatsApp");
  }
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;

  const cuenta = await resolveZernioAccount(body.data.token, body.data.accountRef, "whatsapp");
  if (!cuenta.ok) return cuenta.response;

  const previa = await getWhatsappZernioCredentialsByOrg(session.organizationId);
  const displayPhoneNumber =
    cuenta.account.displayName?.trim() || cuenta.account.username?.trim() || null;
  await saveWhatsappZernioCredentials({
    organizationId: session.organizationId,
    accountRef: cuenta.account._id,
    displayPhoneNumber,
    token: body.data.token,
    // Sin secreto nuevo se conserva el que había: reconectar no apaga la firma.
    webhookSecret: body.data.webhookSecret ?? previa?.webhookSecret ?? null,
  });
  const webhook = await ensureWebhookForOrg(session.organizationId, {
    secret: body.data.webhookSecret,
  });

  return Response.json({
    ok: true,
    accountRef: cuenta.account._id,
    accountName: zernioAccountName(cuenta.account),
    health: accountHealth(cuenta.account, "whatsapp"),
    webhook,
  });
});

/** Desconecta WhatsApp por Zernio. Conversaciones y contactos se quedan. */
export const DELETE = withAuth(async (session) => {
  if (!whatsappZernioEnabled()) return channelDisabledResponse();
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede desconectar WhatsApp");
  }
  await deleteWhatsappZernioCredentials(session.organizationId);
  return Response.json({ ok: true });
});
