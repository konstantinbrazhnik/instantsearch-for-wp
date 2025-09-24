<?php
/**
 * Abstract Connector Class
 *
 * This class serves as a base for creating connectors to various external services.
 * It provides common functionality and enforces the implementation of essential methods.
 *
 * Methods to be implemented by subclasses:
 * - index_posts(): Provided an array of post IDs, index them in the external service.
 * - index_all_posts(): Index all posts in the external service.
 * - format_post(): Format a single post for indexing.
 * - delete_posts(): Provided an array of post IDs, delete them from the external service.
 * - search_posts(): Search for posts in the external service.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP\Connectors;

/**
 * The AbstractConnector class provides a blueprint for creating connectors to external services.
 */
abstract class AbstractConnector {

	/**
	 * Constructor to initialize the connector.
	 *
	 * @return void
	 */
	public function __construct() {
		// Initialization code can go here if needed.
		add_action( 'instantsearch_index_posts', array( $this, 'index_posts' ) );
		add_action( 'instantsearch_delete_post', array( $this, 'delete_posts' ) );
	}

	/**
	 * Get the name of the index to be used in the external service.
	 *
	 * @return string The name of the index.
	 */
	public function index_name() {
		return apply_filters(
			'instantsearch_index_name',
			sanitize_title( get_bloginfo( 'url' ) . '-search' )
		);
	}

	/**
	 * Index the given posts in the external service.
	 *
	 * @param array $post_ids Array of post IDs to index.
	 * @return void
	 */
	abstract public function index_posts( array $post_ids );

	/**
	 * Format a single post for indexing.
	 *
	 * @param int $post_id The ID of the post to format.
	 * @return array Formatted post data.
	 */
	abstract public function format_post( $post_id );

	/**
	 * Delete the given posts from the external service.
	 *
	 * @param array $post_ids Array of post IDs to delete.
	 * @return void
	 */
	abstract public function delete_posts( array $post_ids );

	/**
	 * Search for posts in the external service.
	 *
	 * @param string $query The search query.
	 * @param array  $args  Additional search arguments.
	 * @return array Search results.
	 */
	abstract public function search_posts( $query, array $args = array() );
}
