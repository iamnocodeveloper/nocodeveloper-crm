/**
 * K6 — Lo puro de las tiendas: estados de WooCommerce, variables de los
 * avisos y teléfonos. Sin base de datos, para poder probarlo solo.
 */

/** Estados de WooCommerce, en el orden en que se enseñan. */
export const ESTADOS_PEDIDO: { slug: string; label: string; sugerido: string }[] = [
  {
    slug: "pending",
    label: "Pendiente de pago",
    sugerido: "Hola {nombre}, recibimos tu pedido #{pedido} por {total}. Puedes completar el pago aquí: {enlace_pago}",
  },
  {
    slug: "processing",
    label: "Procesando",
    sugerido: "¡Gracias por tu compra, {nombre}! Tu pedido #{pedido} por {total} ya está en preparación.",
  },
  {
    slug: "on-hold",
    label: "En espera",
    sugerido: "Hola {nombre}, tu pedido #{pedido} está en espera. Te avisamos en cuanto avance.",
  },
  {
    slug: "completed",
    label: "Completado",
    sugerido: "¡Listo, {nombre}! Tu pedido #{pedido} está completado. {seguimiento}",
  },
  {
    slug: "cancelled",
    label: "Cancelado",
    sugerido: "Hola {nombre}, tu pedido #{pedido} fue cancelado. Si fue un error, respóndenos por aquí.",
  },
  {
    slug: "refunded",
    label: "Reembolsado",
    sugerido: "Hola {nombre}, te reembolsamos {total} del pedido #{pedido}.",
  },
  {
    slug: "failed",
    label: "Pago fallido",
    sugerido: "Hola {nombre}, el pago de tu pedido #{pedido} no se completó. Puedes intentarlo otra vez aquí: {enlace_pago}",
  },
];

/**
 * K6 — Plantillas listas para mandar a aprobación (categoría UTILIDAD).
 * Reglas de Meta que cumplen: ninguna variable al principio ni al final del
 * texto, sin tono promocional, y un ejemplo por variable. `variables` dice
 * qué dato del pedido va en cada {{n}}.
 */
export const PLANTILLAS_PEDIDO: {
  slug: string;
  name: string;
  body: string;
  variables: string[];
  examples: string[];
}[] = [
  {
    slug: "pending",
    name: "kooni_pedido_pendiente",
    body: "Hola {{1}}, recibimos tu pedido n.º {{2}} por {{3}}. Puedes completar el pago en este enlace: {{4}} . Gracias por tu compra.",
    variables: ["{nombre}", "{pedido}", "{total}", "{enlace_pago}"],
    examples: ["Ana", "1234", "$450.00", "https://tutienda.com/pagar/1234"],
  },
  {
    slug: "processing",
    name: "kooni_pedido_procesando",
    body: "Hola {{1}}, tu pedido n.º {{2}} por {{3}} está en preparación. Te avisaremos por aquí cuando salga.",
    variables: ["{nombre}", "{pedido}", "{total}"],
    examples: ["Ana", "1234", "$450.00"],
  },
  {
    slug: "on-hold",
    name: "kooni_pedido_en_espera",
    body: "Hola {{1}}, tu pedido n.º {{2}} está en espera. Te escribiremos en cuanto avance.",
    variables: ["{nombre}", "{pedido}"],
    examples: ["Ana", "1234"],
  },
  {
    slug: "completed",
    name: "kooni_pedido_completado",
    body: "Hola {{1}}, tu pedido n.º {{2}} está completado. Número de seguimiento: {{3}}. Gracias por confiar en nosotros.",
    variables: ["{nombre}", "{pedido}", "{seguimiento}"],
    examples: ["Ana", "1234", "MX123456789"],
  },
  {
    slug: "cancelled",
    name: "kooni_pedido_cancelado",
    body: "Hola {{1}}, tu pedido n.º {{2}} fue cancelado. Si tienes alguna duda, responde a este mensaje.",
    variables: ["{nombre}", "{pedido}"],
    examples: ["Ana", "1234"],
  },
  {
    slug: "refunded",
    name: "kooni_pedido_reembolsado",
    body: "Hola {{1}}, te reembolsamos {{2}} del pedido n.º {{3}}. El abono puede tardar unos días en verse en tu cuenta.",
    variables: ["{nombre}", "{total}", "{pedido}"],
    examples: ["Ana", "$450.00", "1234"],
  },
  {
    slug: "failed",
    name: "kooni_pedido_pago_fallido",
    body: "Hola {{1}}, el pago de tu pedido n.º {{2}} no se completó. Puedes intentarlo otra vez en este enlace: {{3}} . Si necesitas ayuda, responde a este mensaje.",
    variables: ["{nombre}", "{pedido}", "{enlace_pago}"],
    examples: ["Ana", "1234", "https://tutienda.com/pagar/1234"],
  },
];

export function etiquetaEstado(slug: string): string {
  return ESTADOS_PEDIDO.find((e) => e.slug === slug)?.label ?? slug;
}

/** Las variables que se pueden usar en los avisos. */
export const VARIABLES = [
  { token: "{nombre}", label: "Nombre del cliente" },
  { token: "{apellido}", label: "Apellido" },
  { token: "{pedido}", label: "Número de pedido" },
  { token: "{total}", label: "Total con moneda" },
  { token: "{estado}", label: "Estado del pedido" },
  { token: "{productos}", label: "Productos (resumen)" },
  { token: "{tienda}", label: "Nombre de la tienda" },
  { token: "{seguimiento}", label: "Número de seguimiento" },
  { token: "{enlace_seguimiento}", label: "Enlace de seguimiento" },
  { token: "{enlace_pago}", label: "Enlace de pago" },
] as const;

export type DatosAviso = {
  nombre: string;
  apellido: string;
  pedido: string;
  totalCents: number | null;
  moneda: string | null;
  estado: string;
  productos: { name: string; quantity: number }[];
  tienda: string;
  seguimiento: string | null;
  enlaceSeguimiento: string | null;
  enlacePago: string | null;
};

/** Puro: importe legible ("$1.250,00 MXN" → según el locale). */
export function formatoTotal(cents: number | null, moneda: string | null): string {
  if (cents === null) return "";
  const cur = (moneda ?? "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("es", { style: "currency", currency: cur }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${cur}`;
  }
}

/** Puro: "2× Camiseta, Gorra y 3 más". */
export function resumenProductos(items: { name: string; quantity: number }[]): string {
  const partes = items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name));
  if (partes.length <= 3) return partes.join(", ");
  return `${partes.slice(0, 3).join(", ")} y ${partes.length - 3} más`;
}

/** Puro: sustituye las variables. Lo que no existe queda vacío. */
export function rellenar(texto: string, d: DatosAviso): string {
  const valores: Record<string, string> = {
    "{nombre}": d.nombre,
    "{apellido}": d.apellido,
    "{pedido}": d.pedido,
    "{total}": formatoTotal(d.totalCents, d.moneda),
    "{estado}": etiquetaEstado(d.estado),
    "{productos}": resumenProductos(d.productos),
    "{tienda}": d.tienda,
    "{seguimiento}": d.seguimiento ?? "",
    "{enlace_seguimiento}": d.enlaceSeguimiento ?? "",
    "{enlace_pago}": d.enlacePago ?? "",
  };
  return texto
    .replace(/\{[a-z_]+\}/g, (t) => (t in valores ? valores[t]! : t))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Puro: un valor de variable de plantilla nunca puede ir vacío (Meta lo
 * rechaza), así que lo vacío se cambia por un guion.
 */
export function valorDePlantilla(token: string, d: DatosAviso): string {
  const v = rellenar(token, d);
  return v || "-";
}

/** Puro: solo dígitos, con prefijo de país. null si no parece un teléfono. */
export function telefonoE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** Puro: el importe en céntimos de "1250.5" / 1250.5 / "1,250.50". */
export function aCentimos(total: string | number | null | undefined): number | null {
  if (total === null || total === undefined || total === "") return null;
  const n = typeof total === "number" ? total : Number(String(total).replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
