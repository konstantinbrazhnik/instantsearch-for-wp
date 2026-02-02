<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName
/**
 * Rest API Class
 *
 * This class handles the REST API endpoints for the InstantSearch for WP plugin.
 *
 * Endpoints:
 * - /instantsearch/v1/available-indexing-parameters : Fetches available post types, taxonomies, and custom fields for indexing.
 * - /instantsearch/v1/run-indexer : Triggers the indexing process with specified parameters.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP;

/**
 * Class RestAPI
 *
 * Handles REST API routes and callbacks.
 */
class RestAPI {

	/**
	 * Constructor to register REST API routes.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register REST API routes.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {

		/** Register route to get InstantSearch for WP Settings */
		register_rest_route(
			'instantsearch-for-wp/v1',
			'/settings',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_settings' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		/** Register route to get available indexing parameters */
		register_rest_route(
			'instantsearch-for-wp/v1',
			'/available-indexing-parameters',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_available_indexing_parameters' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		/** Register route to run indexer. */
		register_rest_route(
			'wp/v2',
			'/' . Index::$cpt_slug . '/(?P<index_id>\d+)/run-indexer',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'run_indexer' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
				'args'                => array(
					'batch_size' => array(
						'required' => false,
						'type'     => 'integer',
						'default'  => 100,
					),
					'offset' => array(
						'required' => false,
						'type'     => 'integer',
						'default'  => 0,
					),
				),
			)
		);
	}

	/**
	 * Get InstantSearch for WP settings.
	 *
	 * @since 1.0.0
	 *
	 * @return \WP_REST_Response The plugin settings.
	 */
	public function get_settings() {
		$settings = get_option( 'instantsearch_for_wp_settings', Settings::get_default_settings() );
		return rest_ensure_response( $settings );
	}

	/**
	 * Get available indexing parameters.
	 *
	 * @since 1.0.0
	 *
	 * @return \WP_REST_Response List of available indexing parameters.
	 */
	public function get_available_indexing_parameters() {
		$post_types    = $this->get_available_post_types();
		$taxonomies    = $this->get_available_taxonomies();
		$custom_fields = $this->get_available_custom_fields();

		return rest_ensure_response(
			array(
				'post_types'    => $post_types,
				'taxonomies'    => $taxonomies,
				'custom_fields' => $custom_fields,
			)
		);
	}

	/**
	 * Get available post types for indexing.
	 *
	 * @since 1.0.0
	 *
	 * @return array List of available post types.
	 */
	public function get_available_post_types() {
		$post_types = get_post_types(
			array(
				'public' => true,
			),
			'objects'
		);

		$excluded_post_types = Settings::get_ignored_post_types();

		// Format post types as associative array.
		$formatted_post_types = array();
		foreach ( $post_types as $post_type ) {
			if ( in_array( $post_type->name, $excluded_post_types, true ) ) {
				continue;
			}
			$formatted_post_types[ $post_type->name ] = $post_type->label;
		}

		// Filter out any post types that should not be indexed.
		$formatted_post_types = apply_filters( 'instantsearch_for_wp_available_post_types', $formatted_post_types );

		return $formatted_post_types;
	}

	/**
	 * Get available taxonomies for indexing.
	 *
	 * @since 1.0.0
	 *
	 * @return array List of available taxonomies.
	 */
	public function get_available_taxonomies() {
		$taxonomies = get_taxonomies(
			array(
				'public' => true,
			),
			'objects'
		);

		$formatted_taxonomies = array();
		foreach ( $taxonomies as $taxonomy ) {
			$formatted_taxonomies[ $taxonomy->name ] = $taxonomy->label;
		}

		$formatted_taxonomies = apply_filters( 'instantsearch_for_wp_available_taxonomies', $formatted_taxonomies );

		return $formatted_taxonomies;
	}

	/**
	 * Get available custom fields for indexing.
	 *
	 * @since 1.0.0
	 *
	 * @return array List of available custom fields.
	 */
	public function get_available_custom_fields() {

		// Get distinct meta keys from the database.
		global $wpdb;
		$meta_keys = $wpdb->get_col( "SELECT DISTINCT meta_key FROM {$wpdb->postmeta} WHERE meta_key NOT LIKE '\_%'" );

		$custom_fields = apply_filters( 'instantsearch_for_wp_available_custom_fields', $meta_keys );

		return $custom_fields;
	}

	/**
	 * Run the indexer for a specific index.
	 *
	 * @since 1.0.0
	 *
	 * @param \WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response The indexing result.
	 */
	public function run_indexer( $request ) {
		$index_id   = $request->get_param( 'index_id' );
		$batch_size = $request->get_param( 'batch_size' );
		$offset     = $request->get_param( 'offset' );
		$indexer    = Indexer::get_instance();

		$index = new Index( $index_id );
		if ( ! $index->index_post ) {
			return rest_ensure_response(
				array(
					'error' => __( 'Invalid index ID.', 'instantsearch-for-wp' ),
				)
			);
		}

		if ( $offset === 0 ) {
			// Clear the index before starting indexing.
			$indexer->provider->clear_index( $index->name );
		}

		$post_query = $index->get_posts_query( $batch_size, $offset );
		$post_ids   = $post_query->posts;

		try {
			$response = $indexer->index_or_delete_posts( $post_ids, array(), $index );

			return rest_ensure_response(
				array(
					'indexed_post_ids' => $post_ids,
					'total_posts'      => (int) $post_query->found_posts,
					'complete_percent' => ( ( $offset + count( $post_ids ) ) / (int) $post_query->found_posts ) * 100,
					'response'         => $response,
				)
			);
		} catch ( \Throwable $th ) {
			return rest_ensure_response(
				array(
					'error' => $th->getMessage(),
				)
			);
		}
	}
}
