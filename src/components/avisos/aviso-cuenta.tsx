import { CreditCard } from "lucide-react";

export type AvisoCuenta =
  | null
  | { tono: "bloqueo" | "aviso"; mensaje: string };

/**
 * K1 — La franja de la cuenta SaaS: suspendida, prueba vencida o prueba a
 * punto de acabar. Igual que el aviso de IA, no se puede cerrar: se va sola
 * cuando la cuenta vuelve a estar al día.
 */
export function AvisoCuentaBanner({ aviso }: { aviso: AvisoCuenta }) {
  if (!aviso) return null;
  const clases =
    aviso.tono === "bloqueo"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-warning-soft bg-warning-tint text-warning-text";
  return (
    <div
      role="status"
      data-aviso-cuenta
      className={`flex items-center gap-3 border-b px-4 py-2.5 text-[13px] ${clases}`}
    >
      <CreditCard className="h-4 w-4 shrink-0" strokeWidth={1.7} />
      <span className="min-w-0 flex-1">{aviso.mensaje}</span>
    </div>
  );
}
