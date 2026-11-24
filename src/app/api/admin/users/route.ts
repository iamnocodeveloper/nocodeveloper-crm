import { listUsers, withSuperadmin } from "@/server/saas/admin";

export const dynamic = "force-dynamic";

export const GET = withSuperadmin(async (_admin, req: Request) => {
  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  return Response.json({ users: await listUsers(q) });
});
