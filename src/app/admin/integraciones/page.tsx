import { getEnv } from "@/lib/env";
import { INTEGRATION_FIELDS, listIntegrations } from "@/server/saas/integrations";
import { PageTitle } from "@/components/admin/ui";
import { IntegrationCard } from "@/components/admin/integration-card";

export const dynamic = "force-dynamic";

export default async function IntegracionesPage() {
  const integrations = await listIntegrations();
  const env = getEnv();
  // La URL que hay que pegar en Zernio (una sola para todos los negocios).
  const zernioWebhook = `${env.APP_BASE_URL.replace(/\/+$/, "")}/api/webhooks/zernio/${env.META_WEBHOOK_VERIFY_TOKEN}`;
  return (
    <>
      <PageTitle
        title="Integraciones"
        subtitle="Las conexiones de la plataforma. Las llaves se guardan cifradas y nunca se vuelven a enseñar."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {integrations.map((i) => (
          <IntegrationCard
            key={i.key}
            integration={i}
            meta={INTEGRATION_FIELDS[i.key]}
            webhookUrl={i.key === "zernio" ? zernioWebhook : null}
          />
        ))}
      </div>
    </>
  );
}
