# Rebranding: Vocero CRM → Nocodeveloper CRM

Este repositorio es una distribución rebrandeada de
[Vocero CRM](https://github.com/kevinrivm/vocero-crm), Copyright © 2026 Kevin
Belier, bajo licencia MIT. El aviso original se conserva en `LICENSE`.

## Qué se conserva del upstream

- El core funcional: bandeja, pipeline, contactos, agente, Laboratorio, agenda,
  atribución, canales opcionales, API `/api/bot/*`, migraciones y tests.
- El aviso MIT y la atribución a Kevin Belier.
- La estructura de documentación técnica y los ADRs.

## Qué es propio de Nocodeveloper

- Nombre, wordmark, paleta, tipografías, login, iconos PWA y favicon.
- La capa móvil/PWA implementada para esta distribución.
- El README y los assets de marca.
- La documentación de release, publicación y este registro de cambios.

## Identidad

| Token | Claro | Oscuro |
|---|---|---|
| Fondo | `#F7F7F0` | `#1E241B` |
| Superficie | `#FFFFFF` | `#292F24` |
| Texto | `#101216` | `#F3F6E8` |
| Texto secundario | `#4C5147` | `#C3CBB7` |
| Acento | `#77912F` | `#C6F24E` |
| Barra lateral | `#070806` | `#070806` |

Tipografías: **Space Grotesk** (`--font-sans`), **Fraunces**
(`--font-serif`) y **JetBrains Mono** (`--font-mono`).

El acento de la barra lateral se calcula contra su propio fondo
(`resolveNavAccentSet`), no contra el tema de la página. Los tests de contraste
de `tests/unit/contraste-temas.test.ts` y `branding.test.ts` vigilan los pisos
AA.

## Archivos de identidad

- `src/lib/branding.ts` — `DEFAULT_BRANDING` y presets de acento.
- `src/app/layout.tsx` — fuentes, metadata, viewport y PWA.
- `src/app/globals.css` — tokens de ambos temas, barra, chat y hojas móviles.
- `src/app/(auth)/layout.tsx` — login de dos paneles.
- `src/components/brand-mark.tsx` y `src/lib/favicon.ts` — marca e icono
  generado.
- `public/pwa-*.png`, `public/apple-touch-icon.png` — iconos instalables.
- `docs/assets/readme/` — heroes y features SVG.

## Móvil/PWA

La capa móvil se portó al core 2.0.0, no se copió del build privado:

- `src/components/mobile-nav.tsx`, `use-unread.ts`, `app-shell.tsx`,
  `app-nav.tsx`, `src/lib/nav.ts`.
- `src/app/manifest.webmanifest/route.ts`, `src/app/offline/page.tsx`,
  `src/components/pwa-register.tsx`, `public/sw.js`.
- `src/components/inbox/composer.tsx` (hoja **+**),
  `message-thread.tsx` (`overscroll-contain`).
- Reglas de hojas móviles en `globals.css` y `role="dialog"` en los overlays.

Las acciones premium del build privado (bloqueo de IA, catálogo, ventas) no se
incluyeron. La bandeja móvil conserva las acciones que existen en el core.

## Cómo cambiar la marca en una instalación

1. Entra a **Ajustes → Marca**.
2. Cambia nombre, acento, moneda y favicon.
3. El manifest, el favicon, la barra lateral y las variables CSS se recalculan
   en runtime; no hay que reconstruir la imagen.

Para cambiar el valor por defecto de una instancia nueva, edita
`DEFAULT_BRANDING` en `src/lib/branding.ts` y los tokens de `globals.css`.

## Sincronizar con el upstream

El repo público mantiene el remote `upstream`:

```bash
git fetch upstream
git log --oneline main..upstream/main
git cherry-pick <commit>   # o merge selectivo
```

No hagas merge ciego: el core público tiene una capa móvil propia y el build
privado de clientes puede tener módulos que no existen aquí.

## README y GitHub

GitHub sanea `<style>` y CSS inline en Markdown. Por eso el diseño vive en SVG
con CSS interno, referenciado con `<img>`, más HTML permitido
(`<p align="center">`, `<table>`, `<details>`) y badges. Los archivos están en
`docs/assets/readme/` y se versionan con el repo.

## Licencia

MIT. Puedes usar, modificar, vender instalaciones y mantener derivados
privados. Debes conservar el aviso de copyright y la licencia original. El
nombre y el logo de Vocero no se reclaman; “Vocero” aparece solo como
atribución al proyecto base.
