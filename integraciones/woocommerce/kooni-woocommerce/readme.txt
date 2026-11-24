=== Kooni para WooCommerce ===
Tags: whatsapp, woocommerce, crm, pedidos, notificaciones
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Envía cada pedido de WooCommerce a Kooni y avisa a tus clientes por WhatsApp cuando cambia el estado del pedido.

== Descripción ==

* Cada pedido nuevo y cada cambio de estado llega a Kooni en segundo plano (no frena el checkout).
* Kooni crea o actualiza el contacto por su teléfono y lo pone en el pipeline con el importe.
* Los avisos de WhatsApp se configuran en Kooni (Ajustes → WooCommerce): un mensaje por estado, con plantillas aprobadas de WhatsApp.
* Si Kooni no responde, reintenta solo (hasta 6 veces, con espera creciente).
* Casilla opcional de consentimiento en el checkout.
* Importa los pedidos de los últimos 30 días (sin mandar avisos).
* Compatible con HPOS.

== Instalación ==

1. En Kooni: Ajustes → WooCommerce → descarga el plugin y pulsa «Generar llave».
2. En WordPress: Plugins → Añadir nuevo → Subir plugin → elige el .zip → Activar.
3. WooCommerce → Kooni: pega la URL de Kooni y la llave, guarda y pulsa «Probar conexión».

== Para desarrolladores ==

* Filtro `kooni_wc_payload` ($payload, $order, $evento): cambia lo que se envía.
* Filtro `kooni_wc_tracking` (array number/url, $order): número y enlace de seguimiento de tu plugin de envíos.

== Changelog ==

= 1.0.0 =
* Primera versión.
