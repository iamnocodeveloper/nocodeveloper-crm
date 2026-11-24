import Link from "next/link";
import { listTenants, overview, recentAudit } from "@/server/saas/admin";
import { listIntegrations } from "@/server/saas/integrations";
import { PageTitle, Stat, StatusBadge, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [o, tenants, integrations, log] = await Promise.all([
    overview(),
    listTenants(),
    listIntegrations(),
    recentAudit(8),
  ]);
  const pending = integrations.filter((i) => !i.enabled || !i.hasSecret);
  return (
    <>
      <PageTitle title="Resumen" subtitle="Cómo va la plataforma hoy." />

      {pending.length > 0 && (
        <div className="mb-6 rounded-lg border border-warning-soft bg-warning-tint px-4 py-3 text-sm text-warning-text">
          Falta conectar: {pending.map((i) => (i.key === "waha" ? "WAHA" : "Zernio")).join(" y ")}.{" "}
          <Link href="/admin/integraciones" className="font-medium underline">
            Ir a Integraciones →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Negocios" value={o.organizations} hint={`+${o.newOrganizations7d} en 7 días`} />
        <Stat label="Activos / en prueba" value={`${o.status.active ?? 0} / ${o.status.trial ?? 0}`} />
        <Stat label="Suspendidos" value={(o.status.suspended ?? 0) + (o.status.past_due ?? 0)} />
        <Stat label="Usuarios" value={o.users} />
        <Stat label="Mensajes enviados (mes)" value={o.outboundThisMonth} />
        <Stat label="Mensajes recibidos (mes)" value={o.inboundThisMonth} />
        <Stat label="Números Zernio" value={o.whatsappNumbers.zernio} />
        <Stat label="Números Meta directo" value={o.whatsappNumbers.meta} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium">Últimos negocios</h2>
            <Link href="/admin/negocios" className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="divide-y">
            {tenants.slice(0, 8).map((t) => (
              <li key={t.organizationId}>
                <Link
                  href={`/admin/negocios/${t.organizationId}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-secondary/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{t.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.ownerEmail ?? "—"} · {fmtDate(t.createdAt)}
                    </span>
                  </span>
                  <StatusBadge status={t.status} />
                </Link>
              </li>
            ))}
            {tenants.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">Todavía no hay negocios.</li>
            )}
          </ul>
        </section>

        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium">Últimos cambios</h2>
            <Link href="/admin/bitacora" className="text-xs text-primary hover:underline">
              Bitácora
            </Link>
          </div>
          <ul className="divide-y">
            {log.map((l) => (
              <li key={l.id} className="px-4 py-2.5 text-sm">
                <span className="font-mono text-xs">{l.action}</span>
                <span className="block text-xs text-muted-foreground">
                  {l.actorEmail} · {new Date(l.createdAt).toLocaleString("es")}
                </span>
              </li>
            ))}
            {log.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">Sin cambios todavía.</li>
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
