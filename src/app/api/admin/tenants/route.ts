import { listTenants, withSuperadmin } from "@/server/saas/admin";

export const dynamic = "force-dynamic";

export const GET = withSuperadmin(async (_admin, req: Request) => {
  const url = new URL(req.url);
  const tenants = await listTenants({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  return Response.json({ tenants });
});
