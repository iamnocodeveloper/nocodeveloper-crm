import Link from "next/link";
import { notFound } from "next/navigation";
import { getSuperadmin } from "@/server/saas/admin";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kooni · Administración" };

/**
 * K4 — Panel del dueño de la plataforma. Quien no es superadmin ve un 404:
 * no se revela que el panel existe.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSuperadmin();
  if (!admin) notFound();
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
        <p className="hidden px-4 py-4 text-xs text-muted-foreground md:block">{admin.email}</p>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
