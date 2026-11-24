import { z } from "zod";

/** K4 — Lo que el panel manda al crear o editar un plan. */
export const planSchema = z.object({
  name: z.string().trim().min(1).max(60),
  priceCents: z.number().int().min(0),
  currency: z.string().trim().length(3).toUpperCase(),
  maxMessagesMonth: z.number().int().min(0).nullable(),
  maxUsers: z.number().int().min(1).nullable(),
  maxWhatsappNumbers: z.number().int().min(0),
  providers: z.array(z.enum(["waha", "meta", "zernio"])),
  woocommerce: z.boolean(),
  isDefault: z.boolean(),
  archived: z.boolean(),
});
