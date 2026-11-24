<h1 align="center">Nocodeveloper CRM</h1>

<p align="center">
  <strong>CRM de WhatsApp multi-negocio, self-hosted, con agente de IA, panel de administración SaaS e integración con WooCommerce.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-C6F24E?style=flat-square" alt="MIT" />
  <img src="https://img.shields.io/badge/version-2.0.0-C6F24E?style=flat-square" alt="v2.0.0" />
  <img src="https://img.shields.io/badge/Next.js-15-101216?style=flat-square" alt="Next.js 15" />
</p>

---

## Qué es

Nocodeveloper CRM reúne en una sola aplicación la operación de los negocios que venden por WhatsApp:
bandeja en tiempo real, pipeline, contactos, agenda, agente de IA y un Laboratorio donde clientes simulados
ponen a prueba al agente antes de que hable con personas reales.

Desde la 2.0 es **SaaS**: una instalación sirve a muchos negocios, cada uno con su plan, y tú los gestionas desde
el panel `/admin`.

## Lo que incluye

| Área | Qué hace |
|---|---|
| **Bandeja** | WhatsApp, Instagram, Messenger y TikTok en tiempo real; estados, adjuntos, reacciones, citas, reenvíos, notas internas, chats fijados, respuestas rápidas y notas de voz. |
| **WhatsApp** | API oficial directa con Meta, API oficial por **Zernio con coexistencia** y (próximamente) **WAHA**. |
| **Pipeline y contactos** | Etapas, valores, prioridad, ficha del cliente e importación CSV. |
| **Agente de IA** | Perfil, rol, tono y conocimiento del negocio; cerebro propio por `/api/bot/*`. |
| **Laboratorio** | Clientes simulados conversan con el agente y un juez devuelve score y sugerencias. |
| **Citas y resultados** | Agenda con Google Calendar y Zoom, atribución de anuncios y métricas. |
| **API v1 + MCP** | API pública con llaves por negocio y servidor MCP con OAuth. |
| **SaaS** | Registro abierto, planes, prueba gratis, límites, suspensión y panel `/admin`. |
| **White-label** | Nombre, colores, tema, favicon e iconos por negocio. |

## Panel de administración

Con `SAAS_MODE=on` y tu correo en `SUPERADMIN_EMAILS`, entra en `/admin`:

- **Resumen**: negocios, altas, estados, mensajes del mes y números conectados.
- **Negocios**: plan, estado, prueba, límite propio, suspender o reactivar y notas internas.
- **Usuarios** y **Planes** (precio, mensajes, usuarios, números, proveedores, WooCommerce).
- **Integraciones**: WAHA y Zernio, con la llave cifrada y botón de prueba.
- **Bitácora** de cambios.

## Instalación

### Easypanel, Coolify o similar

1. Crea una base PostgreSQL 15+.
2. Crea una app desde este repositorio con el `Dockerfile` de la raíz y un volumen en `/data`.
3. Pon las variables de `.env.example`. Imprescindibles: `APP_BASE_URL`, `DATABASE_URL`,
   `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY` (32 bytes en base64), `META_WEBHOOK_VERIFY_TOKEN`,
   `SAAS_MODE=on` y `SUPERADMIN_EMAILS`.
4. Despliega: las migraciones se aplican solas al arrancar. Comprueba `/api/health`.

### Docker Compose

```bash
cp .env.example .env   # rellena las variables
docker compose up -d --build
```

### Desarrollo local

Requisitos: Node.js 20+, pnpm 11 y PostgreSQL 15+.

```bash
corepack pnpm install
corepack pnpm db:migrate
corepack pnpm dev
```

## Arquitectura

```text
Next.js 15 (App Router) + React 19 + TypeScript
        ├─ PostgreSQL + Drizzle ORM (todas las tablas separadas por negocio)
        ├─ SSE /api/events para tiempo real
        ├─ WhatsApp: Meta Cloud API · Zernio · WAHA
        ├─ Webhooks guardados en cola con reintentos
        ├─ API v1 + MCP + OAuth
        └─ PWA instalable
```

## Licencia

MIT. Consulta [LICENSE](LICENSE).
