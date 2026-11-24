import { describe, expect, it, vi } from "vitest";

/** K5 — WhatsApp por Zernio con la cuenta de la plataforma. */

vi.mock("@/lib/db", () => ({ getDb: () => ({}), schema: {} }));
vi.mock("@/lib/crypto", () => ({ encryptSecret: vi.fn(), decryptSecret: vi.fn() }));

import { consultaDeConexion, EVENTOS_PLATAFORMA, perfilesDe } from "@/server/zernio/plataforma";

describe("enlace de conexión", () => {
  const base = { profileId: "p1", redirectUrl: "https://app.x/api/settings/whatsapp-zernio/callback", marca: "Mi Tienda" };

  it("coexistencia = onboarding business_app, página alojada en español", () => {
    const q = new URLSearchParams(consultaDeConexion({ ...base, modo: "coexistencia" }));
    expect(q.get("onboarding")).toBe("business_app");
    expect(q.get("signup")).toBe("hosted");
    expect(q.get("language")).toBe("es");
    expect(q.get("profileId")).toBe("p1");
    expect(q.get("redirect_url")).toBe(base.redirectUrl);
    expect(q.get("brandName")).toBe("Mi Tienda");
  });

  it("solo API = onboarding api", () => {
    expect(new URLSearchParams(consultaDeConexion({ ...base, modo: "api" })).get("onboarding")).toBe("api");
  });

  it("la marca se corta a 60 y vacía no se manda", () => {
    const larga = new URLSearchParams(consultaDeConexion({ ...base, modo: "api", marca: "x".repeat(80) }));
    expect(larga.get("brandName")).toHaveLength(60);
    const vacia = new URLSearchParams(consultaDeConexion({ ...base, modo: "api", marca: "  " }));
    expect(vacia.has("brandName")).toBe(false);
  });
});

describe("perfiles", () => {
  it("lee la lista venga como venga", () => {
    const p = { _id: "a", externalId: "org_1" };
    expect(perfilesDe({ profiles: [p] })).toEqual([p]);
    expect(perfilesDe({ data: [p] })).toEqual([p]);
    expect(perfilesDe([p])).toEqual([p]);
    expect(perfilesDe(null)).toEqual([]);
  });
});

it("el webhook de la plataforma escucha entrantes, salientes del teléfono, estados y reacciones", () => {
  for (const e of ["message.received", "message.sent", "message.delivered", "message.read", "message.failed", "reaction.received"]) {
    expect(EVENTOS_PLATAFORMA).toContain(e);
  }
});
