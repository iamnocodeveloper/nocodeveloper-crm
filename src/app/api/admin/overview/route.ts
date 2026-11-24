import { overview, withSuperadmin } from "@/server/saas/admin";

export const dynamic = "force-dynamic";

export const GET = withSuperadmin(async () => Response.json(await overview()));
