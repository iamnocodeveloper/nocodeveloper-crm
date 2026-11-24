import { describe, expect, it, vi } from "vitest";

/** K4 — Panel de administración: integraciones y planes. */

vi.mock("@/lib/db", () => ({ getDb: () => ({}), schema: {} }));
vi.mock("@/lib/crypto", () => ({ encryptSecret: vi.fn(), decryptSecret: vi.fn() }));

import { cleanConfig, isIntegrationKey, INTEGRATION_FIELDS } from "@/server/saas/integrations";
import { planSchema } from "@/server/saas/plan-schema";

describe("integraciones", () => {
  it("solo waha y zernio", () => {
    expect(isIntegrationKey("waha")).toBe(true);
    expect(isIntegrationKey("zernio")).toBe(true);
    expect(isIntegrationKey("meta")).toBe(false);
    expect(isIntegrationKey("")).toBe(false);
  });

  it("WAHA pide URL y motor; Zernio su URL", () => {
    expect(INTEGRATION_FIELDS.waha.fields.map((f) => f.name)).toContain("baseUrl");
    expect(INTEGRATION_FIELDS.zernio.fields.map((f) => f.name)).toContain("baseUrl");
  });

  it("cleanConfig descarta campos desconocidos, vacíos y la barra final", () => {
    expect(
      cleanConfig("waha", {
        baseUrl: " https://waha.x.com/ ",
        engine: "GOWS",
        dashboardUrl: "",
        apiKey: "no-debe-colarse",
        otro: 1,
      })
    ).toEqual({ baseUrl: "https://waha.x.com", engine: "GOWS" });
  });
});

describe("planes", () => {
  const base = {
    name: "Pro",
    priceCents: 2900,
    currency: "usd",
    maxMessagesMonth: 5000,
    maxUsers: 5,
    maxWhatsappNumbers: 1,
    providers: ["waha", "zernio"],
    woocommerce: true,
    isDefault: false,
    archived: false,
  };

  it("acepta un plan válido y pone la moneda en mayúsculas", () => {
    const r = planSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.currency).toBe("USD");
  });

  it("null = sin límite", () => {
    expect(planSchema.safeParse({ ...base, maxMessagesMonth: null, maxUsers: null }).success).toBe(true);
  });

  it("rechaza proveedores desconocidos y precios negativos", () => {
    expect(planSchema.safeParse({ ...base, providers: ["telegram"] }).success).toBe(false);
    expect(planSchema.safeParse({ ...base, priceCents: -1 }).success).toBe(false);
  });
});
