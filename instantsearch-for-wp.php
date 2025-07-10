<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName
/**
 * Plugin Name:       InstantSearch for WP
 * Plugin URI:        https://www.yokoco.com
 * Description:       The core plugin for Yoko Co WordPress sites.
 * Author:            Yoko Co <developer@yokoco.com>
 * Author URI:        https://www.yokoco.com
 * Text Domain:       yoko-core
 * Domain Path:       /languages
 * Version:           1.13.0
 * GitHub Plugin URI: https://github.com/Yoko-Co/yoko-core
 * Release Asset:     true
 * Primary Branch:    main
 *
 * @package         YokoCo
 */

namespace YokoCo;

define( 'INSTANTSEARCH_FOR_WP_PATH', __DIR__ );
define( 'INSTANTSEARCH_FOR_WP_FILE', __FILE__ );
define( 'INSTANTSEARCH_FOR_WP_VERSION', '1.13.0' );
define( 'INSTANTSEARCH_FOR_WP_URL', plugin_dir_url( __FILE__ ) );

if ( is_dir( plugin_dir_path( __FILE__ ) . '/lib' ) ) {
	require_once __DIR__ . '/lib/woocommerce/action-scheduler/action-scheduler.php';
	require_once plugin_dir_path( __FILE__ ) . '/lib/autoload.php';
}

/**
 * InstantSearch for WP Class
 *
 * @since 1.0.0
 */
class InstantSearchForWP {

	/**
	 * Holds the class instance.
	 *
	 * @var InstantSearchForWP $instance
	 */
	private static $instance = null;

	/**
	 * Return an instance of the class
	 *
	 * Return an instance of the InstantSearchForWP Class.
	 *
	 * @since 1.0.0
	 *
	 * @return InstantSearchForWP class instance.
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Class initializer.
	 */
	public function plugins_loaded() {
		add_action( 'init', array( $this, 'init' ) );
	}

	/**
	 * Init all the things.
	 */
	public function init() {
		load_plugin_textdomain(
			'yoko',
			false,
			basename( __DIR__ ) . '/languages'
		);

		$activated_plugin_setting = 'instantsearch_for_wp_version';
		$activated_plugin_version = get_option( $activated_plugin_setting, '1.0.0' );
		if ( version_compare( $activated_plugin_version, INSTANTSEARCH_FOR_WP_VERSION, '<' ) ) {
			update_option( $activated_plugin_setting, INSTANTSEARCH_FOR_WP_VERSION );
			do_action( 'instantsearch_for_wp_plugin_updated', $activated_plugin_version, INSTANTSEARCH_FOR_WP_VERSION );
		}

		// Run plugin init code here.
		do_action( 'instantsearch_for_wp_plugin_init' );
	}
}

add_action(
	'plugins_loaded',
	function () {
		$instantsearch_for_wp = InstantSearchForWP::get_instance();
		$instantsearch_for_wp->plugins_loaded();
	}
);

$GLOBALS['instantsearch_for_wp'] = new InstantSearchForWP();

/**
 * Initialize the plugin tracker
 *
 * @return void
 */
function appsero_init_tracker_yoko_core() {

	global $appsero_client;

	if ( ! class_exists( '\Appsero\Client' ) ) {
		return;
	}

	// $appsero_client = new \Appsero\Client( '99cee498-ca8e-42b8-a2b4-5c2d837b1c3e', 'InstantSearch for WP', __FILE__ );

	// Activate Appsero Insights Client.
	$appsero_client->insights()
					->add_plugin_data()
					->hide_notice()
					->init();

	// If Appsero is active, track the activation.
	$appsero_option = 'appsero_opt_in';
	if ( isset( $appsero_client ) && ! get_option( $appsero_option ) ) {
		try {
			$appsero_client->insights()->optin();
			update_option( $appsero_option, 1, true );
		} catch ( \Throwable $th ) {
			error_log( 'Appsero optin failed: ' . $th->getMessage() );
		}
	}
}
appsero_init_tracker_yoko_core();
