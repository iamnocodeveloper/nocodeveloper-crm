import { withSuperadmin } from "@/server/saas/admin";
import { listIntegrations } from "@/server/saas/integrations";

export const dynamic = "force-dynamic";

export const GET = withSuperadmin(async () => Response.json({ integrations: await listIntegrations() }));
