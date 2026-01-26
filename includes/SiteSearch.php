<?php

namespace InstantSearchForWP;

class SiteSearch {

	/**
	 * Constructor to set up hooks for site search functionality.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		// Add the root DOM <div> for InstantSearch.js.
		add_action( 'wp_footer', array( $this, 'add_instantsearch_root_div' ) );

		// Enqueue frontend scripts and styles.
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
	}

	/**
	 * Add the root DOM <div> for InstantSearch.js
	 *
	 * @return void
	 */
	public function add_instantsearch_root_div() {
		$settings       = Settings::get_settings();
		$search_classes = array();

		if ( isset( $settings['sitesearch_settings']['sidebar_position'] ) && 'right' === $settings['sitesearch_settings']['sidebar_position'] ) {
			$search_classes[] = 'isfwp-sidebar-right';
		} else {
			$search_classes[] = 'isfwp-sidebar-left';
		}

		// Get the ID of the custom logo.
		$custom_logo_id = get_theme_mod( 'custom_logo' );

		// Get the image attributes (URL, width, height, etc.).
		// The 'full' size is used here, but you can specify other sizes like 'thumbnail', 'medium', or a custom size.
		$image = wp_get_attachment_image_src( $custom_logo_id , 'full' );

		// Check if an image was found and output the URL.
		if ( $image ) {
			$logo_url = $image[0];
		}
		?>
		<div id="isfwp-site-search" class="<?php echo esc_attr( implode( ' ', $search_classes ) ); ?>">
			<div class="isfwp-site-search-topbar">
				<div class="site-search-brand">
					<?php if ( isset( $logo_url ) ) : ?>
						<img src="<?php echo esc_url( $logo_url ); ?>" alt="<?php bloginfo( 'name' ); ?>" />
					<?php else : ?>
						<?php bloginfo( 'name' ); ?>
					<?php endif; ?>
				</div>
				<a class="isfwp-site-search-close">&times;</a>
			</div>
			<div class="isfwp-site-search-header">
				<div class="isfwp-site-search-container">
					<div id="isfwp-site-search-input"></div>
				</div>
			</div>
			<div class="isfwp-site-search-main">
				<div class="isfwp-site-search-container isfwp-site-search-stats-container">
					<div id="isfwp-site-search-clear-refinements"></div>
					<div id="isfwp-site-search-stats"></div>
				</div>
				<div class="isfwp-site-search-container">
					<div id="isfwp-site-search-sidebar"></div>
					<div id="isfwp-site-search-hits"></div>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Get InstantSearch configuration for frontend.
	 *
	 * @return array Configuration array for InstantSearch.js
	 */
	public function get_instantsearch_config() {
		$settings = Settings::get_settings();

		// Get all public taxonomies for slug => title dictionary.
		$taxonomies      = get_taxonomies( array( 'public' => true ), 'objects' );
		$taxonomy_titles = array();
		foreach ( $taxonomies as $slug => $taxonomy ) {
			$taxonomy_titles[ 'taxonomy.' . $slug ] = $taxonomy->label;
		}

		return apply_filters(
			'instantsearch_for_wp_instantsearch_config',
			array(
				'appId'                       => $settings['algolia']['app_id'] ?? '',
				'apiKey'                      => $settings['algolia']['search_only_api_key'] ?? '',
				'indexName'                   => Settings::get_index_name( $settings['use_as_sitesearch'] ),
				'facetTitles'                 => array_merge(
					array(
						'post_type' => __( 'Post Type', 'instantsearch-for-wp' ),
					),
					$taxonomy_titles
				),
				'searchTriggerQuerySelectors' => '.menu-item .fl-search-form .fl-button-wrap > a,.swp-input--search',
				'sitesearchSettings'          => $settings['sitesearch_settings'] ?? array(),
			)
		);
	}

	/**
	 * Enqueue frontend scripts and styles for InstantSearch.js.
	 * 
	 * @return void
	 */
	public function enqueue_scripts() {
		$instantsearch_script_path = INSTANTSEARCH_FOR_WP_PATH . '/build/instantsearch.js';
		if ( ! file_exists( $instantsearch_script_path ) ) {
			return;
		}

		$script_url = INSTANTSEARCH_FOR_WP_URL . 'build/instantsearch.js';
		$style_url  = INSTANTSEARCH_FOR_WP_URL . 'build/instantsearch.css';

		$asset_file = INSTANTSEARCH_FOR_WP_PATH . '/build/instantsearch.asset.php';
		if ( file_exists( $asset_file ) ) {
			$assets = require $asset_file;
		}

		wp_enqueue_script(
			'instantsearch-for-wp-frontend',
			$script_url,
			isset( $assets['dependencies'] ) ? $assets['dependencies'] : array( 'wp-element' ),
			isset( $assets['version'] ) ? $assets['version'] : INSTANTSEARCH_FOR_WP_VERSION,
			true
		);

		// Check if the built frontend CSS exists.
		$instantsearch_style_path = INSTANTSEARCH_FOR_WP_PATH . '/build/instantsearch.css';
		if ( file_exists( $instantsearch_style_path ) ) {
			wp_enqueue_style(
				'instantsearch-for-wp-frontend',
				$style_url,
				array_filter(
					isset( $assets['dependencies'] ) ? $assets['dependencies'] : array( 'wp-components' ),
					function ( $style ) {
						return wp_style_is( $style, 'registered' );
					}
				),
				isset( $assets['version'] ) ? $assets['version'] : INSTANTSEARCH_FOR_WP_VERSION
			);
		}

		// Localize script with configuration data.
		$settings = Settings::get_settings();
		wp_localize_script(
			'instantsearch-for-wp-frontend',
			'instantSearchForWPFrontend',
			$this->get_instantsearch_config()
		);
	}
}
