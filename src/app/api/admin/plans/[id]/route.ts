import { parseBody } from "@/lib/api";
import { savePlan, withSuperadmin } from "@/server/saas/admin";
import { planSchema } from "@/server/saas/plan-schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const PUT = withSuperadmin(async (admin, req: Request, { params }: Params) => {
  const { id } = await params;
  const body = await parseBody(req, planSchema);
  if (!body.ok) return body.response;
  await savePlan(admin, id, body.data);
  return Response.json({ ok: true });
});
