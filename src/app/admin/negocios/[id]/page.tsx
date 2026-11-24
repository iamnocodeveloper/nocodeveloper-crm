import Link from "next/link";
import { notFound } from "next/navigation";
import { listPlans, tenantDetail } from "@/server/saas/admin";
import { PageTitle, Stat, StatusBadge, fmtDate } from "@/components/admin/ui";
import { TenantEditor } from "@/components/admin/tenant-editor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function NegocioPage({ params }: Props) {
  const { id } = await params;
  const [d, plans] = await Promise.all([tenantDetail(id), listPlans()]);
  if (!d) notFound();
  const s = d.summary;
  return (
    <>
      <Link href="/admin/negocios" className="text-xs text-primary hover:underline">
        ← Negocios
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <PageTitle title={d.organization.name} subtitle={`Alta: ${fmtDate(d.organization.createdAt)} · ${d.organization.id}`} />
        <StatusBadge status={d.tenant?.status ?? null} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Mensajes este mes"
          value={s?.outboundThisMonth ?? 0}
          hint={s?.limit != null ? `de ${s.limit}` : "sin límite"}
        />
        <Stat label="Contactos" value={d.counts.contacts} />
        <Stat label="Conversaciones" value={d.counts.conversations} />
        <Stat
          label="WhatsApp"
          value={s?.whatsapp === "zernio" ? "Zernio" : s?.whatsapp === "meta" ? "Meta" : "—"}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
        <TenantEditor
          organizationId={d.organization.id}
          name={d.organization.name}
          tenant={d.tenant}
          plans={plans.filter((p) => !p.archived || p.id === d.tenant?.planId).map((p) => ({ id: p.id, name: p.name }))}
        />

        <div className="space-y-6">
          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-4 py-3 font-medium">Usuarios ({d.users.length})</h2>
            <ul className="divide-y">
              {d.users.map((u) => (
                <li key={u.userId} className="px-4 py-2.5 text-sm">
                  <span className="font-medium">{u.name}</span>{" "}
                  <span className="text-xs text-muted-foreground">({u.role})</span>
                  <span className="block text-xs text-muted-foreground">{u.email}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-4 py-3 font-medium">Historial</h2>
            <ul className="divide-y">
              {d.log.map((l) => (
                <li key={l.id} className="px-4 py-2.5 text-xs">
                  <span className="font-mono">{l.action}</span>
                  <span className="block text-muted-foreground">
                    {l.actorEmail} · {new Date(l.createdAt).toLocaleString("es")}
                  </span>
                </li>
              ))}
              {d.log.length === 0 && <li className="px-4 py-4 text-xs text-muted-foreground">Sin cambios.</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
