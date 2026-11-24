import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { audit, withSuperadmin } from "@/server/saas/admin";
import { isIntegrationKey, saveIntegration } from "@/server/saas/integrations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string }> };

const bodySchema = z.object({
  enabled: z.boolean(),
  config: z.record(z.string(), z.string()),
  // undefined = no tocar la llave guardada; "" = borrarla.
  apiKey: z.string().max(500).optional(),
  webhookSecret: z.string().max(500).optional(),
});

export const PUT = withSuperadmin(async (admin, req: Request, { params }: Params) => {
  const { key } = await params;
  if (!isIntegrationKey(key)) return apiError(404, "not_found", "Integración desconocida");
  const body = await parseBody(req, bodySchema);
  if (!body.ok) return body.response;
  await saveIntegration(key, body.data, admin.email);
  // En la bitácora nunca va la llave: solo si se cambió.
  await audit(admin, `integration.${key}.update`, null, {
    enabled: body.data.enabled,
    config: body.data.config,
    apiKeyChanged: body.data.apiKey !== undefined,
    webhookSecretChanged: body.data.webhookSecret !== undefined,
  });
  return Response.json({ ok: true });
});
