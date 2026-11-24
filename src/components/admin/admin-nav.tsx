"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, Gauge, History, Plug, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Resumen", icon: Gauge, exact: true },
  { href: "/admin/negocios", label: "Negocios", icon: Building2 },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/planes", label: "Planes", icon: CreditCard },
  { href: "/admin/integraciones", label: "Integraciones", icon: Plug },
  { href: "/admin/bitacora", label: "Bitácora", icon: History },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm",
              active ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/60"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.7} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
