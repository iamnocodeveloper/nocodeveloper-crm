# Seguridad

## Reportar una vulnerabilidad

No abras un issue público con detalles explotables. Usa **GitHub Security
Advisories** en este repositorio:

`Security` → `Advisories` → `Report a vulnerability`

Incluye: versión afectada, pasos para reproducir, impacto y, si puedes, una
prueba de concepto mínima. Respondemos con un acuse y coordinamos la divulgación.

## Versiones soportadas

La rama `main` y la última release publicada reciben arreglos de seguridad.
Las versiones anteriores se actualizan redesplegando.

## Secretos

- Nunca publiques `.env`, tokens de Meta, llaves de IA, `BETTER_AUTH_SECRET`,
  `ENCRYPTION_KEY` ni URLs de webhook con verify token.
- Si un secreto se expuso, rótalo y revisa los logs de acceso.
- Las capturas y los issues no deben incluir teléfonos, nombres ni
  conversaciones de clientes reales.
- El proyecto no pide credenciales por correo ni por mensaje directo.
