"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Smartphone, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ZernioConnect } from "@/components/settings/zernio-connect";

/**
 * 031 — Conectar WhatsApp por Zernio: la misma API oficial, otra puerta.
 *
 * K5 — Si la plataforma tiene su cuenta de Zernio (/admin → Integraciones),
 * el negocio solo pulsa «Conectar» y sigue los pasos de Meta: con
 * coexistencia escanea un QR con la app de WhatsApp Business y la sigue
 * usando. Pegar una llave propia queda como opción avanzada.
 */

type Connection = {
  accountRef: string;
  displayPhoneNumber: string | null;
  status: "connected" | "reconnect_required";
  tokenLast4: string;
  hasWebhookSecret: boolean;
  platform?: boolean;
};

const PASOS_MANUAL = [
  "Conecta el número en el panel de Zernio (Accounts → Connect → WhatsApp). Si quieres seguir usando la app de WhatsApp Business en el teléfono, elige coexistencia.",
  "Crea la API key en Zernio → Settings → API Keys (empieza con sk_) y pégala abajo.",
  "Para escribir primero, o pasadas 24 h desde el último mensaje del cliente, necesitas una plantilla aprobada (Ajustes → Plantillas).",
];

/** Lo que significa cada error con el que puede volver la conexión. */
const MOTIVOS: Record<string, string> = {
  connection_cancelled: "Cancelaste la conexión en la ventana de Meta.",
  session_expired: "La sesión de conexión caducó (dura 60 minutos). Empieza otra vez.",
  one_whatsapp_per_profile: "Este negocio ya tiene un número de WhatsApp conectado.",
  whatsapp_number_already_connected: "Ese número ya está conectado en otra cuenta.",
  whatsapp_number_pinned_to_profile: "Ese número pertenece a otro negocio de la plataforma.",
  whatsapp_error: "Meta no pudo completar la conexión. Revisa que el número esté activo en la app WhatsApp Business.",
  perfil_ajeno: "La conexión no corresponde a este negocio.",
  cuenta_no_encontrada: "Zernio no encuentra la cuenta conectada. Prueba otra vez.",
  solo_propietario: "Solo el propietario puede conectar WhatsApp.",
};

export function WhatsappZernioCard() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [platform, setPlatform] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [starting, setStarting] = useState<"coexistencia" | "api" | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; text: string } | null>(null);
  const [avanzado, setAvanzado] = useState(false);

  const refetch = useCallback(async () => {
    const c = await fetch("/api/settings/whatsapp-zernio")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    setConnection(c?.connection ?? null);
    setPlatform(Boolean(c?.platformAvailable));
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refetch();
    // Vuelta de Zernio: `?zernio=conectado` o `?zernio=error&motivo=...`.
    const q = new URLSearchParams(window.location.search);
    const estado = q.get("zernio");
    if (estado === "conectado") setAviso({ ok: true, text: "¡WhatsApp conectado!" });
    if (estado === "error") {
      const m = q.get("motivo") ?? "";
      setAviso({ ok: false, text: MOTIVOS[m] ?? "No se pudo conectar WhatsApp. Prueba otra vez." });
    }
    if (estado) window.history.replaceState(null, "", window.location.pathname);
  }, [refetch]);

  async function conectar(modo: "coexistencia" | "api") {
    setStarting(modo);
    setAviso(null);
    const res = await fetch("/api/settings/whatsapp-zernio/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo }),
    }).catch(() => null);
    const j = (await res?.json().catch(() => null)) as
      | { authUrl?: string; error?: { message?: string } }
      | null;
    if (j?.authUrl) {
      window.location.assign(j.authUrl);
      return;
    }
    setStarting(null);
    setAviso({ ok: false, text: j?.error?.message ?? "No se pudo iniciar la conexión." });
  }

  async function disconnect() {
    setRemoving(true);
    await fetch("/api/settings/whatsapp-zernio", { method: "DELETE" }).catch(() => null);
    setRemoving(false);
    void refetch();
  }

  if (!loaded) return null;

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          WhatsApp API oficial
          {connection?.status === "connected" && <Badge variant="success">Activo</Badge>}
        </CardTitle>
        <CardDescription>
          Conecta tu número a la API oficial de WhatsApp. Con <strong>coexistencia</strong> sigues
          usando la app de WhatsApp Business en tu teléfono, y lo que escribas desde ahí también
          aparece en la bandeja. Conectar aquí reemplaza la conexión de Meta de arriba.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {aviso && (
          <p className={`rounded-lg border p-3 text-sm ${aviso.ok ? "border-success-soft bg-success-tint text-success-text" : "border-danger-soft bg-danger-tint text-danger-text"}`}>
            {aviso.text}
          </p>
        )}

        {connection?.status === "reconnect_required" && (
          <div className="flex items-start gap-2 rounded-lg border border-danger-soft bg-danger-tint p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-danger-text">
              {connection.platform
                ? "La conexión con WhatsApp no está disponible ahora mismo: los envíos están pausados. Avisa al soporte."
                : "La API key de Zernio expiró o fue revocada: los envíos están pausados. Pega una nueva abajo."}
            </p>
          </div>
        )}

        {connection?.status === "connected" && (
          <div className="flex items-center gap-3 rounded-lg border border-success-soft bg-success-tint p-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div className="flex-1 text-sm text-success-text">
              <p className="font-medium">
                Conectado{connection.displayPhoneNumber ? `: ${connection.displayPhoneNumber}` : ""}
              </p>
              <p className="opacity-80">
                {connection.platform
                  ? "Conectado con la cuenta de la plataforma"
                  : `Cuenta ${connection.accountRef} · llave que termina en ····${connection.tokenLast4}`}
                {connection.hasWebhookSecret ? " · mensajes firmados" : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={disconnect} disabled={removing}>
              {removing ? "Desconectando…" : "Desconectar"}
            </Button>
          </div>
        )}

        {platform && connection?.status !== "connected" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={starting !== null}
              onClick={() => void conectar("coexistencia")}
              className="rounded-lg border p-4 text-left transition-colors hover:bg-accent disabled:opacity-60"
            >
              <Smartphone className="mb-2 h-5 w-5 text-brand" />
              <p className="font-medium">
                {starting === "coexistencia" ? "Abriendo…" : "Ya uso WhatsApp Business"}
              </p>
              <p className="mt-1 text-xs text-text-2">
                Recomendado. Escaneas un código QR con la app de WhatsApp Business y la sigues usando
                en tu teléfono. Se traen hasta 6 meses de conversaciones.
              </p>
            </button>
            <button
              type="button"
              disabled={starting !== null}
              onClick={() => void conectar("api")}
              className="rounded-lg border p-4 text-left transition-colors hover:bg-accent disabled:opacity-60"
            >
              <Server className="mb-2 h-5 w-5 text-brand" />
              <p className="font-medium">{starting === "api" ? "Abriendo…" : "Número solo para la API"}</p>
              <p className="mt-1 text-xs text-text-2">
                Un número que NO está en la app de WhatsApp. Lo eliges en la ventana de Meta y solo
                se usa desde aquí.
              </p>
            </button>
          </div>
        )}

        {platform && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-text-2">
            <li>Necesitas una cuenta de Facebook con acceso al negocio (Meta Business).</li>
            <li>
              Con coexistencia: el número debe estar activo en la app <strong>WhatsApp Business</strong>{" "}
              (no la normal). En el teléfono, Ajustes → Dispositivos vinculados para escanear el QR.
            </li>
            <li>
              Para escribir primero, o pasadas 24 h desde el último mensaje del cliente, necesitas una
              plantilla aprobada (Ajustes → Plantillas).
            </li>
          </ul>
        )}

        {platform && (
          <button
            type="button"
            className="text-xs text-text-3 underline underline-offset-2"
            onClick={() => setAvanzado((v) => !v)}
          >
            {avanzado ? "Ocultar opción avanzada" : "Avanzado: usar mi propia cuenta de Zernio"}
          </button>
        )}

        {(!platform || avanzado) && (
          <>
            <ul className="list-disc space-y-1 pl-5 text-xs text-text-2">
              {PASOS_MANUAL.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            <ZernioConnect
              endpoint="/api/settings/whatsapp-zernio"
              what="tu número de WhatsApp"
              idPrefix="wz"
              onSaved={() => void refetch()}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
