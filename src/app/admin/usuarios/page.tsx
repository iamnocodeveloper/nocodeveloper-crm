import Link from "next/link";
import { listUsers } from "@/server/saas/admin";
import { PageTitle, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function UsuariosPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const users = await listUsers(q);
  return (
    <>
      <PageTitle title="Usuarios" subtitle={`${users.length} usuario(s)`} />
      <form className="mb-4 flex gap-2" action="/admin/usuarios">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre o correo"
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
        />
        <button className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Buscar</button>
      </form>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Usuario</th>
              <th className="px-4 py-2 font-medium">Negocio</th>
              <th className="px-4 py-2 font-medium">Rol</th>
              <th className="px-4 py-2 font-medium">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={`${u.id}-${u.organizationId ?? ""}`}>
                <td className="px-4 py-2.5">
                  <span className="font-medium">{u.name}</span>
                  <span className="block text-xs text-muted-foreground">{u.email}</span>
                </td>
                <td className="px-4 py-2.5">
                  {u.organizationId ? (
                    <Link href={`/admin/negocios/${u.organizationId}`} className="hover:underline">
                      {u.organizationName}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5">{u.role ?? "—"}</td>
                <td className="px-4 py-2.5">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
