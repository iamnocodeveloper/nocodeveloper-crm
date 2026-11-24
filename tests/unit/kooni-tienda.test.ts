import { describe, expect, it } from "vitest";
import { countVariables } from "@/lib/templates";
import {
  aCentimos,
  ESTADOS_PEDIDO,
  formatoTotal,
  PLANTILLAS_PEDIDO,
  rellenar,
  resumenProductos,
  telefonoE164,
  valorDePlantilla,
  VARIABLES,
  type DatosAviso,
} from "@/server/tienda/formato";

/** K6 — WooCommerce: formato de los avisos y plantillas para aprobación. */

const datos: DatosAviso = {
  nombre: "Ana",
  apellido: "Torres",
  pedido: "1234",
  totalCents: 45000,
  moneda: "MXN",
  estado: "processing",
  productos: [
    { name: "Camiseta", quantity: 2 },
    { name: "Gorra", quantity: 1 },
  ],
  tienda: "Mi Tienda",
  seguimiento: null,
  enlaceSeguimiento: null,
  enlacePago: "https://t.com/pagar",
};

describe("avisos", () => {
  it("rellena las variables", () => {
    expect(rellenar("Hola {nombre}, pedido #{pedido} ({estado}) de {tienda}", datos)).toBe(
      "Hola Ana, pedido #1234 (Procesando) de Mi Tienda"
    );
  });

  it("lo que no existe queda vacío y no deja dobles espacios", () => {
    expect(rellenar("Listo. {seguimiento} Gracias", datos)).toBe("Listo. Gracias");
  });

  it("deja intactos los tokens desconocidos", () => {
    expect(rellenar("Hola {otro}", datos)).toBe("Hola {otro}");
  });

  it("una variable de plantilla nunca va vacía", () => {
    expect(valorDePlantilla("{seguimiento}", datos)).toBe("-");
    expect(valorDePlantilla("{nombre}", datos)).toBe("Ana");
  });

  it("resume productos", () => {
    expect(resumenProductos(datos.productos)).toBe("2× Camiseta, Gorra");
    const muchos = Array.from({ length: 5 }, (_, i) => ({ name: `P${i}`, quantity: 1 }));
    expect(resumenProductos(muchos)).toBe("P0, P1, P2 y 2 más");
  });

  it("formatea el total con su moneda", () => {
    expect(formatoTotal(45000, "MXN")).toContain("450");
    expect(formatoTotal(null, "MXN")).toBe("");
    expect(formatoTotal(100, "XXX!")).toContain("1.00");
  });
});

describe("datos del plugin", () => {
  it("teléfonos: solo dígitos con prefijo", () => {
    expect(telefonoE164("+52 1 55 1234 5678")).toBe("5215512345678");
    expect(telefonoE164("0034612345678")).toBe("34612345678");
    expect(telefonoE164("123")).toBeNull();
    expect(telefonoE164(null)).toBeNull();
  });

  it("importes a céntimos", () => {
    expect(aCentimos("1250.5")).toBe(125050);
    expect(aCentimos("1,250.50")).toBe(125050);
    expect(aCentimos(10)).toBe(1000);
    expect(aCentimos("")).toBeNull();
    expect(aCentimos("abc")).toBeNull();
  });
});

describe("plantillas para aprobación (reglas de Meta)", () => {
  const tokens = new Set<string>(VARIABLES.map((v) => v.token));

  it("hay una por cada estado y nombres válidos", () => {
    expect(PLANTILLAS_PEDIDO.map((p) => p.slug).sort()).toEqual(ESTADOS_PEDIDO.map((e) => e.slug).sort());
    for (const p of PLANTILLAS_PEDIDO) expect(p.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  for (const p of PLANTILLAS_PEDIDO) {
    it(`${p.name}: variables, ejemplos y bordes`, () => {
      const n = countVariables(p.body);
      expect(p.variables).toHaveLength(n);
      expect(p.examples).toHaveLength(n);
      for (const v of p.variables) expect(tokens.has(v)).toBe(true);
      // Meta rechaza una variable al principio o al final del cuerpo.
      expect(p.body.trim().startsWith("{{")).toBe(false);
      expect(p.body.trim().endsWith("}}")).toBe(false);
    });
  }
});
