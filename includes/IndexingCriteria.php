<?php
/**
 * Indexing Criteria Class
 *
 * This class defines the criteria for indexing posts in the InstantSearch for WP plugin.
 * It includes methods to determine if a post should be indexed based on its status,
 * type, and other attributes.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP;

/**
 * The IndexingCriteria class provides methods to determine if a post should be indexed.
 */
class IndexingCriteria {

	/**
	 * Constructor to initialize the indexing criteria.
	 *
	 * @return void
	 */
	public function __construct() {
		add_filter( 'instantsearch_should_index_post', array( $this, 'indexing_post_type' ), 20, 3 );
		add_filter( 'instantsearch_should_index_post', array( $this, 'indexing_post_status' ), 20, 3 );
		add_filter( 'instantsearch_should_index_post', array( $this, 'indexing_post_password' ), 20, 3 );
		add_filter( 'instantsearch_should_index_post', array( $this, 'omitted_from_index' ), 20, 3 );
	}

	/**
	 * Determine if a post should be indexed based on its type and status.
	 *
	 * @param bool|null $should_index Whether the post should be indexed. Null means undecided.
	 * @param int       $post_id      The ID of the post to check.
	 * @param \WP_Post  $post         The post object.
	 *
	 * @return bool|null True if the post should be indexed, false if it should not, null if undecided.
	 */
	public function indexing_post_type( $should_index, $post_id, $post ) {
		if ( null !== $should_index ) {
			return $should_index;
		}

		$indexes = Settings::get_settings( 'indexes' );
		if ( ! empty( $indexes ) ) {
			$index = $indexes[0];
			if ( isset( $index['post_types'] ) && is_array( $index['post_types'] ) ) {
				if ( in_array( $post->post_type, $index['post_types'], true ) ) {
					return $should_index;
				} else {
					return false;
				}
			}
		}

		$public_post_types = get_post_types( array( 'public' => true ) );

		$indexable_post_types = apply_filters( 'instantsearch_indexable_post_types', $public_post_types );

		if ( in_array( $post->post_type, $indexable_post_types, true ) ) {
			// Not an indexable post type.
			return $should_index;
		}

		return false;
	}

	/**
	 * Determine if a post should be indexed based on its status.
	 *
	 * @param bool|null $should_index Whether the post should be indexed. Null means undecided.
	 * @param int       $post_id      The ID of the post to check.
	 * @param \WP_Post  $post         The post object.
	 *
	 * @return bool|null True if the post should be indexed, false if it should not, null if undecided.
	 */
	public function indexing_post_status( $should_index, $post_id, $post ) {
		if ( null !== $should_index ) {
			return $should_index;
		}

		$indexable_statuses = apply_filters( 'instantsearch_indexable_post_statuses', array( 'publish' ) );

		if ( in_array( $post->post_status, $indexable_statuses, true ) ) {
			// Not an indexable post status.
			return $should_index;
		}

		return false;
	}

	/**
	 * Determine if a post should be indexed based on whether it is password protected.
	 *
	 * @param bool|null $should_index Whether the post should not be indexed. Null means undecided.
	 * @param int       $post_id      The ID of the post to check.
	 * @param \WP_Post  $post         The post object.
	 *
	 * @return bool|null True if the post should be indexed, false if it should not, null if undecided.
	 */
	public function indexing_post_password( $should_index, $post_id, $post ) {
		if ( null !== $should_index ) {
			return $should_index;
		}

		if ( post_password_required( $post ) ) {
			// Password protected posts should not be indexed.
			return false;
		}

		return $should_index;
	}

	/**
	 * Determine if a post should be indexed based on a custom field indicating omission from index.
	 *
	 * @param bool|null $should_index Whether the post should not be indexed. Null means undecided.
	 * @param int       $post_id      The ID of the post to check.
	 * @param \WP_Post  $post         The post object.
	 *
	 * @return bool|null True if the post should be indexed, false if it should not, null if undecided.
	 */
	public function omitted_from_index( $should_index, $post_id, $post ) {
		if ( null !== $should_index ) {
			return $should_index;
		}

		$omitted = get_post_meta( $post_id, '_instantsearch_omit_from_index', true );
		if ( $omitted ) {
			// Posts marked with the custom field should not be indexed.
			return false;
		}

		return $should_index;
	}
}
