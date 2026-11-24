import { eq } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getDb, schema } from "@/lib/db";

/**
 * K4 — Integraciones de la plataforma Kooni (WAHA y Zernio), configuradas por
 * el superadmin desde /admin. Los negocios no las ven: solo usan lo que la
 * plataforma tenga conectado.
 */

export const INTEGRATION_KEYS = ["waha", "zernio"] as const;
export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

/** Campos no secretos que admite cada integración, con su etiqueta. */
export const INTEGRATION_FIELDS: Record<
  IntegrationKey,
  { title: string; description: string; fields: { name: string; label: string; placeholder: string }[] }
> = {
  waha: {
    title: "WAHA (WhatsApp no oficial)",
    description:
      "Servidor WAHA Plus: una sesión por negocio, conectada con QR. Kooni crea y vigila las sesiones.",
    fields: [
      { name: "baseUrl", label: "URL del servidor WAHA", placeholder: "https://waha.tudominio.com" },
      { name: "engine", label: "Motor", placeholder: "GOWS" },
      { name: "dashboardUrl", label: "URL del panel (opcional)", placeholder: "https://waha.tudominio.com/dashboard" },
    ],
  },
  zernio: {
    title: "Zernio (WhatsApp oficial con coexistencia)",
    description:
      "Tu cuenta de Zernio para todos los negocios: cada negocio es un perfil y solo conecta su número.",
    fields: [
      { name: "baseUrl", label: "URL de la API", placeholder: "https://zernio.com/api/v1" },
    ],
  },
};

export type IntegrationView = {
  key: IntegrationKey;
  enabled: boolean;
  config: Record<string, string>;
  hasSecret: boolean;
  hasWebhookSecret: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  updatedAt: string | null;
};

export function isIntegrationKey(v: string): v is IntegrationKey {
  return (INTEGRATION_KEYS as readonly string[]).includes(v);
}

async function row(key: IntegrationKey) {
  const [r] = await getDb()
    .select()
    .from(schema.saasIntegration)
    .where(eq(schema.saasIntegration.key, key))
    .limit(1);
  return r ?? null;
}

/** Lo que ve el panel: nunca la llave, solo si está puesta. */
export async function listIntegrations(): Promise<IntegrationView[]> {
  const rows = await getDb().select().from(schema.saasIntegration);
  return INTEGRATION_KEYS.map((key) => {
    const r = rows.find((x) => x.key === key);
    return {
      key,
      enabled: r?.enabled ?? false,
      config: r?.config ?? {},
      hasSecret: Boolean(r?.secret),
      hasWebhookSecret: Boolean(r?.webhookSecret),
      lastTestAt: r?.lastTestAt?.toISOString() ?? null,
      lastTestOk: r?.lastTestOk ?? null,
      lastTestMessage: r?.lastTestMessage ?? null,
      updatedAt: r?.updatedAt?.toISOString() ?? null,
    };
  });
}

/** Puro: deja solo los campos conocidos, recortados y sin vacíos. */
export function cleanConfig(key: IntegrationKey, input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of INTEGRATION_FIELDS[key].fields) {
    const v = input[f.name];
    if (typeof v === "string" && v.trim()) out[f.name] = v.trim().replace(/\/+$/, "");
  }
  return out;
}

/**
 * Guarda una integración. `apiKey`/`webhookSecret`: undefined = no tocar,
 * "" = borrar, texto = reemplazar.
 */
export async function saveIntegration(
  key: IntegrationKey,
  input: {
    enabled: boolean;
    config: Record<string, unknown>;
    apiKey?: string;
    webhookSecret?: string;
  },
  actorEmail: string
): Promise<void> {
  const config = cleanConfig(key, input.config);
  const patch: Partial<typeof schema.saasIntegration.$inferInsert> = {
    enabled: input.enabled,
    config,
    updatedBy: actorEmail,
    updatedAt: new Date(),
  };
  if (input.apiKey !== undefined) {
    patch.secret = input.apiKey.trim() ? encryptSecret(input.apiKey.trim()) : null;
  }
  if (input.webhookSecret !== undefined) {
    patch.webhookSecret = input.webhookSecret.trim()
      ? encryptSecret(input.webhookSecret.trim())
      : null;
  }
  await getDb()
    .insert(schema.saasIntegration)
    .values({ key, ...patch })
    .onConflictDoUpdate({ target: schema.saasIntegration.key, set: patch });
}

/** Para el código que habla con el proveedor: config + llave en claro. */
export async function getIntegrationCredentials(key: IntegrationKey): Promise<{
  enabled: boolean;
  config: Record<string, string>;
  apiKey: string | null;
  webhookSecret: string | null;
} | null> {
  const r = await row(key);
  if (!r) return null;
  return {
    enabled: r.enabled,
    config: r.config ?? {},
    apiKey: r.secret ? decryptSecret(r.secret) : null,
    webhookSecret: r.webhookSecret ? decryptSecret(r.webhookSecret) : null,
  };
}

/** Prueba la conexión con el proveedor y deja el resultado guardado. */
export async function testIntegration(key: IntegrationKey): Promise<{ ok: boolean; message: string }> {
  const creds = await getIntegrationCredentials(key);
  let result: { ok: boolean; message: string };
  if (!creds?.apiKey) {
    result = { ok: false, message: "Falta la llave de API" };
  } else if (key === "waha") {
    result = await probe(
      creds.config.baseUrl ? `${creds.config.baseUrl}/api/sessions?all=true` : null,
      { "X-Api-Key": creds.apiKey },
      (json) => `Conectado. Sesiones en el servidor: ${Array.isArray(json) ? json.length : "?"}`
    );
  } else {
    const base = creds.config.baseUrl || "https://zernio.com/api/v1";
    result = await probe(
      `${base}/accounts`,
      { Authorization: `Bearer ${creds.apiKey}` },
      (json) => {
        const n = (json as { accounts?: unknown[] } | null)?.accounts;
        return `Conectado. Cuentas en Zernio: ${Array.isArray(n) ? n.length : "?"}`;
      }
    );
  }
  await getDb()
    .update(schema.saasIntegration)
    .set({ lastTestAt: new Date(), lastTestOk: result.ok, lastTestMessage: result.message })
    .where(eq(schema.saasIntegration.key, key));
  return result;
}

async function probe(
  url: string | null,
  headers: Record<string, string>,
  describe: (json: unknown) => string
): Promise<{ ok: boolean; message: string }> {
  if (!url) return { ok: false, message: "Falta la URL del servidor" };
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "La llave no es válida (el servidor respondió 401/403)" };
    }
    if (!res.ok) return { ok: false, message: `El servidor respondió ${res.status}` };
    const json = await res.json().catch(() => null);
    return { ok: true, message: describe(json) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `No se pudo conectar: ${msg}` };
  }
}
