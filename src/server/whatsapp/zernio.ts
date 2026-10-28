import { normalizeMx } from "@/lib/meta/client";
import { BSUID_PREFIX, type ResolvedIdentity } from "@/server/inbox/identity";
import {
  ingestInboundMessage,
  ingestManualOutbound,
  type MediaInput,
} from "@/server/inbox/ingest";
import { applyStatusUpdate } from "@/server/inbox/status";
import { zernioFetch, zernioSentAtSeconds } from "@/server/zernio";
import {
  getWhatsappZernioCredentialsByAccountRef,
  type WhatsappZernioCredentials,
} from "@/server/whatsapp/zernio-credentials";

/**
 * 031 — WhatsApp por Zernio: entrada y salida.
 *
 * Zernio es otra puerta a la MISMA Cloud API de WhatsApp: los mensajes llegan
 * a los mismos contactos (teléfono normalizado o `bsuid:<id>`) y a la misma
 * bandeja que con Meta directo. Lo que cambia es el sobre: el evento de
 * Zernio en vez del webhook de Meta, y su endpoint de conversaciones en vez de
 * Graph `/messages`.
 *
 * Coexistencia: si el número sigue en la app de WhatsApp Business, lo que el
 * dueño escribe desde el teléfono llega como `message.sent` con
 * `source: "whatsapp_business_app"`. Se registra igual que los echoes de Meta
 * (008): saliente `origin='manual'`, pausa la IA y JAMÁS abre la ventana.
 */

export { ZERNIO_WA_EVENTS } from "@/server/whatsapp/zernio-events";

/** El evento de Zernio, en lo que a WhatsApp le importa (tipos de `@zernio/node`). */
export type ZernioWaEvent = {
  id?: string;
  event?: string;
  message?: {
    id?: string;
    conversationId?: string;
    platform?: string;
    platformMessageId?: string;
    direction?: "incoming" | "outgoing";
    text?: string | null;
    sentAt?: string;
    attachments?: { type?: string; url?: string; payload?: { voice?: boolean } }[];
    sender?: {
      id?: string;
      name?: string;
      phoneNumber?: string | null;
      businessScopedUserId?: string;
    };
    /** Solo en `message.sent`: de dónde salió el mensaje. */
    source?: "whatsapp_business_app" | "cloud_api" | "meta_business_agent";
    sentVia?: string | null;
  };
  conversation?: { id?: string; participantId?: string; participantName?: string };
  account?: { id?: string; accountId?: string; platform?: string; profileId?: string };
  error?: { code?: number; title?: string; message?: string } | null;
  statusAt?: string;
};

/** Puro: solo dígitos (Zernio pide el teléfono sin `+`). */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Puro: la identidad del cliente que escribe. El BSUID manda cuando viene
 * (Meta lo recomienda como ancla); si no, el teléfono, normalizado igual que
 * en el webhook de Meta para que el contacto sea el mismo por las dos puertas.
 */
export function identityFromSender(
  sender: NonNullable<ZernioWaEvent["message"]>["sender"],
  fallbackName?: string | null
): ResolvedIdentity | null {
  const name = sender?.name ?? fallbackName ?? null;
  const rawPhone = sender?.phoneNumber
    ? digitsOnly(sender.phoneNumber)
    : sender?.id && /^\d{6,}$/.test(sender.id)
      ? sender.id
      : null;
  const phone = rawPhone ? normalizeMx(rawPhone) : null;
  const bsuid = sender?.businessScopedUserId ?? null;
  if (phone) return { identity: phone, phone, waUserId: bsuid, profileName: name };
  if (bsuid) {
    return { identity: `${BSUID_PREFIX}${bsuid}`, phone: null, waUserId: bsuid, profileName: name };
  }
  return null;
}

/** Puro: el destinatario de un saliente (`conversation.participantId`). */
export function identityFromParticipant(
  conversation: ZernioWaEvent["conversation"]
): ResolvedIdentity | null {
  const id = conversation?.participantId?.trim();
  if (!id) return null;
  const name = conversation?.participantName ?? null;
  if (/^\+?\d{6,}$/.test(id)) {
    const phone = normalizeMx(digitsOnly(id));
    return { identity: phone, phone, waUserId: null, profileName: name };
  }
  return { identity: `${BSUID_PREFIX}${id}`, phone: null, waUserId: id, profileName: name };
}

/** Puro: tipo del mensaje en el vocabulario de la bandeja. */
export function messageTypeOf(
  attachments: NonNullable<ZernioWaEvent["message"]>["attachments"]
): "text" | MediaInput["kind"] {
  const t = (attachments?.[0]?.type ?? "").toLowerCase();
  if (!t) return "text";
  if (t === "image" || t === "sticker") return "image";
  if (t === "video") return "video";
  if (t === "audio") return "audio";
  return "document";
}

export type ZernioWaAction =
  | { kind: "inbound" }
  | { kind: "manual"; pauseAi: boolean }
  | { kind: "status"; status: "delivered" | "read" | "failed" }
  | { kind: "ignore"; reason: string };

/**
 * Puro: qué hacer con un evento.
 *
 * Los `message.sent` que salieron por la API (`sentVia: "api"`) son los que
 * mandó este mismo CRM: ya están en el hilo y no se registran otra vez. Los
 * del teléfono (coexistencia) y los del panel de Zernio los escribió una
 * persona: se registran y pausan la IA, como un echo de Meta.
 */
export function classifyZernioWaEvent(evt: ZernioWaEvent): ZernioWaAction {
  const event = evt.event ?? "message.received";
  if (event === "message.received") {
    if (evt.message?.direction === "outgoing") {
      return { kind: "ignore", reason: "saliente en message.received" };
    }
    return { kind: "inbound" };
  }
  if (event === "message.sent") {
    const source = evt.message?.source;
    const via = evt.message?.sentVia ?? null;
    if (source === "whatsapp_business_app") return { kind: "manual", pauseAi: true };
    if (via === "api" || via === "bulk-api") {
      return { kind: "ignore", reason: "enviado por la API (este CRM)" };
    }
    if (via === "human") return { kind: "manual", pauseAi: true };
    // Difusiones, secuencias o flujos de Zernio: se registran para que el hilo
    // cuente lo que el cliente recibió, pero no son una persona respondiendo.
    if (via) return { kind: "manual", pauseAi: false };
    return { kind: "ignore", reason: "origen desconocido" };
  }
  if (event === "message.delivered") return { kind: "status", status: "delivered" };
  if (event === "message.read") return { kind: "status", status: "read" };
  if (event === "message.failed") return { kind: "status", status: "failed" };
  return { kind: "ignore", reason: `evento ${event}` };
}

function mediaFrom(
  msg: NonNullable<ZernioWaEvent["message"]>,
  kind: MediaInput["kind"]
): MediaInput | null {
  const url = msg.attachments?.[0]?.url;
  if (!url) return null;
  return {
    kind,
    waMediaId: null,
    mimeType: null,
    fileName: null,
    caption: msg.text ?? null,
    // La media entrante de WhatsApp en Zernio exige su llave para bajarla.
    payload: { url, auth: "zernio" },
    fetchStatus: "pending",
  };
}

/**
 * Procesa un evento de WhatsApp que ya pasó la firma. Nunca lanza por un
 * evento malformado: lo descarta con aviso (el webhook responde 200 igual).
 */
export async function processZernioWhatsappEvent(payload: unknown): Promise<void> {
  const evt = payload as ZernioWaEvent;
  const accountRef = evt.account?.id ?? evt.account?.accountId;
  if (!accountRef || !evt.message) return;

  const creds = await getWhatsappZernioCredentialsByAccountRef(accountRef);
  if (!creds) {
    console.warn(`[zernio-wa] evento de una cuenta no conectada aquí (${accountRef}): descartado`);
    return;
  }

  const action = classifyZernioWaEvent(evt);
  const msg = evt.message;
  const threadRef = evt.conversation?.id ?? msg.conversationId ?? null;
  const waMessageId = msg.platformMessageId || (msg.id ? `zernio_${msg.id}` : null);

  if (action.kind === "ignore") return;

  if (action.kind === "status") {
    // El id guardado al enviar puede ser el `wamid` o el id de Zernio: se
    // prueba con los dos (la actualización es monotónica e idempotente).
    for (const id of [msg.platformMessageId, msg.id].filter((x): x is string => !!x)) {
      await applyStatusUpdate(creds.organizationId, {
        id,
        status: action.status,
        timestamp: zernioSentAtSeconds(evt.statusAt),
        errors: evt.error
          ? [{ code: evt.error.code ?? 0, title: evt.error.title, message: evt.error.message }]
          : undefined,
      });
    }
    return;
  }

  if (!waMessageId) return;
  const type = messageTypeOf(msg.attachments);
  const media = type === "text" ? null : mediaFrom(msg, type);

  if (action.kind === "inbound") {
    const identity = identityFromSender(msg.sender, evt.conversation?.participantName);
    if (!identity) {
      console.warn(`[zernio-wa] mensaje ${waMessageId} sin identidad utilizable: descartado`);
      return;
    }
    await ingestInboundMessage({
      organizationId: creds.organizationId,
      identity: { ...identity, channel: "whatsapp" },
      waMessageId,
      type,
      text: msg.text ?? null,
      timestamp: zernioSentAtSeconds(msg.sentAt),
      media,
      threadRef,
    });
    return;
  }

  const identity = identityFromParticipant(evt.conversation);
  if (!identity) {
    console.warn(`[zernio-wa] saliente ${waMessageId} sin destinatario: descartado`);
    return;
  }
  await ingestManualOutbound(creds.organizationId, {
    identity,
    waMessageId,
    type,
    text: msg.text ?? null,
    timestamp: zernioSentAtSeconds(msg.sentAt),
    media,
    threadRef,
    pauseAi: action.pauseAi,
  });
}

/** Puro: cuerpo de `POST /inbox/conversations` para abrir con plantilla. */
export function templateConversationBody(input: {
  accountRef: string;
  phone: string;
  name: string;
  language: string;
  params: readonly string[];
}): Record<string, unknown> {
  return {
    accountId: input.accountRef,
    participantId: digitsOnly(input.phone),
    templateName: input.name,
    templateLanguage: input.language,
    ...(input.params.length > 0 ? { templateParams: [...input.params] } : {}),
  };
}

/**
 * Manda una plantilla aprobada. Es la única forma de escribir primero o fuera
 * de la ventana de 24 h; Zernio devuelve el `wamid` y su conversación, que se
 * guarda como hilo para poder responder después.
 */
export async function sendZernioWaTemplate(
  creds: WhatsappZernioCredentials,
  input: { phone: string; name: string; language: string; params: readonly string[]; idempotencyKey?: string }
): Promise<{ waMessageId: string; threadRef: string | null }> {
  const res = (await zernioFetch("/inbox/conversations", {
    method: "POST",
    token: creds.token,
    body: templateConversationBody({ accountRef: creds.accountRef, ...input }),
    ...(input.idempotencyKey ? { headers: { "Idempotency-Key": input.idempotencyKey } } : {}),
  })) as { data?: { messageId?: string; conversationId?: string } } | null;
  const waMessageId = res?.data?.messageId ?? `zernio_${Date.now()}`;
  return { waMessageId, threadRef: res?.data?.conversationId ?? null };
}

/** Una plantilla de `GET /whatsapp/templates`. */
export type ZernioWaTemplate = {
  id?: string;
  name?: string;
  status?: string;
  category?: string;
  language?: string;
  rejected_reason?: string;
};

export async function listZernioWaTemplates(
  creds: WhatsappZernioCredentials
): Promise<ZernioWaTemplate[]> {
  const res = (await zernioFetch(
    `/whatsapp/templates?accountId=${encodeURIComponent(creds.accountRef)}`,
    { token: creds.token, timeoutMs: 10_000 }
  )) as { templates?: ZernioWaTemplate[] } | null;
  return Array.isArray(res?.templates) ? res.templates : [];
}

/** Crea la plantilla en Meta a través de Zernio (queda pendiente de revisión). */
export async function createZernioWaTemplate(
  creds: WhatsappZernioCredentials,
  input: { name: string; language: string; category: string; body: string; examples: string[] }
): Promise<{ id: string | null; status: string | null }> {
  const res = (await zernioFetch("/whatsapp/templates", {
    method: "POST",
    token: creds.token,
    timeoutMs: 15_000,
    body: {
      accountId: creds.accountRef,
      name: input.name,
      category: input.category,
      language: input.language,
      components: [
        {
          type: "body",
          text: input.body,
          ...(input.examples.length > 0 ? { example: { body_text: [input.examples] } } : {}),
        },
      ],
    },
  })) as { template?: { id?: string; status?: string } } | null;
  return { id: res?.template?.id ?? null, status: res?.template?.status ?? null };
}
