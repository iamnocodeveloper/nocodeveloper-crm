import Link from "next/link";
import { listTenants } from "@/server/saas/admin";
import { PageTitle, STATUS_LABEL, StatusBadge, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; status?: string }> };

export default async function NegociosPage({ searchParams }: Props) {
  const { q, status } = await searchParams;
  const tenants = await listTenants({ q, status });
  return (
    <>
      <PageTitle title="Negocios" subtitle={`${tenants.length} negocio(s)`} />
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/negocios">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, correo o id"
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
        />
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">Todos</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Filtrar</button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Negocio</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">WhatsApp</th>
              <th className="px-4 py-2 text-right font-medium">Mensajes (mes)</th>
              <th className="px-4 py-2 text-right font-medium">Usuarios</th>
              <th className="px-4 py-2 font-medium">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tenants.map((t) => (
              <tr key={t.organizationId} className="hover:bg-secondary/40">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/negocios/${t.organizationId}`} className="font-medium hover:underline">
                    {t.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{t.ownerEmail ?? "—"}</span>
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={t.status} />
                  {t.status === "trial" && (
                    <span className="block text-xs text-muted-foreground">hasta {fmtDate(t.trialEndsAt)}</span>
                  )}
                </td>
                <td className="px-4 py-2.5">{t.planName ?? "—"}</td>
                <td className="px-4 py-2.5">
                  {t.whatsapp === "zernio" ? "Zernio" : t.whatsapp === "meta" ? "Meta" : "Sin conectar"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {t.outboundThisMonth}
                  {t.limit !== null && <span className="text-muted-foreground"> / {t.limit}</span>}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{t.members}</td>
                <td className="px-4 py-2.5">{fmtDate(t.createdAt)}</td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No hay negocios con ese filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
