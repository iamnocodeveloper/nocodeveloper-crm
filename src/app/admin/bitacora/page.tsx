import Link from "next/link";
import { recentAudit } from "@/server/saas/admin";
import { PageTitle } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function BitacoraPage() {
  const log = await recentAudit(200);
  return (
    <>
      <PageTitle title="Bitácora" subtitle="Los últimos 200 cambios hechos desde este panel." />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Cuándo</th>
              <th className="px-4 py-2 font-medium">Quién</th>
              <th className="px-4 py-2 font-medium">Qué</th>
              <th className="px-4 py-2 font-medium">Negocio</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {log.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-2.5">{new Date(l.createdAt).toLocaleString("es")}</td>
                <td className="px-4 py-2.5">{l.actorEmail}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{l.action}</td>
                <td className="px-4 py-2.5">
                  {l.organizationId ? (
                    <Link href={`/admin/negocios/${l.organizationId}`} className="hover:underline">
                      {l.organizationId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Sin cambios todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
