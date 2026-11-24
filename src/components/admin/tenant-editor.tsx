"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABEL } from "@/components/admin/ui";

type Tenant = {
  status: string;
  planId: string | null;
  trialEndsAt: string | null;
  suspendedReason: string | null;
  overrideMaxMessagesMonth: number | null;
  notes: string | null;
} | null;

/** K4 — Cambiar plan, estado, prueba, límite y notas de un negocio. */
export function TenantEditor({
  organizationId,
  name: initialName,
  tenant,
  plans,
}: {
  organizationId: string;
  name: string;
  tenant: Tenant;
  plans: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState(tenant?.status ?? "active");
  const [planId, setPlanId] = useState(tenant?.planId ?? plans[0]?.id ?? "");
  const [trialEndsAt, setTrialEndsAt] = useState(tenant?.trialEndsAt?.slice(0, 10) ?? "");
  const [reason, setReason] = useState(tenant?.suspendedReason ?? "");
  const [override, setOverride] = useState(tenant?.overrideMaxMessagesMonth?.toString() ?? "");
  const [notes, setNotes] = useState(tenant?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(extra: Record<string, unknown> = {}) {
    setSaving(true);
    setMsg(null);
    const body = {
      name,
      status,
      planId: planId || null,
      trialEndsAt: trialEndsAt ? new Date(`${trialEndsAt}T23:59:59Z`).toISOString() : null,
      suspendedReason: status === "suspended" ? reason || null : null,
      overrideMaxMessagesMonth: override.trim() === "" ? null : Number(override),
      notes: notes || null,
      ...extra,
    };
    const res = await fetch(`/api/admin/tenants/${organizationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Guardado." });
      router.refresh();
    } else {
      const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setMsg({ ok: false, text: j?.error?.message ?? "No se pudo guardar." });
    }
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-4 font-medium">Cuenta</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="t-name">Nombre del negocio</Label>
          <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-status">Estado</Label>
          <select
            id="t-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-plan">Plan</Label>
          <select
            id="t-plan"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-trial">Fin de la prueba</Label>
          <Input id="t-trial" type="date" value={trialEndsAt} onChange={(e) => setTrialEndsAt(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-override">Límite de mensajes propio</Label>
          <Input
            id="t-override"
            type="number"
            min={0}
            placeholder="Vacío = el del plan"
            value={override}
            onChange={(e) => setOverride(e.target.value)}
          />
        </div>
        {status === "suspended" && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="t-reason">Motivo de la suspensión (lo ve el cliente)</Label>
            <Input id="t-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="t-notes">Notas internas (el cliente no las ve)</Label>
          <Textarea id="t-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => save()} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        {status !== "suspended" ? (
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => {
              const r = window.prompt("Motivo de la suspensión (lo verá el cliente):", "") ?? null;
              if (r === null) return;
              setStatus("suspended");
              setReason(r);
              void save({ status: "suspended", suspendedReason: r || null });
            }}
          >
            Suspender
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => {
              setStatus("active");
              void save({ status: "active", suspendedReason: null });
            }}
          >
            Reactivar
          </Button>
        )}
        {msg && <span className={msg.ok ? "text-sm text-success-text" : "text-sm text-destructive"}>{msg.text}</span>}
      </div>
    </section>
  );
}
