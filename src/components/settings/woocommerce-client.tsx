"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ESTADOS_PEDIDO, VARIABLES, etiquetaEstado, formatoTotal } from "@/server/tienda/formato";

/**
 * K6 — Ajustes → WooCommerce: conectar la tienda (plugin + llave), decidir
 * qué aviso de WhatsApp sale en cada estado del pedido y ver los últimos.
 */

type Regla = { enabled: boolean; templateId: string | null; variables: string[]; text: string | null };
type Plantilla = { id: string; name: string; language: string; body: string; variables: number; status: "approved" | "pending" };
type Pedido = {
  id: string;
  number: string | null;
  status: string;
  totalCents: number | null;
  currency: string | null;
  customerName: string | null;
  phone: string | null;
  lastNotification: { ok: boolean; message: string; at: string } | null;
  updatedAt: string;
};
type Datos = {
  apiUrl: string;
  settings: {
    enabled: boolean;
    requireOptIn: boolean;
    createLeads: boolean;
    rules: Record<string, Regla>;
    storeUrl: string | null;
    storeName: string | null;
    lastEventAt: string | null;
  };
  templates: Plantilla[];
  orders: Pedido[];
};

const reglaVacia = (slug: string): Regla => ({
  enabled: false,
  templateId: null,
  variables: [],
  text: ESTADOS_PEDIDO.find((e) => e.slug === slug)?.sugerido ?? "",
});

export function WoocommerceClient() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [reglas, setReglas] = useState<Record<string, Regla>>({});
  const [opciones, setOpciones] = useState({ enabled: true, requireOptIn: false, createLeads: true });
  const [llave, setLlave] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; text: string } | null>(null);
  const [creando, setCreando] = useState(false);
  const [resultados, setResultados] = useState<{ estado: string; ok: boolean; message: string }[] | null>(null);

  const cargar = useCallback(async () => {
    const d = (await fetch("/api/settings/woocommerce").then((r) => (r.ok ? r.json() : null))) as Datos | null;
    if (!d) return;
    setDatos(d);
    setOpciones({
      enabled: d.settings.enabled,
      requireOptIn: d.settings.requireOptIn,
      createLeads: d.settings.createLeads,
    });
    const r: Record<string, Regla> = {};
    for (const e of ESTADOS_PEDIDO) r[e.slug] = d.settings.rules[e.slug] ?? reglaVacia(e.slug);
    setReglas(r);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function generarLlave() {
    setAviso(null);
    const res = await fetch("/api/settings/woocommerce/key", { method: "POST" });
    const j = (await res.json().catch(() => null)) as { key?: string; error?: { message?: string } } | null;
    if (j?.key) setLlave(j.key);
    else setAviso({ ok: false, text: j?.error?.message ?? "No se pudo generar la llave" });
  }

  async function copiar(valor: string, que: string) {
    await navigator.clipboard.writeText(valor).catch(() => null);
    setCopiado(que);
    setTimeout(() => setCopiado(null), 1500);
  }

  async function guardar() {
    setGuardando(true);
    setAviso(null);
    const res = await fetch("/api/settings/woocommerce", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...opciones, rules: reglas }),
    });
    setGuardando(false);
    setAviso(res.ok ? { ok: true, text: "Guardado." } : { ok: false, text: "No se pudo guardar." });
    if (res.ok) void cargar();
  }

  async function crearPlantillas() {
    setCreando(true);
    setResultados(null);
    const res = await fetch("/api/settings/woocommerce/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estados: [] }),
    });
    const j = (await res.json().catch(() => null)) as
      | { resultados?: { estado: string; ok: boolean; message: string }[]; error?: { message?: string } }
      | null;
    setCreando(false);
    setResultados(j?.resultados ?? [{ estado: "", ok: false, message: j?.error?.message ?? "No se pudieron crear" }]);
    void cargar();
  }

  const cambiarRegla = (slug: string, cambio: Partial<Regla>) =>
    setReglas((r) => ({ ...r, [slug]: { ...(r[slug] ?? reglaVacia(slug)), ...cambio } }));

  if (!datos) return null;
  const conectada = Boolean(datos.settings.lastEventAt);

  return (
    <div className="max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> Tienda WooCommerce
            {conectada && <Badge variant="success">Conectada</Badge>}
          </CardTitle>
          <CardDescription>
            Cada pedido de tu tienda entra en Kooni: se crea o actualiza el contacto, aparece en el pipeline con su
            importe y tu cliente recibe un WhatsApp cada vez que cambia el estado del pedido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {conectada && (
            <div className="flex items-center gap-2 rounded-lg border border-success-soft bg-success-tint p-3 text-success-text">
              <CheckCircle2 className="h-4 w-4" />
              {datos.settings.storeName || datos.settings.storeUrl} · último pedido recibido el{" "}
              {new Date(datos.settings.lastEventAt!).toLocaleString("es")}
            </div>
          )}
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <a
                href="/kooni-woocommerce.zip"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                download
              >
                <Download className="h-4 w-4" /> Descarga el plugin
              </a>{" "}
              y súbelo en WordPress: <em>Plugins → Añadir nuevo → Subir plugin</em>. Actívalo.
            </li>
            <li>
              En WordPress ve a <em>WooCommerce → Kooni</em> y pega estos dos datos:
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-28 shrink-0 text-text-2">URL de Kooni</span>
                  <code className="min-w-0 flex-1 truncate rounded border bg-secondary px-2 py-1 text-xs">
                    {datos.apiUrl}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => void copiar(datos.apiUrl, "url")}>
                    <Copy className="h-3.5 w-3.5" /> {copiado === "url" ? "Copiada" : "Copiar"}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-28 shrink-0 text-text-2">Llave</span>
                  {llave ? (
                    <>
                      <code className="min-w-0 flex-1 truncate rounded border bg-secondary px-2 py-1 text-xs">{llave}</code>
                      <Button size="sm" variant="outline" onClick={() => void copiar(llave, "llave")}>
                        <Copy className="h-3.5 w-3.5" /> {copiado === "llave" ? "Copiada" : "Copiar"}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => void generarLlave()}>
                      Generar llave
                    </Button>
                  )}
                </div>
                {llave && (
                  <p className="text-xs text-warning-text">
                    Cópiala ahora: por seguridad no se vuelve a mostrar. Si la pierdes, genera otra.
                  </p>
                )}
              </div>
            </li>
            <li>Pulsa «Probar conexión» en el plugin y guarda. Desde ese momento los pedidos llegan solos.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center justify-between gap-4">
            <span>Enviar avisos por WhatsApp</span>
            <Switch checked={opciones.enabled} onCheckedChange={(v) => setOpciones((o) => ({ ...o, enabled: v }))} label="Avisos" />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>
              Solo a quien aceptó recibir WhatsApp en el checkout
              <span className="block text-xs text-text-2">Actívalo también en el plugin para que aparezca la casilla.</span>
            </span>
            <Switch checked={opciones.requireOptIn} onCheckedChange={(v) => setOpciones((o) => ({ ...o, requireOptIn: v }))} label="Consentimiento" />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Crear la oportunidad en el pipeline con el importe del pedido</span>
            <Switch checked={opciones.createLeads} onCheckedChange={(v) => setOpciones((o) => ({ ...o, createLeads: v }))} label="Pipeline" />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plantillas de WhatsApp para pedidos</CardTitle>
          <CardDescription>
            Con la API oficial de WhatsApp, para avisar a un cliente que no te escribió en las últimas 24 h hace falta
            una plantilla aprobada por Meta. Kooni las crea por ti (una por estado, categoría Utilidad, en español), las
            manda a aprobación y las deja enlazadas a cada aviso. Meta tarda de minutos a 24 h en aprobarlas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Button onClick={() => void crearPlantillas()} disabled={creando}>
            {creando ? "Enviando a aprobación…" : "Crear plantillas y enviarlas a aprobación"}
          </Button>
          {resultados && (
            <ul className="space-y-1 text-xs">
              {resultados.map((r, i) => (
                <li key={i} className={r.ok ? "text-success-text" : "text-destructive"}>
                  {r.estado ? `${etiquetaEstado(r.estado)}: ` : ""}
                  {r.message}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-text-2">
            Mientras una plantilla está pendiente, el aviso solo sale como texto a quien te escribió en las últimas 24 h.
            Con WhatsApp no oficial (QR) no hacen falta plantillas: siempre se manda el texto.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avisos por estado del pedido</CardTitle>
          <CardDescription>
            Si el cliente te escribió en las últimas 24 h se manda el texto. Si no, WhatsApp exige una{" "}
            <strong>plantilla aprobada</strong> (créala en Ajustes → Plantillas, categoría Utilidad) y aquí eliges qué
            dato va en cada {"{{n}}"}. Variables: {VARIABLES.map((v) => v.token).join(" ")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ESTADOS_PEDIDO.map((e) => {
            const r = reglas[e.slug] ?? reglaVacia(e.slug);
            const plantilla = datos.templates.find((t) => t.id === r.templateId) ?? null;
            return (
              <div key={e.slug} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{e.label}</p>
                  <Switch checked={r.enabled} onCheckedChange={(v) => cambiarRegla(e.slug, { enabled: v })} label={e.label} size="sm" />
                </div>
                {r.enabled && (
                  <div className="mt-3 space-y-3 text-sm">
                    <div>
                      <span className="mb-1 block text-xs text-text-2">Plantilla aprobada (para avisar fuera de las 24 h)</span>
                      <select
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={r.templateId ?? ""}
                        onChange={(ev) => {
                          const t = datos.templates.find((x) => x.id === ev.target.value) ?? null;
                          cambiarRegla(e.slug, {
                            templateId: t?.id ?? null,
                            variables: t ? Array.from({ length: t.variables }, (_, i) => r.variables[i] ?? "{nombre}") : [],
                          });
                        }}
                      >
                        <option value="">Sin plantilla (solo texto dentro de las 24 h)</option>
                        {datos.templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.language}){t.status === "pending" ? " · pendiente de aprobación" : ""}
                          </option>
                        ))}
                      </select>
                      {plantilla && (
                        <>
                          <p className="mt-1 whitespace-pre-wrap rounded bg-secondary p-2 text-xs text-text-2">{plantilla.body}</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {Array.from({ length: plantilla.variables }, (_, i) => (
                              <label key={i} className="flex items-center gap-2 text-xs">
                                <span className="w-10 shrink-0 font-mono">{`{{${i + 1}}}`}</span>
                                <select
                                  className="h-8 flex-1 rounded-md border bg-background px-2"
                                  value={r.variables[i] ?? "{nombre}"}
                                  onChange={(ev) => {
                                    const vars = [...r.variables];
                                    vars[i] = ev.target.value;
                                    cambiarRegla(e.slug, { variables: vars });
                                  }}
                                >
                                  {VARIABLES.map((v) => (
                                    <option key={v.token} value={v.token}>
                                      {v.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <span className="mb-1 block text-xs text-text-2">Texto (si el cliente escribió en las últimas 24 h)</span>
                      <Textarea
                        rows={2}
                        value={r.text ?? ""}
                        onChange={(ev) => cambiarRegla(e.slug, { text: ev.target.value || null })}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {datos.templates.length === 0 && (
            <p className="text-xs text-text-2">
              Aún no tienes plantillas aprobadas. Sin ellas solo se puede avisar a clientes que te escribieron en las
              últimas 24 h.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button onClick={() => void guardar()} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
            {aviso && <span className={aviso.ok ? "text-sm text-success-text" : "text-sm text-destructive"}>{aviso.text}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {datos.orders.length === 0 ? (
            <p className="text-sm text-text-2">Todavía no ha llegado ningún pedido.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs text-text-2">
                  <tr>
                    <th className="py-1 font-medium">Pedido</th>
                    <th className="py-1 font-medium">Cliente</th>
                    <th className="py-1 font-medium">Estado</th>
                    <th className="py-1 text-right font-medium">Total</th>
                    <th className="py-1 font-medium">Aviso</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {datos.orders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2">#{o.number}</td>
                      <td className="py-2">
                        {o.customerName ?? "—"}
                        <span className="block text-xs text-text-2">{o.phone ? `+${o.phone}` : "sin teléfono"}</span>
                      </td>
                      <td className="py-2">{etiquetaEstado(o.status)}</td>
                      <td className="py-2 text-right tabular-nums">{formatoTotal(o.totalCents, o.currency)}</td>
                      <td className="py-2 text-xs">
                        {o.lastNotification ? (
                          <span className={o.lastNotification.ok ? "text-success-text" : "text-destructive"}>
                            {o.lastNotification.message}
                          </span>
                        ) : (
                          <span className="text-text-2">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
