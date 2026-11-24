import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // El tsconfig dice `jsx: "preserve"` porque de JSX se encarga Next. Vitest
  // no es Next: sin esto compila el JSX al runtime clásico (`React.
  // createElement` sin importar React) y un componente no se puede dibujar
  // en una prueba (ver tests/unit/switch.test.ts).
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Varias pruebas importan una ruta entera dentro del test: esa primera
    // carga, con toda la suite en paralelo en una máquina cargada, pasa de los
    // 5 s por defecto sin que haya nada roto.
    testTimeout: 20_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
