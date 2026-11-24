"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  colocarTarjeta,
  EVENTO_RECORRIDO,
  pasosDelRecorrido,
  RECORRIDO_ESTADO,
  RECORRIDO_VISTO,
} from "@/lib/recorrido";

/**
 * K7 — Recorrido guiado del panel. Oscurece la pantalla, resalta la sección
 * (el enlace del menú o de Ajustes con su `data-tour`), explica qué hay y va
 * de pantalla en pantalla. Arranca solo la primera vez y se repite desde el
 * botón de la brújula (evento `kooni:recorrido`).
 *
 * Vive en el AppShell, que no se desmonta al navegar: el paso sobrevive al
 * cambio de pantalla sin más estado que este.
 */

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number };

const leer = (k: string) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const escribir = (k: string, v: string | null) => {
  try {
    if (v === null) window.localStorage.removeItem(k);
    else window.localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento: el recorrido funciona igual, solo no se recuerda */
  }
};

/** El elemento visible con ese `data-tour` (el riel en escritorio, la tira en el teléfono). */
function buscar(objetivo: string): HTMLElement | null {
  const todos = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(objetivo)}"]`));
  return (
    todos.find((el) => {
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && r.right > 0 && r.left < window.innerWidth;
    }) ?? null
  );
}

export function Recorrido({
  marca,
  role,
  agenda = false,
  woocommerce = false,
}: {
  marca: string;
  role: string;
  agenda?: boolean;
  woocommerce?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const pasos = useMemo(
    () => pasosDelRecorrido({ marca, role, agenda, woocommerce }),
    [marca, role, agenda, woocommerce]
  );
  const [paso, setPaso] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vista, setVista] = useState({ w: 1280, h: 800 });
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState(220);

  const actual = paso === null ? null : pasos[paso] ?? null;

  const cerrar = useCallback(() => {
    setPaso(null);
    escribir(RECORRIDO_VISTO, "1");
    escribir(RECORRIDO_ESTADO, null);
  }, []);

  const ir = useCallback(
    (n: number) => {
      if (n < 0) return;
      if (n >= pasos.length) {
        cerrar();
        return;
      }
      setRect(null);
      setPaso(n);
      escribir(RECORRIDO_ESTADO, String(n));
    },
    [pasos.length, cerrar]
  );

  // Arranque: la primera vez solo, o donde se quedó si se recargó la página.
  useEffect(() => {
    const abrir = () => ir(0);
    window.addEventListener(EVENTO_RECORRIDO, abrir);
    const enCurso = leer(RECORRIDO_ESTADO);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (enCurso !== null && !Number.isNaN(Number(enCurso))) {
      t = setTimeout(() => setPaso(Math.min(Number(enCurso), pasos.length - 1)), 400);
    } else if (!leer(RECORRIDO_VISTO)) {
      t = setTimeout(() => ir(0), 900);
    }
    return () => {
      window.removeEventListener(EVENTO_RECORRIDO, abrir);
      if (t) clearTimeout(t);
    };
    // Solo al montar: el AppShell vive mientras se navega.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cada paso: ir a su pantalla y esperar a que su elemento aparezca.
  useEffect(() => {
    if (!actual) return;
    if (actual.ruta && !pathname.startsWith(actual.ruta)) {
      router.push(actual.ruta);
      return;
    }
    if (!actual.objetivo) {
      setRect(null);
      return;
    }
    let vivo = true;
    let intentos = 0;
    const medir = () => {
      if (!vivo) return;
      const el = buscar(actual.objetivo!);
      if (el) {
        el.scrollIntoView({ block: "nearest", inline: "center" });
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
      } else if (intentos++ < 20) {
        setTimeout(medir, 100);
      } else {
        setRect(null);
      }
    };
    medir();
    return () => {
      vivo = false;
    };
  }, [actual, pathname, router]);

  // Tamaño de la ventana y re-medida al desplazar o redimensionar.
  useEffect(() => {
    if (!actual) return;
    const alCambiar = () => {
      setVista((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }));
      if (actual.objetivo) {
        const el = buscar(actual.objetivo);
        if (el) {
          const r = el.getBoundingClientRect();
          // Solo si se movió: evita repintar por nada.
          setRect((p) =>
            p && p.top === r.top && p.left === r.left && p.width === r.width && p.height === r.height
              ? p
              : { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
          );
        }
      }
    };
    alCambiar();
    window.addEventListener("resize", alCambiar);
    window.addEventListener("scroll", alCambiar, true);
    // La página de debajo termina de cargar y cambia de tamaño sin ningún
    // evento de scroll: se vuelve a medir un rato.
    const reloj = setInterval(alCambiar, 250);
    return () => {
      window.removeEventListener("resize", alCambiar);
      window.removeEventListener("scroll", alCambiar, true);
      clearInterval(reloj);
    };
  }, [actual]);

  useLayoutEffect(() => {
    if (tarjetaRef.current) setAlto(tarjetaRef.current.offsetHeight);
  }, [actual, vista.w]);

  // Teclado: flechas para avanzar o volver, Escape para salir.
  useEffect(() => {
    if (paso === null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      else if (e.key === "ArrowRight") ir(paso + 1);
      else if (e.key === "ArrowLeft") ir(paso - 1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [paso, ir, cerrar]);

  if (!actual || paso === null) return null;

  const ancho = Math.min(360, vista.w - 28);
  const pos = colocarTarjeta(rect, vista, { w: ancho, h: alto });
  const ultimo = paso === pasos.length - 1;
  const pad = 6;

  // El hueco alrededor de lo resaltado, recortado a la ventana.
  const hueco = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        right: Math.min(vista.w, rect.right + pad),
        bottom: Math.min(vista.h, rect.bottom + pad),
      }
    : null;
  const velo = "fixed bg-[rgba(10,12,16,0.62)] transition-all duration-200";

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby="recorrido-titulo">
      {/* Velo en cuatro paneles alrededor del hueco (una sombra gigante no
          se pinta en todos los navegadores). Sin hueco, la pantalla entera. */}
      {hueco ? (
        <>
          <div aria-hidden className={velo} style={{ top: 0, left: 0, right: 0, height: hueco.top }} />
          <div aria-hidden className={velo} style={{ top: hueco.bottom, left: 0, right: 0, bottom: 0 }} />
          <div aria-hidden className={velo} style={{ top: hueco.top, left: 0, width: hueco.left, height: hueco.bottom - hueco.top }} />
          <div aria-hidden className={velo} style={{ top: hueco.top, left: hueco.right, right: 0, height: hueco.bottom - hueco.top }} />
          <div
            aria-hidden
            className="pointer-events-none fixed rounded-xl ring-2 ring-brand ring-offset-2 ring-offset-transparent transition-all duration-200"
            style={{ top: hueco.top, left: hueco.left, width: hueco.right - hueco.left, height: hueco.bottom - hueco.top }}
          />
        </>
      ) : (
        <div aria-hidden className="fixed inset-0 bg-[rgba(10,12,16,0.62)]" />
      )}
      {/* Captura los clics fuera de la tarjeta: el recorrido no se rompe por un toque. */}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()} />

      <div
        ref={tarjetaRef}
        className="fixed rounded-2xl border bg-popover p-4 text-popover-foreground shadow-pop transition-[top,left] duration-200"
        style={{ top: pos.top, left: pos.left, width: ancho }}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="kicker mt-1">
            Paso {paso + 1} de {pasos.length}
          </p>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Salir del recorrido"
            className="rounded-md p-1 text-text-3 hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 id="recorrido-titulo" className="text-[17px] font-semibold leading-snug">
          {actual.titulo}
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-2">{actual.texto}</p>
        {actual.puntos && actual.puntos.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-snug text-text-2">
            {actual.puntos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-1" aria-hidden>
          {pasos.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 flex-1 rounded-full ${i <= paso ? "bg-brand" : "bg-border"}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {paso === 0 ? (
            <Button variant="ghost" size="sm" onClick={cerrar}>
              Ahora no
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => ir(paso - 1)}>
              Anterior
            </Button>
          )}
          <Button size="sm" onClick={() => ir(paso + 1)} autoFocus>
            {paso === 0 ? "Empezar" : ultimo ? "Terminar" : "Siguiente"}
          </Button>
        </div>
      </div>
    </div>,
    // En el body: fuera del marco de la app (que recorta con overflow).
    document.body
  );
}

/** Botón que abre el recorrido desde cualquier sitio. */
export function abrirRecorrido() {
  window.dispatchEvent(new Event(EVENTO_RECORRIDO));
}
