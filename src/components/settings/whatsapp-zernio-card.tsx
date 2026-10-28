"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
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
 * Solo existe con `WHATSAPP_ZERNIO`. Conectar aquí retira la conexión de Meta
 * directo (y al revés): una organización tiene un solo transporte. Con
 * coexistencia, lo que el dueño escribe desde la app del teléfono también
 * entra a la bandeja y pausa la IA de esa conversación.
 */

type Connection = {
  accountRef: string;
  displayPhoneNumber: string | null;
  status: "connected" | "reconnect_required";
  tokenLast4: string;
  hasWebhookSecret: boolean;
};

const PASOS = [
  "Conecta el número en el panel de Zernio (Accounts → Connect → WhatsApp). Si quieres seguir usando la app de WhatsApp Business en el teléfono, elige coexistencia.",
  "Crea la API key en Zernio → Settings → API Keys (empieza con sk_) y pégala abajo.",
  "Para escribir primero, o pasadas 24 h desde el último mensaje del cliente, necesitas una plantilla aprobada (Ajustes → Plantillas).",
];

export function WhatsappZernioCard() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [removing, setRemoving] = useState(false);

  const refetch = useCallback(async () => {
    const c = await fetch("/api/settings/whatsapp-zernio")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    setConnection(c?.connection ?? null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

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
          WhatsApp por Zernio
          {connection?.status === "connected" && <Badge variant="success">Activo</Badge>}
        </CardTitle>
        <CardDescription>
          La API oficial de WhatsApp a través de Zernio, en lugar de Meta directo.
          Conectar aquí reemplaza la conexión de Meta de arriba.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection?.status === "reconnect_required" && (
          <div className="flex items-start gap-2 rounded-lg border border-danger-soft bg-danger-tint p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-danger-text">
              La API key de Zernio expiró o fue revocada: los envíos están pausados.
              Pega una nueva abajo.
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
                Cuenta {connection.accountRef} · llave que termina en ····
                {connection.tokenLast4}
                {connection.hasWebhookSecret ? " · firma del webhook activa" : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={disconnect} disabled={removing}>
              {removing ? "Desconectando…" : "Desconectar"}
            </Button>
          </div>
        )}

        <ul className="list-disc space-y-1 pl-5 text-xs text-text-2">
          {PASOS.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>

        <ZernioConnect
          endpoint="/api/settings/whatsapp-zernio"
          what="tu número de WhatsApp"
          idPrefix="wz"
          onSaved={() => void refetch()}
        />
      </CardContent>
    </Card>
  );
}
