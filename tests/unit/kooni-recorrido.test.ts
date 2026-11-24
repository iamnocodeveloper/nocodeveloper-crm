import { describe, expect, it } from "vitest";
import { colocarTarjeta, pasosDelRecorrido } from "@/lib/recorrido";

/** K7 — Recorrido guiado: qué ve cada quien y dónde va la tarjeta. */

const ids = (opts: Parameters<typeof pasosDelRecorrido>[0]) => pasosDelRecorrido(opts).map((p) => p.id);

describe("pasos", () => {
  it("el propietario ve todo, empieza con bienvenida y termina en la guía", () => {
    const pasos = pasosDelRecorrido({ marca: "Kooni", role: "owner", agenda: false, woocommerce: true });
    expect(pasos[0]!.id).toBe("bienvenida");
    expect(pasos[0]!.titulo).toContain("Kooni");
    expect(pasos.at(-1)!.id).toBe("final");
    expect(pasos.at(-1)!.ruta).toBe("/onboarding");
    expect(pasos.map((p) => p.id)).toEqual(
      expect.arrayContaining(["bandeja", "pipeline", "contactos", "guia", "agente", "whatsapp", "plantillas", "woocommerce", "equipo"])
    );
  });

  it("un miembro del equipo no ve los pasos de configuración", () => {
    const v = ids({ marca: "K", role: "member", woocommerce: true });
    for (const id of ["guia", "whatsapp", "plantillas", "woocommerce", "equipo", "marca"]) expect(v).not.toContain(id);
    expect(v).toContain("bandeja");
  });

  it("Citas solo con agenda; WooCommerce solo con la API", () => {
    expect(ids({ marca: "K", role: "owner", agenda: true })).toContain("citas");
    expect(ids({ marca: "K", role: "owner", agenda: false })).not.toContain("citas");
    expect(ids({ marca: "K", role: "owner", woocommerce: false })).not.toContain("woocommerce");
  });

  it("cada paso con objetivo resalta la ruta a la que va", () => {
    for (const p of pasosDelRecorrido({ marca: "K", role: "owner", agenda: true, woocommerce: true })) {
      if (p.objetivo) expect(p.ruta).toBe(p.objetivo);
      expect(p.texto.length).toBeGreaterThan(20);
    }
  });

  it("ids únicos", () => {
    const v = ids({ marca: "K", role: "owner", agenda: true, woocommerce: true });
    expect(new Set(v).size).toBe(v.length);
  });
});

describe("posición de la tarjeta", () => {
  const vista = { w: 1280, h: 800 };
  const tarjeta = { w: 360, h: 240 };

  it("sin elemento: centrada", () => {
    expect(colocarTarjeta(null, vista, tarjeta)).toMatchObject({ lado: "centro", left: 460, top: 280 });
  });

  it("menú lateral a la izquierda: a su derecha y sin salirse por arriba", () => {
    const r = { top: 10, left: 16, right: 60, bottom: 54, width: 44, height: 44 };
    const p = colocarTarjeta(r, vista, tarjeta);
    expect(p.lado).toBe("derecha");
    expect(p.left).toBe(74);
    expect(p.top).toBeGreaterThanOrEqual(14);
  });

  it("sin sitio a la derecha: debajo", () => {
    const r = { top: 100, left: 1100, right: 1260, bottom: 130, width: 160, height: 30 };
    expect(colocarTarjeta(r, vista, tarjeta).lado).toBe("abajo");
  });

  it("en el teléfono: centrada a lo ancho, debajo o encima de lo resaltado", () => {
    const movil = { w: 390, h: 800 };
    const r = { top: 60, left: 100, right: 200, bottom: 90, width: 100, height: 30 };
    const p = colocarTarjeta(r, movil, { w: 362, h: 240 });
    expect(p.lado).toBe("abajo");
    expect(p.left).toBe(14);
    expect(p.top).toBe(104);
  });
});
