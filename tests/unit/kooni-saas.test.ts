import { afterEach, describe, expect, it, vi } from "vitest";

/** K1 — Kooni SaaS: registro abierto, candado de la cuenta y avisos. */

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => ({ from: () => Promise.resolve([{ n: 1 }]) }),
  }),
  schema: { organization: {} },
}));

import { isPublicSignupAllowed } from "@/server/auth/registration";
import { isSuperadminEmail, saasModeEnabled, trialDays } from "@/server/saas/mode";
import { avisoCuentaDe, gateFor, startOfMonthUtc } from "@/server/saas/tenant";

afterEach(() => vi.unstubAllEnvs());

const NOW = new Date("2026-11-24T12:00:00Z");
const day = 86_400_000;

describe("modo SaaS", () => {
  it("solo SAAS_MODE=on lo enciende", () => {
    vi.stubEnv("SAAS_MODE", "on");
    expect(saasModeEnabled()).toBe(true);
    vi.stubEnv("SAAS_MODE", "true");
    expect(saasModeEnabled()).toBe(false);
    vi.stubEnv("SAAS_MODE", "");
    expect(saasModeEnabled()).toBe(false);
  });

  it("registro abierto aunque ya haya negocios", async () => {
    vi.stubEnv("SAAS_MODE", "on");
    vi.stubEnv("SIGNUP_CLOSED", "");
    expect(await isPublicSignupAllowed()).toBe(true);
  });

  it("SIGNUP_CLOSED=true lo cierra", async () => {
    vi.stubEnv("SAAS_MODE", "on");
    vi.stubEnv("SIGNUP_CLOSED", "true");
    expect(await isPublicSignupAllowed()).toBe(false);
  });

  it("sin modo SaaS se comporta como el original (cerrado tras el primero)", async () => {
    vi.stubEnv("SAAS_MODE", "");
    vi.stubEnv("ALLOW_SIGNUP", "");
    expect(await isPublicSignupAllowed()).toBe(false);
  });

  it("días de prueba: 14 por defecto", () => {
    vi.stubEnv("SAAS_TRIAL_DAYS", "");
    expect(trialDays()).toBe(14);
    vi.stubEnv("SAAS_TRIAL_DAYS", "7");
    expect(trialDays()).toBe(7);
  });

  it("superadmin por correo, sin importar mayúsculas ni espacios", () => {
    vi.stubEnv("SUPERADMIN_EMAILS", " Yo@Kooni.com , otro@kooni.com");
    expect(isSuperadminEmail("yo@kooni.com")).toBe(true);
    expect(isSuperadminEmail("OTRO@kooni.com ")).toBe(true);
    expect(isSuperadminEmail("cliente@x.com")).toBe(false);
    expect(isSuperadminEmail(null)).toBe(false);
  });
});

describe("candado de la cuenta", () => {
  it("sin fila no bloquea", () => {
    expect(gateFor(null, NOW)).toEqual({ blocked: false });
  });

  it("activa no bloquea", () => {
    expect(gateFor({ status: "active", trialEndsAt: null }, NOW).blocked).toBe(false);
  });

  it("prueba vigente no bloquea; vencida sí", () => {
    expect(gateFor({ status: "trial", trialEndsAt: new Date(NOW.getTime() + day) }, NOW).blocked).toBe(false);
    const g = gateFor({ status: "trial", trialEndsAt: new Date(NOW.getTime() - 1) }, NOW);
    expect(g).toMatchObject({ blocked: true, code: "trial_expired" });
  });

  it("suspendida bloquea y dice el motivo", () => {
    const g = gateFor({ status: "suspended", trialEndsAt: null, suspendedReason: "impago" }, NOW);
    expect(g).toMatchObject({ blocked: true, code: "suspended" });
    if (g.blocked) expect(g.message).toContain("impago");
  });

  it("cancelada bloquea", () => {
    expect(gateFor({ status: "cancelled", trialEndsAt: null }, NOW)).toMatchObject({ blocked: true, code: "cancelled" });
  });
});

describe("aviso de la cuenta", () => {
  it("nada que decir con la prueba lejos", () => {
    expect(avisoCuentaDe({ status: "trial", trialEndsAt: new Date(NOW.getTime() + 10 * day) }, NOW)).toBeNull();
  });

  it("avisa 3 días antes", () => {
    const a = avisoCuentaDe({ status: "trial", trialEndsAt: new Date(NOW.getTime() + 3 * day) }, NOW);
    expect(a).toEqual({ tono: "aviso", mensaje: "Tu prueba gratis termina en 3 días." });
  });

  it("bloqueo en rojo", () => {
    expect(avisoCuentaDe({ status: "suspended", trialEndsAt: null }, NOW)?.tono).toBe("bloqueo");
  });
});

it("inicio de mes en UTC", () => {
  expect(startOfMonthUtc(NOW).toISOString()).toBe("2026-11-01T00:00:00.000Z");
});
