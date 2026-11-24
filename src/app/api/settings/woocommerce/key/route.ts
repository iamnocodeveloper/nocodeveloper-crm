import { apiError, withAuth } from "@/lib/api";
import { canConfigure } from "@/lib/auth/roles";
import { crearLlave } from "@/server/api-v1/llaves";

export const dynamic = "force-dynamic";

/**
 * K6 — Genera la llave que se pega en el plugin de WooCommerce: lee, opera y
 * envía (crea contactos y manda avisos). Se enseña UNA vez.
 */
export const POST = withAuth(async (session) => {
  if (!canConfigure(session.role)) {
    return apiError(403, "forbidden", "Solo el propietario puede conectar la tienda");
  }
  const r = await crearLlave({
    organizationId: session.organizationId,
    userId: session.userId,
    name: "WooCommerce",
    scopes: ["read", "operate", "send"],
  });
  if ("error" in r) {
    return apiError(409, "limite", "Ya tienes el máximo de llaves. Revoca alguna en Ajustes → API.");
  }
  return Response.json({ key: r.valor, last4: r.llave.last4 }, { status: 201 });
});
