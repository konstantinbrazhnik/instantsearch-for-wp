<?php
/**
 * Admin class for WordPress admin interface
 *
 * @package YokoCo
 */

namespace InstantSearchForWP;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Admin class for managing WordPress admin interface
 */
class Admin {

	/**
	 * Initialize the admin interface
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );
	}

	/**
	 * Add admin menu pages
	 *
	 * @since 1.0.0
	 */
	public function add_admin_menu() {
		add_menu_page(
			__( 'InstantSearch Settings', 'yoko-core' ),
			__( 'InstantSearch', 'yoko-core' ),
			'manage_options',
			'instantsearch-settings',
			array( $this, 'render_admin_page' ),
			'dashicons-search',
			30
		);
	}

	/**
	 * Render the main admin page
	 *
	 * @since 1.0.0
	 */
	public function render_admin_page() {
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'InstantSearch Settings', 'yoko-core' ); ?></h1>
			<div id="instantsearch-admin-app"></div>
		</div>
		<?php
	}

	/**
	 * Enqueue admin scripts and styles
	 *
	 * @since 1.0.0
	 * @param string $hook_suffix The current admin page hook suffix.
	 */
	public function enqueue_admin_scripts( $hook_suffix ) {
		// Only load on our admin page.
		if ( 'toplevel_page_instantsearch-settings' !== $hook_suffix ) {
			return;
		}

		// Check if the built admin script exists.
		$admin_script_path = INSTANTSEARCH_FOR_WP_PATH . '/build/admin.js';
		if ( ! file_exists( $admin_script_path ) ) {
			return;
		}

		$script_url = INSTANTSEARCH_FOR_WP_URL . 'build/admin.js';
		$style_url  = INSTANTSEARCH_FOR_WP_URL . 'build/admin.css';

		$asset_file = INSTANTSEARCH_FOR_WP_PATH . '/build/admin.asset.php';
		if ( file_exists( $asset_file ) ) {
			$asset = require $asset_file;
		}

		wp_enqueue_script(
			'instantsearch-admin',
			$script_url,
			$asset['dependencies'] ?? array( 'wp-element', 'wp-i18n', 'wp-components', 'wp-api-fetch' ),
			$asset['version'] ?? INSTANTSEARCH_FOR_WP_VERSION,
			true
		);

		// Check if the built admin CSS exists.
		$admin_style_path = INSTANTSEARCH_FOR_WP_PATH . '/build/admin.css';
		if ( file_exists( $admin_style_path ) ) {
			wp_enqueue_style(
				'instantsearch-admin',
				$style_url,
				array_filter(
					$asset['dependencies'] ?? array( 'wp-components' ),
					function ( $style ) {
						return wp_style_is( $style, 'registered' );
					}
				),
				$asset['version'] ?? INSTANTSEARCH_FOR_WP_VERSION
			);
		}

		// Localize script with configuration data.
		wp_localize_script(
			'instantsearch-admin',
			'instantsearchAdmin',
			array(
				'apiUrl'      => rest_url( 'instantsearch/v1/' ),
				'nonce'       => wp_create_nonce( 'wp_rest' ),
				'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
				'pluginUrl'   => INSTANTSEARCH_FOR_WP_URL,
				'indexPrefix' => Settings::get_index_name(),
			)
		);

		wp_set_script_translations( 'instantsearch-admin', 'yoko-core' );
	}
}

