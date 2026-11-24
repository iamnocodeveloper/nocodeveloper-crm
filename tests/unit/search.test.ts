import { describe, expect, it } from "vitest";
import { digitsOnly, matchesQuery, normalizeText } from "@/lib/search";

describe("normalizeText", () => {
  it("baja a minúsculas y quita acentos", () => {
    expect(normalizeText("José Ñuñez")).toBe("jose nunez");
    expect(normalizeText("SESIÓN AGENDADA")).toBe("sesion agendada");
  });
});

describe("digitsOnly", () => {
  it("deja solo dígitos", () => {
    expect(digitsOnly("+52 555 000 1234")).toBe("525550001234");
    expect(digitsOnly("(477) 605-3008")).toBe("4776053008");
  });
});

describe("matchesQuery (bug reportado en producción)", () => {
  // La Bandeja pasa SOLO el nombre: incluir el último mensaje hacía que
  // buscar el nombre del dueño devolviera media bandeja (el agente lo escribe
  // en sus propios mensajes).
  const ana = {
    text: ["Ana Torres Sesión 🐏"],
    phone: "525550001234",
  };

  it("consulta vacía → no filtra", () => {
    expect(matchesQuery("", ana)).toBe(true);
    expect(matchesQuery("   ", ana)).toBe(true);
  });

  it("nombre parcial, sin importar mayúsculas", () => {
    expect(matchesQuery("Ana", ana)).toBe(true);
    expect(matchesQuery("ana", ana)).toBe(true);
    expect(matchesQuery("torres", ana)).toBe(true);
  });

  it("encuentra por acentos ausentes en la consulta", () => {
    expect(matchesQuery("sesion", ana)).toBe(true);
    expect(matchesQuery("Sesión", ana)).toBe(true);
  });

  it("teléfono tal como se ve en pantalla, con formato", () => {
    expect(matchesQuery("+52 555 000 1234", ana)).toBe(true);
    expect(matchesQuery("555 000", ana)).toBe(true);
    expect(matchesQuery("555-000-1234", ana)).toBe(true);
    expect(matchesQuery("5550001234", ana)).toBe(true);
  });

  it("no empareja con quien no es", () => {
    expect(matchesQuery("Diego", ana)).toBe(false);
    expect(matchesQuery("5559999999", ana)).toBe(false);
  });

  it("no mira campos que no se le pasan (el mensaje ya no cuenta)", () => {
    const leonardo = { text: ["Leonardo García"], phone: "528999129209" };
    // Su último mensaje nombra a Ana, pero el preview ya no viaja aquí.
    expect(matchesQuery("Ana", leonardo)).toBe(false);
  });

  it("uno o dos dígitos sueltos no barren el directorio", () => {
    expect(matchesQuery("5", ana)).toBe(false);
    expect(matchesQuery("52", ana)).toBe(false);
  });

  it("contacto BSUID sin teléfono no revienta", () => {
    expect(matchesQuery("555000", { text: ["Anónimo"], phone: null })).toBe(false);
    expect(matchesQuery("anon", { text: ["Anónimo"], phone: null })).toBe(true);
  });

  it("ignora nulos en los campos de texto", () => {
    expect(matchesQuery("hola", { text: [null, undefined, "Hola mundo"] })).toBe(true);
  });
});
