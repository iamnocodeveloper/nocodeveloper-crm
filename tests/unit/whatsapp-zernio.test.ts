import { describe, expect, it } from "vitest";
import {
  classifyZernioWaEvent,
  identityFromParticipant,
  identityFromSender,
  messageTypeOf,
  templateConversationBody,
  type ZernioWaEvent,
} from "@/server/whatsapp/zernio";
import { parseWhatsappZernioFlag } from "@/server/whatsapp/zernio-flag";
import { zernioMediaUrl } from "@/server/whatsapp/media";
import { zernioTargetChannel } from "@/server/zernio/dispatch";
import { pickZernioAccount } from "@/server/zernio/cuentas";

/**
 * 031 — WhatsApp por Zernio. Las formas de los eventos salen de los tipos del
 * SDK oficial (`@zernio/node`): `InboxWebhookMessage`,
 * `WebhookPayloadMessageSent` y `WebhookPayloadMessageDeliveryStatus`.
 */

const sent = (message: ZernioWaEvent["message"]): ZernioWaEvent => ({
  event: "message.sent",
  message,
  account: { id: "acc_wa", platform: "whatsapp" },
});

describe("classifyZernioWaEvent (031)", () => {
  it("message.received entrante → ingesta", () => {
    expect(
      classifyZernioWaEvent({ event: "message.received", message: { direction: "incoming" } })
    ).toEqual({ kind: "inbound" });
  });

  it("coexistencia: lo escrito desde la app del teléfono es manual y pausa la IA", () => {
    expect(classifyZernioWaEvent(sent({ source: "whatsapp_business_app", sentVia: null }))).toEqual({
      kind: "manual",
      pauseAi: true,
    });
  });

  it("lo que mandó este CRM por la API no se registra dos veces", () => {
    expect(classifyZernioWaEvent(sent({ source: "cloud_api", sentVia: "api" })).kind).toBe("ignore");
  });

  it("una persona desde el panel de Zernio pausa la IA; una difusión no", () => {
    expect(classifyZernioWaEvent(sent({ source: "cloud_api", sentVia: "human" }))).toEqual({
      kind: "manual",
      pauseAi: true,
    });
    expect(classifyZernioWaEvent(sent({ source: "cloud_api", sentVia: "broadcast" }))).toEqual({
      kind: "manual",
      pauseAi: false,
    });
  });

  it("acuses de entrega → estado", () => {
    expect(classifyZernioWaEvent({ event: "message.read" })).toEqual({ kind: "status", status: "read" });
    expect(classifyZernioWaEvent({ event: "message.failed" })).toEqual({ kind: "status", status: "failed" });
  });
});

describe("identidad del contacto (031)", () => {
  it("teléfono E.164 → identidad normalizada igual que con Meta (521 → 52)", () => {
    expect(identityFromSender({ phoneNumber: "+5215512345678", name: "Ana" })).toEqual({
      identity: "525512345678",
      phone: "525512345678",
      waUserId: null,
      profileName: "Ana",
    });
  });

  it("sin teléfono, el BSUID es la identidad", () => {
    expect(identityFromSender({ id: "US.abc", businessScopedUserId: "US.abc" })).toMatchObject({
      identity: "bsuid:US.abc",
      phone: null,
      waUserId: "US.abc",
    });
  });

  it("sin nada utilizable → null (se descarta sin romper el webhook)", () => {
    expect(identityFromSender({ name: "Sin datos" })).toBeNull();
  });

  it("el destinatario de un saliente sale de participantId", () => {
    expect(identityFromParticipant({ participantId: "573001112233" })).toMatchObject({
      identity: "573001112233",
      phone: "573001112233",
    });
  });
});

describe("piezas puras (031)", () => {
  it("tipo de mensaje por adjunto", () => {
    expect(messageTypeOf([])).toBe("text");
    expect(messageTypeOf([{ type: "image", url: "u" }])).toBe("image");
    expect(messageTypeOf([{ type: "file", url: "u" }])).toBe("document");
  });

  it("cuerpo para abrir con plantilla: teléfono sin +, parámetros en orden", () => {
    expect(
      templateConversationBody({
        accountRef: "acc_wa",
        phone: "+52 55 1234 5678",
        name: "seguimiento",
        language: "es_MX",
        params: ["Ana", "martes"],
      })
    ).toEqual({
      accountId: "acc_wa",
      participantId: "525512345678",
      templateName: "seguimiento",
      templateLanguage: "es_MX",
      templateParams: ["Ana", "martes"],
    });
  });

  it("la bandera está apagada salvo que se encienda", () => {
    expect(parseWhatsappZernioFlag(undefined)).toBe(false);
    expect(parseWhatsappZernioFlag("on")).toBe(true);
    expect(parseWhatsappZernioFlag("off")).toBe(false);
  });

  it("solo los adjuntos marcados como de Zernio usan su llave", () => {
    expect(zernioMediaUrl({ url: "https://zernio.com/api/v1/whatsapp/media/1", auth: "zernio" })).toBe(
      "https://zernio.com/api/v1/whatsapp/media/1"
    );
    expect(zernioMediaUrl({ url: "https://x.test/a" })).toBeNull();
  });

  it("el reparto manda los eventos de WhatsApp a WhatsApp", () => {
    expect(zernioTargetChannel({ account: { platform: "whatsapp" } })).toBe("whatsapp");
    expect(zernioTargetChannel({ account: { platform: "instagram" } })).toBe("instagram");
  });

  it("elegir la cuenta de WhatsApp entre las de la llave", () => {
    const pick = pickZernioAccount(
      [
        { _id: "a1", platform: "instagram" },
        { _id: "a2", platform: "whatsapp", displayName: "+52 55 0000 0000" },
      ],
      null,
      "whatsapp"
    );
    expect(pick.ok && pick.account._id).toBe("a2");
  });
});
