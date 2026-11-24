import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import type { StoreNotifyRule } from "@/lib/db/schema";
import { normalizeMx } from "@/lib/meta/client";
import { getOrCreateContactByIdentity } from "@/server/inbox/identity";
import { getOrCreateConversation } from "@/server/inbox/ingest";
import { createLeadForContact } from "@/server/inbox/lead-activity";
import { sendText } from "@/server/inbox/send";
import { replyWindow } from "@/server/inbox/window";
import { canSendMore } from "@/server/saas/tenant";
import { sendTemplate } from "@/server/whatsapp/templates";
import {
  aCentimos,
  rellenar,
  telefonoE164,
  valorDePlantilla,
  type DatosAviso,
} from "@/server/tienda/formato";

/**
 * K6 — Lo que hace Kooni con cada pedido que manda el plugin de WooCommerce:
 * lo guarda, encuentra o crea el contacto por su teléfono, lo pone en el
 * pipeline con el importe y, si hay regla para ese estado, le avisa por
 * WhatsApp (plantilla aprobada, o texto si la ventana de 24 h está abierta).
 */

const texto = (max: number) => z.string().trim().max(max);

export const pedidoSchema = z.object({
  /** created = pedido nuevo; status_changed = cambió de estado; sync = importación (sin avisos). */
  event: z.enum(["created", "status_changed", "sync", "test"]),
  store: z.object({ url: texto(300).min(1), name: texto(120).optional() }),
  order: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    number: z.union([z.string(), z.number()]).transform(String).optional(),
    status: texto(60).min(1).transform((s) => s.replace(/^wc-/, "")),
    previous_status: texto(60).nullish(),
    total: z.union([z.string(), z.number()]).nullish(),
    currency: texto(3).nullish(),
    created_at: z.string().nullish(),
    customer: z
      .object({
        first_name: texto(80).nullish(),
        last_name: texto(80).nullish(),
        phone: texto(40).nullish(),
        email: texto(200).nullish(),
        country: texto(2).nullish(),
      })
      .default({}),
    items: z
      .array(
        z.object({
          name: texto(200),
          quantity: z.coerce.number().int().min(0).default(1),
          total: z.union([z.string(), z.number()]).nullish(),
        })
      )
      .max(200)
      .default([]),
    payment_url: texto(1000).nullish(),
    tracking: z
      .object({ number: texto(120).nullish(), url: texto(1000).nullish() })
      .nullish(),
    whatsapp_optin: z.boolean().nullish(),
  }),
});

export type PedidoEntrante = z.infer<typeof pedidoSchema>;

export type AjustesTienda = typeof schema.storeSettings.$inferSelect;

export async function ajustesTienda(organizationId: string): Promise<AjustesTienda> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.storeSettings)
    .where(eq(schema.storeSettings.organizationId, organizationId))
    .limit(1);
  if (row) return row;
  await db.insert(schema.storeSettings).values({ organizationId }).onConflictDoNothing();
  const [creada] = await db
    .select()
    .from(schema.storeSettings)
    .where(eq(schema.storeSettings.organizationId, organizationId))
    .limit(1);
  return creada!;
}

export type ResultadoPedido = {
  orderId: string;
  contactId: string | null;
  notified: { ok: boolean; message: string } | null;
};

/** Guarda el pedido y hace todo lo demás. Nunca lanza por un aviso fallido. */
export async function procesarPedido(
  organizationId: string,
  p: PedidoEntrante
): Promise<ResultadoPedido> {
  const db = getDb();
  const ajustes = await ajustesTienda(organizationId);
  const o = p.order;
  const nombre = [o.customer.first_name, o.customer.last_name].filter(Boolean).join(" ").trim();
  const phone = telefonoE164(o.customer.phone);
  const totalCents = aCentimos(o.total);
  const currency = o.currency?.toUpperCase() ?? null;
  const items = o.items.map((i) => ({
    name: i.name,
    quantity: i.quantity,
    totalCents: aCentimos(i.total),
  }));

  // 1. El contacto (solo si hay un teléfono utilizable).
  let contactId: string | null = null;
  if (phone) {
    const identidad = normalizeMx(phone);
    const { contact } = await getOrCreateContactByIdentity(organizationId, {
      identity: identidad,
      phone: identidad,
      waUserId: null,
      profileName: nombre || null,
    });
    contactId = contact.id;
  }

  // 2. El pedido (idempotente por tienda + id del pedido).
  const valores = {
    organizationId,
    storeUrl: p.store.url,
    externalId: o.id,
    number: o.number ?? o.id,
    status: o.status,
    totalCents,
    currency,
    customerName: nombre || null,
    phone,
    email: o.customer.email ?? null,
    items,
    paymentUrl: o.payment_url ?? null,
    trackingNumber: o.tracking?.number ?? null,
    trackingUrl: o.tracking?.url ?? null,
    optIn: o.whatsapp_optin ?? null,
    contactId,
    orderCreatedAt: o.created_at ? new Date(o.created_at) : null,
    updatedAt: new Date(),
  };
  const [guardado] = await db
    .insert(schema.storeOrder)
    .values({ id: newId("storeOrder"), ...valores })
    .onConflictDoUpdate({
      target: [schema.storeOrder.organizationId, schema.storeOrder.storeUrl, schema.storeOrder.externalId],
      set: valores,
    })
    .returning();
  const pedido = guardado!;

  await db
    .update(schema.storeSettings)
    .set({
      lastEventAt: new Date(),
      storeUrl: p.store.url,
      storeName: p.store.name ?? ajustes.storeName,
      updatedAt: new Date(),
    })
    .where(eq(schema.storeSettings.organizationId, organizationId));

  // 3. El pipeline: oportunidad con el importe del pedido.
  if (contactId && ajustes.createLeads && p.event !== "test") {
    await asegurarOportunidad(organizationId, contactId, totalCents, currency).catch((err) =>
      console.error("[tienda] no se pudo crear la oportunidad:", err)
    );
  }

  // 4. El aviso por WhatsApp.
  let notified: ResultadoPedido["notified"] = null;
  if (ajustes.enabled && (p.event === "created" || p.event === "status_changed")) {
    notified = await avisar(organizationId, pedido, ajustes, p.store.name ?? ajustes.storeName ?? "");
    if (notified) {
      const registro = [
        ...(pedido.notifications ?? []),
        { status: pedido.status, at: new Date().toISOString(), ...notified },
      ].slice(-30);
      await db
        .update(schema.storeOrder)
        .set({ notifications: registro })
        .where(eq(schema.storeOrder.id, pedido.id));
    }
  }

  return { orderId: pedido.id, contactId, notified };
}

async function asegurarOportunidad(
  organizationId: string,
  contactId: string,
  totalCents: number | null,
  currency: string | null
) {
  const db = getDb();
  const [lead] = await db
    .select({ id: schema.lead.id, amountCents: schema.lead.amountCents })
    .from(schema.lead)
    .where(eq(schema.lead.contactId, contactId))
    .limit(1);
  let leadId = lead?.id ?? null;
  if (!leadId) leadId = (await createLeadForContact({ organizationId, contactId }))?.id ?? null;
  // El importe solo se pone si nadie lo había puesto: no se pisa lo del dueño.
  if (leadId && totalCents !== null && (lead?.amountCents ?? null) === null) {
    await db
      .update(schema.lead)
      .set({ amountCents: totalCents, currency, lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.lead.id, leadId));
  }
}

type Pedido = typeof schema.storeOrder.$inferSelect;

/** Puro: ¿ya se avisó bien de este estado? (WooCommerce a veces dispara dos veces). */
export function yaAvisado(pedido: Pick<Pedido, "notifications" | "status">): boolean {
  return (pedido.notifications ?? []).some((n) => n.status === pedido.status && n.ok);
}

export function datosDelPedido(pedido: Pedido, tienda: string): DatosAviso {
  const [nombre, ...resto] = (pedido.customerName ?? "").split(" ");
  return {
    nombre: nombre || "",
    apellido: resto.join(" "),
    pedido: pedido.number ?? pedido.externalId,
    totalCents: pedido.totalCents,
    moneda: pedido.currency,
    estado: pedido.status,
    productos: (pedido.items ?? []).map((i) => ({ name: i.name, quantity: i.quantity })),
    tienda,
    seguimiento: pedido.trackingNumber,
    enlaceSeguimiento: pedido.trackingUrl,
    enlacePago: pedido.paymentUrl,
  };
}

async function avisar(
  organizationId: string,
  pedido: Pedido,
  ajustes: AjustesTienda,
  tienda: string
): Promise<{ ok: boolean; message: string } | null> {
  const regla: StoreNotifyRule | undefined = ajustes.rules?.[pedido.status];
  if (!regla?.enabled) return null;
  if (yaAvisado(pedido)) return null;
  if (ajustes.requireOptIn && pedido.optIn !== true) {
    return { ok: false, message: "El cliente no aceptó recibir avisos por WhatsApp" };
  }
  if (!pedido.contactId) return { ok: false, message: "El pedido no trae un teléfono válido" };

  const cupo = await canSendMore(organizationId);
  if (!cupo.ok) return { ok: false, message: cupo.message };

  const datos = datosDelPedido(pedido, tienda);
  try {
    const conv = await getOrCreateConversation(organizationId, pedido.contactId);
    const ventana = replyWindow("whatsapp", conv.lastInboundAt ?? null).operatorOpen;
    const texto = regla.text ? rellenar(regla.text, datos) : "";

    // Con la ventana abierta y texto escrito, el texto (más natural y gratis).
    if (ventana && texto) {
      await sendText({ conversationId: conv.id, organizationId, text: texto });
      return { ok: true, message: "Aviso enviado (texto)" };
    }
    if (regla.templateId) {
      await sendTemplate({
        organizationId,
        conversationId: conv.id,
        templateId: regla.templateId,
        variables: regla.variables.map((t) => valorDePlantilla(t, datos)),
      });
      return { ok: true, message: "Aviso enviado (plantilla)" };
    }
    return {
      ok: false,
      message: "Fuera de la ventana de 24 h y sin plantilla: elige una plantilla aprobada para este estado",
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "No se pudo enviar el aviso" };
  }
}

/** Los últimos pedidos del negocio (pantalla de ajustes). */
export async function ultimosPedidos(organizationId: string, limit = 25) {
  const rows = await getDb()
    .select()
    .from(schema.storeOrder)
    .where(and(eq(schema.storeOrder.organizationId, organizationId)))
    .orderBy(desc(schema.storeOrder.updatedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status,
    totalCents: r.totalCents,
    currency: r.currency,
    customerName: r.customerName,
    phone: r.phone,
    contactId: r.contactId,
    lastNotification: (r.notifications ?? []).at(-1) ?? null,
    updatedAt: r.updatedAt.toISOString(),
  }));
}
