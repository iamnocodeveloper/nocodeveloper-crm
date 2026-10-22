import { WifiOff } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

/** Respaldo del service worker cuando la navegación no tiene red. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-subtle p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <div className="w-full max-w-sm rounded-lg border bg-raised p-6 text-center shadow-pop">
        <WifiOff
          className="mx-auto h-8 w-8 text-text-3"
          strokeWidth={1.7}
          aria-hidden
        />
        <h1 className="mt-3 text-lg font-bold tracking-tight">Sin conexión</h1>
        <p className="mt-1 text-sm text-text-2">
          No pudimos cargar esta pantalla. Revisa tu conexión y vuelve a
          intentarlo.
        </p>
        <Link
          href="/inbox"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-sm bg-brand px-4 text-sm font-semibold text-brand-fg"
        >
          Reintentar
        </Link>
      </div>
    </main>
  );
}
