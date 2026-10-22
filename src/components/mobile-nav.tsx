"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavActive, mobileNavItems } from "@/lib/nav";

/**
 * Barra inferior del teléfono, al estilo de una app nativa: cuatro tareas del
 * día y «Más» para abrir el cajón con el resto. El contador de la Bandeja es
 * el mismo que usa el lateral (una sola suscripción SSE en `AppShell`).
 *
 * En escritorio no existe (`lg:hidden`): ahí manda el lateral fijo.
 */
export function MobileNav({
  agenda = false,
  unread = 0,
  moreOpen = false,
  onMore,
}: {
  agenda?: boolean;
  unread?: number;
  /** El cajón completo está abierto (para marcar «Más»). */
  moreOpen?: boolean;
  onMore: () => void;
}) {
  const pathname = usePathname();
  const items = mobileNavItems({ agenda });
  const moreActive = !items.some((item) => isNavActive(pathname, item.href));

  return (
    <nav
      aria-label="Navegación principal"
      className="shrink-0 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[56px] touch-manipulation select-none flex-col items-center justify-center gap-0.5 px-1 text-[10.5px] font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                active
                  ? "text-brand"
                  : "text-text-3 active:bg-accent active:text-foreground"
              )}
            >
              <span className="relative">
                <item.icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={active ? 2 : 1.7}
                  aria-hidden
                />
                {item.badge && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[9.5px] font-bold leading-none text-brand-fg">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMore}
          aria-expanded={moreOpen}
          aria-label="Más secciones"
          className={cn(
            "flex min-h-[56px] touch-manipulation select-none flex-col items-center justify-center gap-0.5 px-1 text-[10.5px] font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            moreActive || moreOpen
              ? "text-brand"
              : "text-text-3 active:bg-accent active:text-foreground"
          )}
        >
          <Ellipsis
            className="h-[22px] w-[22px]"
            strokeWidth={moreActive || moreOpen ? 2 : 1.7}
            aria-hidden
          />
          <span>Más</span>
        </button>
      </div>
    </nav>
  );
}
