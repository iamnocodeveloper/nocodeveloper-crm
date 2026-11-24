# Cambios

## 2.0.0 — 2026-11-24

Nocodeveloper CRM pasa a ser una plataforma SaaS: muchos negocios en una sola
instalación, con planes, prueba gratis y un panel de administración.

### Nuevo

- **Modo SaaS** (`SAAS_MODE=on`): cada registro crea su propio negocio con
  plan de prueba (`SAAS_TRIAL_DAYS`, 14 por defecto). Un negocio suspendido o
  con la prueba vencida puede ver sus datos, pero no enviar ni cambiar nada.
  Límite de mensajes al mes y de usuarios por plan.
- **Panel `/admin`** para el dueño de la plataforma (`SUPERADMIN_EMAILS`):
  resumen, negocios (plan, estado, prueba, límite propio, suspender,
  reactivar, notas internas), usuarios, planes, integraciones y bitácora.
- **Integraciones de la plataforma** desde el panel: WAHA (WhatsApp no
  oficial) y Zernio (WhatsApp oficial con coexistencia). Las llaves se
  guardan cifradas y se pueden probar con un botón.
- **WhatsApp por Zernio** con coexistencia (`WHATSAPP_ZERNIO=on`): lo que el
  dueño escribe desde la app del teléfono entra en la bandeja y pausa la IA.
- **API pública v1** con llaves por negocio, su MCP y OAuth (`API_V1=on`).
- Bandeja: reacciones, responder citando, reenviar, notas internas, chats
  fijados, respuestas rápidas, notas de voz, mensajes editados y todos los
  adjuntos de Instagram, Messenger y TikTok.
- Webhooks guardados antes de procesarse: si algo falla, se reintenta solo.
- Temas y apariencia por negocio; PWA instalable con avisos.

### Actualizar desde 1.0

La numeración de migraciones cambió. Instala la 2.0 sobre una base nueva; las
migraciones se aplican solas al arrancar.
