<?php
/**
 * Al borrar el plugin: se van sus ajustes y su cola. Los pedidos no se tocan.
 */
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}
delete_option( 'kooni_wc_settings' );
if ( function_exists( 'as_unschedule_all_actions' ) ) {
	as_unschedule_all_actions( 'kooni_wc_enviar', array(), 'kooni' );
}
