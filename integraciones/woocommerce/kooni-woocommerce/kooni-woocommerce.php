<?php
/**
 * Plugin Name:       Kooni para WooCommerce
 * Description:       Envía cada pedido de WooCommerce a Kooni: crea el contacto, lo pone en el pipeline y avisa al cliente por WhatsApp cuando cambia el estado del pedido.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * WC requires at least: 7.0
 * WC tested up to:   9.4
 * Author:            Nocodeveloper
 * License:           GPLv2 or later
 * Text Domain:       kooni-woocommerce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'KOONI_WC_VERSION', '1.0.0' );
define( 'KOONI_WC_OPTION', 'kooni_wc_settings' );
define( 'KOONI_WC_GROUP', 'kooni' );
define( 'KOONI_WC_MAX_INTENTOS', 6 );

/* -------------------------------------------------------------------------
 * Compatibilidad con HPOS (pedidos en tablas propias de WooCommerce).
 * ---------------------------------------------------------------------- */
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

/* -------------------------------------------------------------------------
 * Ajustes.
 * ---------------------------------------------------------------------- */
function kooni_wc_ajustes() {
	$defecto = array(
		'url'          => '',
		'key'          => '',
		'optin'        => 'no',
		'optin_texto'  => 'Quiero recibir el estado de mi pedido por WhatsApp',
		'enviar_nuevo' => 'yes',
	);
	$guardados = get_option( KOONI_WC_OPTION, array() );
	return wp_parse_args( is_array( $guardados ) ? $guardados : array(), $defecto );
}

function kooni_wc_log( $mensaje, $nivel = 'info' ) {
	if ( function_exists( 'wc_get_logger' ) ) {
		wc_get_logger()->log( $nivel, $mensaje, array( 'source' => 'kooni' ) );
	}
}

/** URL base de Kooni sin barra final. */
function kooni_wc_url( $ruta ) {
	$a = kooni_wc_ajustes();
	return rtrim( trim( $a['url'] ), '/' ) . $ruta;
}

function kooni_wc_cabeceras() {
	$a = kooni_wc_ajustes();
	return array(
		'Authorization' => 'Bearer ' . trim( $a['key'] ),
		'Content-Type'  => 'application/json',
		'Accept'        => 'application/json',
		'User-Agent'    => 'KooniWooCommerce/' . KOONI_WC_VERSION,
	);
}

function kooni_wc_configurado() {
	$a = kooni_wc_ajustes();
	return '' !== trim( $a['url'] ) && '' !== trim( $a['key'] );
}

/* -------------------------------------------------------------------------
 * Menú: WooCommerce → Kooni.
 * ---------------------------------------------------------------------- */
add_action(
	'admin_menu',
	function () {
		add_submenu_page( 'woocommerce', 'Kooni', 'Kooni', 'manage_woocommerce', 'kooni-wc', 'kooni_wc_pagina' );
	},
	99
);

add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	function ( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'admin.php?page=kooni-wc' ) ) . '">Ajustes</a>' );
		return $links;
	}
);

function kooni_wc_pagina() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}
	$a      = kooni_wc_ajustes();
	$estado = isset( $_GET['kooni'] ) ? sanitize_key( wp_unslash( $_GET['kooni'] ) ) : '';
	$msg    = isset( $_GET['kooni_msg'] ) ? sanitize_text_field( wp_unslash( $_GET['kooni_msg'] ) ) : '';
	?>
	<div class="wrap">
		<h1>Kooni para WooCommerce</h1>
		<p>Cada pedido se envía a Kooni: crea el contacto, lo pone en tu pipeline y avisa a tu cliente por WhatsApp. Los avisos se configuran en Kooni, en <strong>Ajustes → WooCommerce</strong>.</p>

		<?php if ( 'guardado' === $estado ) : ?>
			<div class="notice notice-success"><p>Ajustes guardados.</p></div>
		<?php elseif ( 'ok' === $estado ) : ?>
			<div class="notice notice-success"><p><?php echo esc_html( $msg ); ?></p></div>
		<?php elseif ( 'error' === $estado ) : ?>
			<div class="notice notice-error"><p><?php echo esc_html( $msg ); ?></p></div>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'kooni_wc_guardar' ); ?>
			<input type="hidden" name="action" value="kooni_wc_guardar" />
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="kooni_url">URL de Kooni</label></th>
					<td><input type="url" class="regular-text" id="kooni_url" name="kooni[url]" value="<?php echo esc_attr( $a['url'] ); ?>" placeholder="https://app.tudominio.com" required /></td>
				</tr>
				<tr>
					<th scope="row"><label for="kooni_key">Llave</label></th>
					<td>
						<input type="password" class="regular-text" id="kooni_key" name="kooni[key]" value="" placeholder="<?php echo $a['key'] ? '•••••••• (déjala vacía para no cambiarla)' : 'vk_…'; ?>" autocomplete="off" />
						<p class="description">Se genera en Kooni: Ajustes → WooCommerce → «Generar llave».</p>
					</td>
				</tr>
				<tr>
					<th scope="row">Pedidos nuevos</th>
					<td><label><input type="checkbox" name="kooni[enviar_nuevo]" value="yes" <?php checked( 'yes', $a['enviar_nuevo'] ); ?> /> Enviar también el aviso de pedido recibido</label></td>
				</tr>
				<tr>
					<th scope="row">Consentimiento</th>
					<td>
						<label><input type="checkbox" name="kooni[optin]" value="yes" <?php checked( 'yes', $a['optin'] ); ?> /> Mostrar una casilla en el checkout para aceptar avisos por WhatsApp</label>
						<p><input type="text" class="large-text" name="kooni[optin_texto]" value="<?php echo esc_attr( $a['optin_texto'] ); ?>" /></p>
					</td>
				</tr>
			</table>
			<?php submit_button( 'Guardar' ); ?>
		</form>

		<hr />
		<h2>Herramientas</h2>
		<p>
			<a class="button" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=kooni_wc_probar' ), 'kooni_wc_probar' ) ); ?>">Probar conexión</a>
			<a class="button" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=kooni_wc_sincronizar' ), 'kooni_wc_sincronizar' ) ); ?>">Importar pedidos de los últimos 30 días</a>
		</p>
		<p class="description">La importación no manda avisos: solo trae los pedidos y crea los contactos. Los envíos quedan registrados en WooCommerce → Estado → Registros (fuente «kooni»).</p>
	</div>
	<?php
}

function kooni_wc_volver( $estado, $msg = '' ) {
	wp_safe_redirect(
		add_query_arg(
			array(
				'page'      => 'kooni-wc',
				'kooni'     => $estado,
				'kooni_msg' => rawurlencode( $msg ),
			),
			admin_url( 'admin.php' )
		)
	);
	exit;
}

add_action(
	'admin_post_kooni_wc_guardar',
	function () {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( 'Sin permiso' );
		}
		check_admin_referer( 'kooni_wc_guardar' );
		$actual = kooni_wc_ajustes();
		$in     = isset( $_POST['kooni'] ) && is_array( $_POST['kooni'] ) ? wp_unslash( $_POST['kooni'] ) : array();
		$nueva  = isset( $in['key'] ) ? trim( sanitize_text_field( $in['key'] ) ) : '';
		update_option(
			KOONI_WC_OPTION,
			array(
				'url'          => isset( $in['url'] ) ? esc_url_raw( trim( $in['url'] ) ) : '',
				'key'          => '' !== $nueva ? $nueva : $actual['key'],
				'optin'        => isset( $in['optin'] ) ? 'yes' : 'no',
				'optin_texto'  => isset( $in['optin_texto'] ) ? sanitize_text_field( $in['optin_texto'] ) : $actual['optin_texto'],
				'enviar_nuevo' => isset( $in['enviar_nuevo'] ) ? 'yes' : 'no',
			),
			false
		);
		kooni_wc_volver( 'guardado' );
	}
);

add_action(
	'admin_post_kooni_wc_probar',
	function () {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( 'Sin permiso' );
		}
		check_admin_referer( 'kooni_wc_probar' );
		if ( ! kooni_wc_configurado() ) {
			kooni_wc_volver( 'error', 'Falta la URL de Kooni o la llave.' );
		}
		$res = wp_remote_get(
			kooni_wc_url( '/api/v1/woocommerce/ping' ),
			array(
				'headers' => kooni_wc_cabeceras(),
				'timeout' => 15,
			)
		);
		if ( is_wp_error( $res ) ) {
			kooni_wc_volver( 'error', 'No se pudo conectar con Kooni: ' . $res->get_error_message() );
		}
		$codigo = wp_remote_retrieve_response_code( $res );
		$json   = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( 200 === $codigo && ! empty( $json['ok'] ) ) {
			$negocio = isset( $json['business'] ) ? $json['business'] : '';
			kooni_wc_volver( 'ok', 'Conectado con Kooni' . ( $negocio ? ' (' . $negocio . ')' : '' ) . '.' );
		}
		$mensaje = isset( $json['error']['message'] ) ? $json['error']['message'] : 'Respuesta ' . $codigo;
		kooni_wc_volver( 'error', 'Kooni respondió: ' . $mensaje );
	}
);

add_action(
	'admin_post_kooni_wc_sincronizar',
	function () {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( 'Sin permiso' );
		}
		check_admin_referer( 'kooni_wc_sincronizar' );
		if ( ! kooni_wc_configurado() ) {
			kooni_wc_volver( 'error', 'Falta la URL de Kooni o la llave.' );
		}
		$ids = wc_get_orders(
			array(
				'date_created' => '>' . ( time() - 30 * DAY_IN_SECONDS ),
				'limit'        => 500,
				'return'       => 'ids',
				'type'         => 'shop_order',
			)
		);
		foreach ( $ids as $id ) {
			kooni_wc_encolar( $id, 'sync' );
		}
		kooni_wc_volver( 'ok', count( $ids ) . ' pedidos en cola para importar. Llegarán a Kooni en unos minutos.' );
	}
);

/* -------------------------------------------------------------------------
 * Casilla de consentimiento en el checkout (checkout clásico).
 * ---------------------------------------------------------------------- */
add_action(
	'woocommerce_review_order_before_submit',
	function () {
		$a = kooni_wc_ajustes();
		if ( 'yes' !== $a['optin'] ) {
			return;
		}
		echo '<p class="form-row kooni-optin"><label class="woocommerce-form__label woocommerce-form__label-for-checkbox checkbox">';
		echo '<input type="checkbox" class="woocommerce-form__input woocommerce-form__input-checkbox input-checkbox" name="kooni_whatsapp_optin" value="1" checked /> ';
		echo '<span>' . esc_html( $a['optin_texto'] ) . '</span></label></p>';
	}
);

add_action(
	'woocommerce_checkout_create_order',
	function ( $order ) {
		$a = kooni_wc_ajustes();
		if ( 'yes' !== $a['optin'] ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- WooCommerce ya verificó el checkout.
		$acepta = ! empty( $_POST['kooni_whatsapp_optin'] );
		$order->update_meta_data( '_kooni_whatsapp_optin', $acepta ? 'yes' : 'no' );
	}
);

/* -------------------------------------------------------------------------
 * Eventos del pedido → cola (Action Scheduler): nunca frena el checkout.
 * ---------------------------------------------------------------------- */
function kooni_wc_encolar( $order_id, $evento, $estado = '', $anterior = '', $intento = 1, $retraso = 0 ) {
	if ( ! kooni_wc_configurado() || ! function_exists( 'as_enqueue_async_action' ) ) {
		return;
	}
	$args = array(
		'order_id' => (int) $order_id,
		'evento'   => $evento,
		'estado'   => $estado,
		'anterior' => $anterior,
		'intento'  => (int) $intento,
	);
	if ( $retraso > 0 ) {
		as_schedule_single_action( time() + $retraso, 'kooni_wc_enviar', array( $args ), KOONI_WC_GROUP );
	} else {
		as_enqueue_async_action( 'kooni_wc_enviar', array( $args ), KOONI_WC_GROUP );
	}
}

add_action(
	'woocommerce_new_order',
	function ( $order_id ) {
		$a = kooni_wc_ajustes();
		if ( 'yes' === $a['enviar_nuevo'] ) {
			kooni_wc_encolar( $order_id, 'created' );
		}
	},
	20
);

add_action(
	'woocommerce_order_status_changed',
	function ( $order_id, $from, $to ) {
		kooni_wc_encolar( $order_id, 'status_changed', $to, $from );
	},
	20,
	3
);

/** Teléfono en formato internacional (solo dígitos, con prefijo de país). */
function kooni_wc_telefono( $order ) {
	$tel = (string) $order->get_billing_phone();
	if ( '' === trim( $tel ) && method_exists( $order, 'get_shipping_phone' ) ) {
		$tel = (string) $order->get_shipping_phone();
	}
	$tel = trim( $tel );
	if ( '' === $tel ) {
		return '';
	}
	$internacional = ( 0 === strpos( $tel, '+' ) || 0 === strpos( $tel, '00' ) );
	$digitos       = preg_replace( '/\D+/', '', $tel );
	if ( 0 === strpos( $tel, '00' ) ) {
		$digitos = substr( $digitos, 2 );
	}
	if ( $internacional ) {
		return $digitos;
	}
	$pais   = $order->get_billing_country();
	$prefijo = '';
	if ( $pais && function_exists( 'WC' ) && WC()->countries && method_exists( WC()->countries, 'get_country_calling_code' ) ) {
		$prefijo = preg_replace( '/\D+/', '', (string) WC()->countries->get_country_calling_code( $pais ) );
	}
	$digitos = ltrim( $digitos, '0' );
	if ( '' === $prefijo || 0 === strpos( $digitos, $prefijo ) && strlen( $digitos ) > 10 ) {
		return $digitos;
	}
	return $prefijo . $digitos;
}

/** Número y enlace de seguimiento (Advanced Shipment Tracking y filtros). */
function kooni_wc_seguimiento( $order ) {
	$numero = '';
	$enlace = '';
	$items  = $order->get_meta( '_wc_shipment_tracking_items' );
	if ( is_array( $items ) && ! empty( $items ) ) {
		$ultimo = end( $items );
		$numero = isset( $ultimo['tracking_number'] ) ? (string) $ultimo['tracking_number'] : '';
		if ( ! empty( $ultimo['custom_tracking_link'] ) ) {
			$enlace = (string) $ultimo['custom_tracking_link'];
		}
	}
	$seguimiento = apply_filters(
		'kooni_wc_tracking',
		array(
			'number' => $numero,
			'url'    => $enlace,
		),
		$order
	);
	return array(
		'number' => isset( $seguimiento['number'] ) ? (string) $seguimiento['number'] : '',
		'url'    => isset( $seguimiento['url'] ) ? (string) $seguimiento['url'] : '',
	);
}

function kooni_wc_payload( $order, $evento, $estado, $anterior ) {
	$items = array();
	foreach ( $order->get_items() as $item ) {
		$items[] = array(
			'name'     => $item->get_name(),
			'quantity' => (int) $item->get_quantity(),
			'total'    => (string) $item->get_total(),
		);
	}
	$optin   = $order->get_meta( '_kooni_whatsapp_optin' );
	$creado  = $order->get_date_created();
	$payload = array(
		'event' => $evento,
		'store' => array(
			'url'  => home_url(),
			'name' => get_bloginfo( 'name' ),
		),
		'order' => array(
			'id'              => (string) $order->get_id(),
			'number'          => (string) $order->get_order_number(),
			'status'          => $estado ? $estado : $order->get_status(),
			'previous_status' => $anterior ? $anterior : null,
			'total'           => (string) $order->get_total(),
			'currency'        => $order->get_currency(),
			'created_at'      => $creado ? $creado->date( 'c' ) : null,
			'customer'        => array(
				'first_name' => $order->get_billing_first_name(),
				'last_name'  => $order->get_billing_last_name(),
				'phone'      => kooni_wc_telefono( $order ),
				'email'      => $order->get_billing_email(),
				'country'    => $order->get_billing_country(),
			),
			'items'           => $items,
			'payment_url'     => $order->needs_payment() ? $order->get_checkout_payment_url() : null,
			'tracking'        => kooni_wc_seguimiento( $order ),
			'whatsapp_optin'  => '' === $optin ? null : ( 'yes' === $optin ),
		),
	);
	return apply_filters( 'kooni_wc_payload', $payload, $order, $evento );
}

/** Envía un pedido a Kooni. Reintenta con espera creciente si Kooni no responde. */
add_action(
	'kooni_wc_enviar',
	function ( $args ) {
		$order = wc_get_order( isset( $args['order_id'] ) ? (int) $args['order_id'] : 0 );
		if ( ! $order || 'shop_order_refund' === $order->get_type() ) {
			return;
		}
		$evento  = isset( $args['evento'] ) ? $args['evento'] : 'status_changed';
		$estado  = isset( $args['estado'] ) ? $args['estado'] : '';
		$anterior = isset( $args['anterior'] ) ? $args['anterior'] : '';
		$intento = isset( $args['intento'] ) ? (int) $args['intento'] : 1;

		$res = wp_remote_post(
			kooni_wc_url( '/api/v1/woocommerce/orders' ),
			array(
				'headers' => kooni_wc_cabeceras(),
				'timeout' => 20,
				'body'    => wp_json_encode( kooni_wc_payload( $order, $evento, $estado, $anterior ) ),
			)
		);

		$codigo    = is_wp_error( $res ) ? 0 : (int) wp_remote_retrieve_response_code( $res );
		$reintenta = 0 === $codigo || 429 === $codigo || $codigo >= 500;
		if ( $codigo >= 200 && $codigo < 300 ) {
			kooni_wc_log( sprintf( 'Pedido #%s (%s) enviado a Kooni.', $order->get_order_number(), $evento ) );
			return;
		}
		$detalle = is_wp_error( $res ) ? $res->get_error_message() : wp_remote_retrieve_body( $res );
		if ( $reintenta && $intento < KOONI_WC_MAX_INTENTOS ) {
			$espera = (int) min( 3600, 60 * pow( 2, $intento - 1 ) );
			kooni_wc_log( sprintf( 'Pedido #%s: Kooni no respondió (%d). Reintento %d en %d s.', $order->get_order_number(), $codigo, $intento + 1, $espera ), 'warning' );
			kooni_wc_encolar( $order->get_id(), $evento, $estado, $anterior, $intento + 1, $espera );
			return;
		}
		kooni_wc_log( sprintf( 'Pedido #%s no se pudo enviar a Kooni (%d): %s', $order->get_order_number(), $codigo, substr( (string) $detalle, 0, 300 ) ), 'error' );
	}
);
