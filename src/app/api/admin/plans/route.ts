import { parseBody } from "@/lib/api";
import { listPlans, savePlan, withSuperadmin } from "@/server/saas/admin";
import { planSchema } from "@/server/saas/plan-schema";

export const dynamic = "force-dynamic";

export const GET = withSuperadmin(async () => Response.json({ plans: await listPlans() }));

export const POST = withSuperadmin(async (admin, req: Request) => {
  const body = await parseBody(req, planSchema);
  if (!body.ok) return body.response;
  const id = await savePlan(admin, null, body.data);
  return Response.json({ id }, { status: 201 });
});
