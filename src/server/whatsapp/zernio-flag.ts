/**
 * 031 — Si esta instancia puede conectar WhatsApp por Zernio.
 *
 * Zernio es un proveedor de la API oficial de WhatsApp aparte de Meta directo:
 * misma Cloud API, otra puerta (su llave, su webhook, sus plantillas). Entra
 * como conector opcional (constitución II, ADR-001): apagado por defecto, la
 * migración se aplica igual y, sin la bandera, su ruta y su pantalla dan 404.
 *
 * Se lee de `process.env` directo, igual que `agendaEnabled()`: preguntar si
 * una feature existe no puede depender de que TODO el entorno valide.
 */

const ON_VALUES = new Set(["on", "1", "true", "si", "sí", "yes"]);

export function parseWhatsappZernioFlag(raw: string | undefined): boolean {
  return ON_VALUES.has((raw ?? "").trim().toLowerCase());
}

export function whatsappZernioEnabled(): boolean {
  return parseWhatsappZernioFlag(process.env.WHATSAPP_ZERNIO);
}
