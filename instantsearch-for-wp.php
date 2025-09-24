<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName
/**
 * Plugin Name:       InstantSearch for WP
 * Plugin URI:        https://www.yokoco.com
 * Description:       A provider agnostic implementation of InstantSearch.js for WordPress.
 * Author:            Yoko Co <developer@yokoco.com>
 * Author URI:        https://www.yokoco.com
 * Text Domain:       instantsearch-for-wp
 * Domain Path:       /languages
 * Version:           1.0.0
 * GitHub Plugin URI: https://github.com/Yoko-Co/instantsearch-for-wp
 * Release Asset:     true
 * Primary Branch:    main
 *
 * @package         YokoCo
 */

namespace InstantSearchForWP;

define( 'INSTANTSEARCH_FOR_WP_PATH', __DIR__ );
define( 'INSTANTSEARCH_FOR_WP_FILE', __FILE__ );
define( 'INSTANTSEARCH_FOR_WP_VERSION', '1.0.0' );
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
			'instantsearch-for-wp',
			false,
			basename( __DIR__ ) . '/languages'
		);

		$activated_plugin_setting = 'instantsearch_for_wp_version';
		$activated_plugin_version = get_option( $activated_plugin_setting, '1.0.0' );
		if ( version_compare( $activated_plugin_version, INSTANTSEARCH_FOR_WP_VERSION, '<' ) ) {
			update_option( $activated_plugin_setting, INSTANTSEARCH_FOR_WP_VERSION );
			do_action( 'instantsearch_for_wp_plugin_updated', $activated_plugin_version, INSTANTSEARCH_FOR_WP_VERSION );
		}

		new Initializer();

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
