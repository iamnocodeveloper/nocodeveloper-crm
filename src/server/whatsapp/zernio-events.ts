/**
 * 031 — Los eventos de Zernio que escucha WhatsApp. Aparte del transporte para
 * que el módulo de webhooks los use sin importar la ingesta (y sin ciclos).
 */
export const ZERNIO_WA_EVENTS = [
  "message.received",
  "message.sent",
  "message.delivered",
  "message.read",
  "message.failed",
] as const;
