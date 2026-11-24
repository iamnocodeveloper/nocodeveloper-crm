import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { withApiKey } from "@/server/api-v1/handler";

export const dynamic = "force-dynamic";

/** K6 — «Probar conexión» del plugin: a qué negocio va y si los avisos están encendidos. */
export const GET = withApiKey("read", async (session) => {
  const [org] = await getDb()
    .select({ name: schema.organization.name })
    .from(schema.organization)
    .where(eq(schema.organization.id, session.organizationId))
    .limit(1);
  const [ajustes] = await getDb()
    .select({ enabled: schema.storeSettings.enabled })
    .from(schema.storeSettings)
    .where(eq(schema.storeSettings.organizationId, session.organizationId))
    .limit(1);
  return Response.json({
    ok: true,
    business: org?.name ?? null,
    notifications: ajustes?.enabled ?? true,
  });
});
