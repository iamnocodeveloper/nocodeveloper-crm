import { Badge } from "@/components/ui/badge";

/** K4 — Piezas pequeñas compartidas por las pantallas del panel. */

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  trial: "Prueba",
  active: "Activo",
  past_due: "Pago pendiente",
  suspended: "Suspendido",
  cancelled: "Cancelado",
};

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">Sin cuenta</Badge>;
  const variant =
    status === "active"
      ? "success"
      : status === "trial"
        ? "secondary"
        : status === "past_due"
          ? "warning"
          : "destructive";
  return <Badge variant={variant}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es", { style: "currency", currency }).format(cents / 100);
}
