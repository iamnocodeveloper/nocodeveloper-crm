import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { leerSesion } from "@/lib/auth/leer-sesion";
import { isSuperadminEmail } from "@/server/saas/mode";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export const metadata = { title: "Administración" };

/**
 * K4 — Panel del dueño de la plataforma.
 * - Sin sesión: al login, y de vuelta aquí al entrar.
 * - Con sesión de un correo que no es superadmin: lo dice, con el correo.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await leerSesion(await headers());
  if (!session) redirect("/login?next=/admin");

  if (!isSuperadminEmail(session.user.email)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">Sin acceso a la administración</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Has entrado como <strong>{session.user.email}</strong>, y ese correo no es administrador de la
            plataforma.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
            ← Volver al CRM
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground md:flex">
      <aside className="border-b bg-card md:min-h-dvh md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <div>
            <p className="text-lg font-semibold">Kooni</p>
            <p className="text-xs text-muted-foreground">Administración</p>
          </div>
          <Link href="/" className="text-xs text-primary hover:underline md:mt-2 md:inline-block">
            ← Ir al CRM
          </Link>
        </div>
        <AdminNav />
        <p className="hidden px-4 py-4 text-xs text-muted-foreground md:block">{session.user.email}</p>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
