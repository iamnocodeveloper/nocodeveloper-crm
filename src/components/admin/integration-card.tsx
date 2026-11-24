"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { IntegrationView } from "@/server/saas/integrations";

type Meta = {
  title: string;
  description: string;
  fields: { name: string; label: string; placeholder: string }[];
};

/** K4 — Tarjeta de una integración: datos, llave, encendido y prueba. */
export function IntegrationCard({
  integration,
  meta,
  webhookUrl,
}: {
  integration: IntegrationView;
  meta: Meta;
  webhookUrl: string | null;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(integration.enabled);
  const [config, setConfig] = useState<Record<string, string>>(integration.config);
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const isZernio = integration.key === "zernio";

  async function save() {
    setBusy("save");
    setMsg(null);
    const body: Record<string, unknown> = { enabled, config };
    // Solo se manda la llave si se escribió una nueva: vacío = no tocar.
    if (apiKey.trim()) body.apiKey = apiKey;
    if (webhookSecret.trim()) body.webhookSecret = webhookSecret;
    const res = await fetch(`/api/admin/integrations/${integration.key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (res.ok) {
      setApiKey("");
      setWebhookSecret("");
      setMsg({ ok: true, text: "Guardado." });
      router.refresh();
    } else {
      const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setMsg({ ok: false, text: j?.error?.message ?? "No se pudo guardar." });
    }
  }

  async function test() {
    setBusy("test");
    setMsg(null);
    const res = await fetch(`/api/admin/integrations/${integration.key}/test`, { method: "POST" });
    setBusy(null);
    const j = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    setMsg({ ok: Boolean(j?.ok), text: j?.message ?? "No se pudo probar." });
    router.refresh();
  }

  async function removeKey() {
    if (!window.confirm("¿Borrar la llave guardada? La integración dejará de funcionar.")) return;
    setBusy("save");
    await fetch(`/api/admin/integrations/${integration.key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false, config, apiKey: "" }),
    });
    setBusy(null);
    setEnabled(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h2 className="font-medium">{meta.title}</h2>
        <Switch checked={enabled} onCheckedChange={setEnabled} label="Activada" />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{meta.description}</p>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {integration.hasSecret ? (
          <Badge variant="success">Llave guardada</Badge>
        ) : (
          <Badge variant="warning">Sin llave</Badge>
        )}
        {integration.lastTestAt && (
          <Badge variant={integration.lastTestOk ? "success" : "destructive"}>
            Última prueba: {integration.lastTestOk ? "bien" : "falló"} ·{" "}
            {new Date(integration.lastTestAt).toLocaleString("es")}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {meta.fields.map((f) => (
          <div key={f.name} className="space-y-1.5">
            <Label htmlFor={`${integration.key}-${f.name}`}>{f.label}</Label>
            <Input
              id={`${integration.key}-${f.name}`}
              placeholder={f.placeholder}
              value={config[f.name] ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, [f.name]: e.target.value }))}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor={`${integration.key}-key`}>Llave de API</Label>
          <Input
            id={`${integration.key}-key`}
            type="password"
            autoComplete="off"
            placeholder={integration.hasSecret ? "•••••••• (escribe para cambiarla)" : "Pega aquí la llave"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        {isZernio && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="zernio-whsec">Secreto de firma del webhook (opcional)</Label>
              <Input
                id="zernio-whsec"
                type="password"
                autoComplete="off"
                placeholder={integration.hasWebhookSecret ? "•••••••• (escribe para cambiarlo)" : "El que te da Zernio al crear el webhook"}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
            </div>
            {webhookUrl && (
              <div className="space-y-1.5">
                <Label>URL del webhook para pegar en Zernio</Label>
                <code className="block break-all rounded-md border bg-secondary px-3 py-2 text-xs">{webhookUrl}</code>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={busy !== null}>
          {busy === "save" ? "Guardando…" : "Guardar"}
        </Button>
        <Button variant="outline" onClick={test} disabled={busy !== null || !integration.hasSecret}>
          {busy === "test" ? "Probando…" : "Probar conexión"}
        </Button>
        {integration.hasSecret && (
          <Button variant="ghost" onClick={removeKey} disabled={busy !== null}>
            Borrar llave
          </Button>
        )}
      </div>
      {(msg || integration.lastTestMessage) && (
        <p className={`mt-3 text-sm ${(msg ? msg.ok : integration.lastTestOk) ? "text-success-text" : "text-destructive"}`}>
          {msg?.text ?? integration.lastTestMessage}
        </p>
      )}
    </section>
  );
}
