"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/components/admin/ui";

type Plan = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  maxMessagesMonth: number | null;
  maxUsers: number | null;
  maxWhatsappNumbers: number;
  providers: string[];
  woocommerce: boolean;
  isDefault: boolean;
  archived: boolean;
  tenants: number;
};

const PROVIDERS = [
  { key: "waha", label: "WAHA (no oficial)" },
  { key: "zernio", label: "Zernio (oficial)" },
  { key: "meta", label: "Meta directo" },
];

const EMPTY: Omit<Plan, "id" | "tenants"> = {
  name: "",
  priceCents: 0,
  currency: "USD",
  maxMessagesMonth: 1000,
  maxUsers: 3,
  maxWhatsappNumbers: 1,
  providers: ["waha", "zernio", "meta"],
  woocommerce: true,
  isDefault: false,
  archived: false,
};

/** K4 — Lista de planes y formulario para crear o editar uno. */
export function PlansEditor({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; data: typeof EMPTY } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    const res = await fetch(editing.id ? `/api/admin/plans/${editing.id}` : "/api/admin/plans", {
      method: editing.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing.data),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(j?.error?.message ?? "No se pudo guardar.");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setEditing((e) => (e ? { ...e, data: { ...e.data, [k]: v } } : e));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-3">
        {plans.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <div>
              <p className="font-medium">
                {p.name}{" "}
                {p.isDefault && <Badge variant="secondary">Por defecto</Badge>}{" "}
                {p.archived && <Badge variant="outline">Archivado</Badge>}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {fmtMoney(p.priceCents, p.currency)}/mes · {p.maxMessagesMonth ?? "∞"} mensajes ·{" "}
                {p.maxUsers ?? "∞"} usuarios · {p.maxWhatsappNumbers} número(s) ·{" "}
                {p.woocommerce ? "con WooCommerce" : "sin WooCommerce"}
              </p>
              <p className="text-xs text-muted-foreground">{p.tenants} negocio(s) en este plan</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const { id, tenants: _t, ...data } = p;
                void _t;
                setEditing({ id, data });
              }}
            >
              Editar
            </Button>
          </div>
        ))}
        {plans.length === 0 && (
          <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            Aún no hay planes. Se crea uno de prueba solo con el primer registro, o créalo aquí.
          </p>
        )}
        <Button onClick={() => setEditing({ id: null, data: { ...EMPTY } })}>Nuevo plan</Button>
      </div>

      {editing && (
        <section className="h-fit rounded-lg border bg-card p-4">
          <h2 className="mb-4 font-medium">{editing.id ? "Editar plan" : "Nuevo plan"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-name">Nombre</Label>
              <Input id="p-name" value={editing.data.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Precio al mes</Label>
              <Input
                id="p-price"
                type="number"
                min={0}
                step="0.01"
                value={(editing.data.priceCents / 100).toString()}
                onChange={(e) => set("priceCents", Math.round(Number(e.target.value || 0) * 100))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cur">Moneda</Label>
              <Input
                id="p-cur"
                maxLength={3}
                value={editing.data.currency}
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-msg">Mensajes al mes</Label>
              <Input
                id="p-msg"
                type="number"
                min={0}
                placeholder="Vacío = sin límite"
                value={editing.data.maxMessagesMonth?.toString() ?? ""}
                onChange={(e) => set("maxMessagesMonth", numOrNull(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-users">Usuarios</Label>
              <Input
                id="p-users"
                type="number"
                min={1}
                placeholder="Vacío = sin límite"
                value={editing.data.maxUsers?.toString() ?? ""}
                onChange={(e) => set("maxUsers", numOrNull(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-nums">Números de WhatsApp</Label>
              <Input
                id="p-nums"
                type="number"
                min={0}
                value={editing.data.maxWhatsappNumbers.toString()}
                onChange={(e) => set("maxWhatsappNumbers", Number(e.target.value || 0))}
              />
            </div>
            <fieldset className="space-y-1.5 sm:col-span-2">
              <legend className="text-sm font-medium">Proveedores de WhatsApp</legend>
              {PROVIDERS.map((pr) => (
                <label key={pr.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.data.providers.includes(pr.key)}
                    onChange={(e) =>
                      set(
                        "providers",
                        e.target.checked
                          ? [...editing.data.providers, pr.key]
                          : editing.data.providers.filter((x) => x !== pr.key)
                      )
                    }
                  />
                  {pr.label}
                </label>
              ))}
            </fieldset>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={editing.data.woocommerce}
                onChange={(e) => set("woocommerce", e.target.checked)}
              />
              Incluye el plugin de WooCommerce
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={editing.data.isDefault}
                onChange={(e) => set("isDefault", e.target.checked)}
              />
              Plan por defecto para negocios nuevos
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={editing.data.archived}
                onChange={(e) => set("archived", e.target.checked)}
              />
              Archivado (no se ofrece a negocios nuevos)
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <div className="mt-4 flex gap-2">
            <Button onClick={save} disabled={saving || !editing.data.name.trim()}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
