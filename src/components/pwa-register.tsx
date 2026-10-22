"use client";

import { useEffect } from "react";

/**
 * Registra el service worker solo en producción. En desarrollo un SW cacheando
 * `/_next/static` convierte cada recarga en una cacería de chunks viejos.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Un primer intento puede fallar por una red móvil inestable. Se reintenta
    // hasta tres veces; sin SW la app sigue funcionando, solo pierde el modo
    // offline, así que el último fallo se ignora.
    const register = (attempt = 0) => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        if (attempt < 3) {
          window.setTimeout(() => register(attempt + 1), 4_000);
        }
      });
    };

    const onLoad = () => register();
    if (document.readyState === "complete") register();
    else window.addEventListener("load", onLoad, { once: true });

    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
