import { describe, expect, it } from "vitest";
import { tituloConNoLeidos } from "@/components/avisos-de-mensajes";

/** 045 — El contador de la pestaña, como «(3) WhatsApp». */
describe("tituloConNoLeidos", () => {
  it("antepone los chats sin leer", () => {
    expect(tituloConNoLeidos("Nocodeveloper — CRM", 3)).toBe("(3) Nocodeveloper — CRM");
  });
  it("sin pendientes deja el título limpio", () => {
    expect(tituloConNoLeidos("(3) Nocodeveloper — CRM", 0)).toBe("Nocodeveloper — CRM");
  });
  it("no apila contadores al actualizar", () => {
    expect(tituloConNoLeidos("(3) Nocodeveloper — CRM", 5)).toBe("(5) Nocodeveloper — CRM");
  });
  it("más de 99 se muestra como 99+", () => {
    expect(tituloConNoLeidos("Nocodeveloper", 140)).toBe("(99+) Nocodeveloper");
    expect(tituloConNoLeidos("(99+) Nocodeveloper", 2)).toBe("(2) Nocodeveloper");
  });
});
