import { parseBody } from "@/lib/api";
import { withApiKey } from "@/server/api-v1/handler";
import { pedidoSchema, procesarPedido } from "@/server/tienda/pedidos";

export const dynamic = "force-dynamic";

/**
 * K6 — El plugin de WooCommerce manda aquí cada pedido nuevo y cada cambio de
 * estado. Idempotente: el mismo pedido actualiza su fila y no repite avisos.
 */
export const POST = withApiKey("send", async (session, req: Request) => {
  const body = await parseBody(req, pedidoSchema);
  if (!body.ok) return body.response;
  const r = await procesarPedido(session.organizationId, body.data);
  return Response.json({ ok: true, ...r });
});
