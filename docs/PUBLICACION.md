# Publicación de Nocodeveloper CRM

Este documento registra cómo se publicó la versión 1.0.0 y qué revisar antes de
un nuevo release. No contiene secretos.

## Repositorio

- **Público:** `https://github.com/iamnocodeveloper/nocodeveloper-crm`
- **Licencia:** MIT (aviso original en `LICENSE`)
- **Versión:** `1.0.0` en `package.json`, manifiestos e imagen.

## Preflight

1. `gh auth status` con la cuenta `iamnocodeveloper`.
2. `git status` limpio y sin `.env`, `.next`, `node_modules`, `.pgdata`,
   `.dev-media`, logs ni carpetas de memoria internas.
3. Escaneo de secretos:
   - `gitleaks detect --no-git` si está disponible.
   - Búsqueda de `API_KEY`, `TOKEN`, `SECRET`, `postgresql://`, `sk-`, WAHA y
     claves de Meta.
4. Verificar que no haya nombres, teléfonos ni capturas de clientes.
5. Confirmar que `LICENSE` sigue siendo el MIT original y que `NOTICE` existe.

## Crear el repo público

```bash
gh repo create iamnocodeveloper/nocodeveloper-crm \
  --public \
  --description "CRM de WhatsApp con IA, self-hosted y móvil" \
  --source . \
  --remote origin \
  --push
```

Si el repo ya existe, solo añade el remote y empuja `main`.

## Ajustes del repositorio

- Descripción: “CRM de WhatsApp open source, self-hosted y móvil, con agente de
  IA y Laboratorio.”
- Topics: `crm`, `whatsapp`, `ai`, `nextjs`, `self-hosted`, `waha`,
  `open-source`, `pwa`.
- Licencia detectada: MIT.
- Issues activos; Discussions opcional.
- Rama por defecto: `main`.

## Verificación

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Además:

- `/api/health` responde `{"ok":true,"version":"1.0.0",...}` en una instancia
  de prueba.
- El README renderiza el hero SVG y la tira de features.
- El manifest sirve `/pwa-192.png`, `/pwa-512.png`,
  `/pwa-512-maskable.png` y `/apple-touch-icon.png`.
- En 390 px: barra inferior, cajón, hojas y sin scroll horizontal.
- En 1440 px: lateral fijo, tablas y sin barra inferior.

## Release

```bash
git tag -a v1.0.0 -m "Nocodeveloper CRM 1.0.0"
git push origin main --tags
```

El workflow `.github/workflows/imagen.yml` construye la imagen y, al crear el
tag, la publica en:

`ghcr.io/iamnocodeveloper/nocodeveloper-crm:1.0.0`

Crea el GitHub Release con las notas de `docs/1.0.0.md`.

## Repos privados de clientes

Los repositorios de las instancias privadas no se publican. Solo se actualiza
su `README.md` y sus assets de marca; el código de cada cliente sigue en su
repo privado. Nunca se copian secretos, `.env`, bases de datos ni capturas con
clientes reales al repo público.

## Sincronización

- El core público vive en `main`.
- Los cambios de la capa móvil se hacen primero aquí y se portan al build
  privado cuando apliquen.
- `upstream` se conserva para traer fixes del proyecto base con cherry-pick o
  merge selectivo; revisa siempre los conflictos de identidad y licencia.
