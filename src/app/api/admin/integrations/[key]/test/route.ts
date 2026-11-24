import { apiError } from "@/lib/api";
import { withSuperadmin } from "@/server/saas/admin";
import { isIntegrationKey, testIntegration } from "@/server/saas/integrations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string }> };

export const POST = withSuperadmin(async (_admin, _req: Request, { params }: Params) => {
  const { key } = await params;
  if (!isIntegrationKey(key)) return apiError(404, "not_found", "Integración desconocida");
  return Response.json(await testIntegration(key));
});
