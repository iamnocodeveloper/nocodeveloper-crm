import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { tenantDetail, updateTenant, withSuperadmin } from "@/server/saas/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = withSuperadmin(async (_admin, _req: Request, { params }: Params) => {
  const { id } = await params;
  const detail = await tenantDetail(id);
  if (!detail) return apiError(404, "not_found", "Negocio no encontrado");
  return Response.json(detail);
});

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["trial", "active", "past_due", "suspended", "cancelled"]).optional(),
  planId: z.string().min(1).nullable().optional(),
  trialEndsAt: z.string().datetime().nullable().optional(),
  suspendedReason: z.string().max(300).nullable().optional(),
  overrideMaxMessagesMonth: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const PATCH = withSuperadmin(async (admin, req: Request, { params }: Params) => {
  const { id } = await params;
  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;
  const ok = await updateTenant(admin, id, body.data);
  if (!ok) return apiError(404, "not_found", "Negocio no encontrado");
  return Response.json({ ok: true });
});
