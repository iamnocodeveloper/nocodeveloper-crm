# Changelog

## 1.0.0 — 2026-10-22

Primera release pública de **Nocodeveloper CRM**: core open source, identidad
propia y experiencia móvil/PWA.

### Identidad

- Rebranding completo: nombre, paleta obsidiana/lima, tipografía Space Grotesk +
  Fraunces + JetBrains Mono, login de dos paneles, iconos PWA y favicon.
- `DEFAULT_BRANDING` y presets de acento actualizados.
- README, docs, manifiestos y metadatos del repo rebrandeados.

### Móvil y PWA

- Barra inferior con Bandeja, Pipeline, Contactos, Citas/Agente y Más.
- Cajón lateral, safe-area y cierre al navegar.
- Bandeja maestro-detalle y panel de detalles adaptable.
- Hoja **+** del compositor para archivo, ubicación y contacto.
- Diálogos convertidos en hojas inferiores en el teléfono.
- Manifest, service worker, iconos 192/512/maskable, Apple touch y `/offline`.
- Ajustes con tira de pestañas desplazable y Agente sin desbordes.

### Core

- Conserva las funciones del upstream: bandeja, pipeline, contactos, agente,
  Laboratorio, agenda, atribución, canales opcionales y white-label.
- Tests de versión, manifiestos, branding, contraste y navegación móvil
  actualizados a la nueva identidad.

### Alcance

- No incluye los módulos privados de operación de clientes (bloqueo avanzado de
  IA, catálogo, ventas y automatizaciones específicas).
- La licencia MIT se conserva en `LICENSE`.

### Actualizar

Es la primera release pública: no hay migración desde una versión anterior de
Nocodeveloper CRM. Si vienes del upstream, revisa `docs/migrar-a-2.0.md`.
