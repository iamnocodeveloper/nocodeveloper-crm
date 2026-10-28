import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { scoped } from "@/lib/db/tenant";

/**
 * 031 — Credenciales de WhatsApp por Zernio.
 *
 * Mismo contrato que las demás: la llave viaja descifrada solo en memoria y
 * hacia fuera se expone su cola. Una organización tiene UN transporte de
 * WhatsApp: guardar esta conexión borra la de Meta directo (y conectar Meta
 * directo borra esta), para que el envío nunca tenga que adivinar por dónde
 * salir.
 */

export type WhatsappZernioCredentials = {
  id: string;
  organizationId: string;
  /** `accountId` de la cuenta de WhatsApp en Zernio. */
  accountRef: string;
  displayPhoneNumber: string | null;
  webhookSecret: string | null;
  status: "connected" | "reconnect_required";
  token: string;
};

type Row = typeof schema.whatsappZernioCredentials.$inferSelect;

function toCredentials(row: Row): WhatsappZernioCredentials {
  const secret =
    row.webhookSecretCipher && row.webhookSecretIv && row.webhookSecretTag
      ? decryptSecret({
          cipher: row.webhookSecretCipher,
          iv: row.webhookSecretIv,
          tag: row.webhookSecretTag,
        })
      : null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    accountRef: row.accountRef,
    displayPhoneNumber: row.displayPhoneNumber,
    webhookSecret: secret,
    status: row.status,
    token: decryptSecret({
      cipher: row.tokenCipher,
      iv: row.tokenIv,
      tag: row.tokenTag,
    }),
  };
}

/** Columnas cifradas del secreto de firma (nulas si no hay secreto). */
export function webhookSecretColumns(secret: string | null) {
  if (!secret) {
    return { webhookSecretCipher: null, webhookSecretIv: null, webhookSecretTag: null };
  }
  const enc = encryptSecret(secret);
  return {
    webhookSecretCipher: enc.cipher,
    webhookSecretIv: enc.iv,
    webhookSecretTag: enc.tag,
  };
}

export async function getWhatsappZernioCredentialsByOrg(
  organizationId: string
): Promise<WhatsappZernioCredentials | null> {
  const rows = await getDb()
    .select()
    .from(schema.whatsappZernioCredentials)
    .where(scoped(schema.whatsappZernioCredentials.organizationId, organizationId))
    .limit(1);
  return rows[0] ? toCredentials(rows[0]) : null;
}

/** Enrutado del webhook de Zernio: el evento trae `account.id`. */
export async function getWhatsappZernioCredentialsByAccountRef(
  accountRef: string
): Promise<WhatsappZernioCredentials | null> {
  const rows = await getDb()
    .select()
    .from(schema.whatsappZernioCredentials)
    .where(eq(schema.whatsappZernioCredentials.accountRef, accountRef))
    .limit(1);
  return rows[0] ? toCredentials(rows[0]) : null;
}

/**
 * Guarda (o reemplaza) la conexión y retira la de Meta directo: un solo
 * transporte por organización. Las conversaciones, contactos y plantillas no
 * se tocan: son de la organización, no de la conexión.
 */
export async function saveWhatsappZernioCredentials(input: {
  organizationId: string;
  accountRef: string;
  displayPhoneNumber: string | null;
  token: string;
  webhookSecret: string | null;
}): Promise<void> {
  const db = getDb();
  const enc = encryptSecret(input.token);
  const values = {
    organizationId: input.organizationId,
    accountRef: input.accountRef,
    displayPhoneNumber: input.displayPhoneNumber,
    tokenCipher: enc.cipher,
    tokenIv: enc.iv,
    tokenTag: enc.tag,
    ...webhookSecretColumns(input.webhookSecret),
    status: "connected" as const,
    updatedAt: new Date(),
  };
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.whatsappZernioCredentials)
      .values({ id: newId("credentials"), ...values })
      .onConflictDoUpdate({
        target: [schema.whatsappZernioCredentials.organizationId],
        set: values,
      });
    await tx
      .delete(schema.metaCredentials)
      .where(scoped(schema.metaCredentials.organizationId, input.organizationId));
  });
}

/** Actualiza la cuenta o el secreto (lo usa la reparación del webhook, 023). */
export async function updateWhatsappZernioCredentials(
  id: string,
  set: { accountRef?: string; webhookSecret?: string }
): Promise<void> {
  const { webhookSecret, ...resto } = set;
  await getDb()
    .update(schema.whatsappZernioCredentials)
    .set({
      ...resto,
      ...(webhookSecret !== undefined ? webhookSecretColumns(webhookSecret) : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.whatsappZernioCredentials.id, id));
}

export async function deleteWhatsappZernioCredentials(
  organizationId: string
): Promise<void> {
  await getDb()
    .delete(schema.whatsappZernioCredentials)
    .where(scoped(schema.whatsappZernioCredentials.organizationId, organizationId));
}

/** La llave murió: se pausan los envíos y la UI pide reconectar. */
export async function markWhatsappZernioReconnectRequired(
  organizationId: string
): Promise<void> {
  await getDb()
    .update(schema.whatsappZernioCredentials)
    .set({ status: "reconnect_required", updatedAt: new Date() })
    .where(scoped(schema.whatsappZernioCredentials.organizationId, organizationId));
}
