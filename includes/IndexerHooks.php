<?php
/**
 * IndexerHooks Class
 *
 * This class is responsible for managing the indexing of posts.
 * It integrates into WordPress hooks to handle indexing operations.
 * - Posts are indexed on the `shutdown` action to ensure all changes are captured.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP;

/**
 * IndexerHooks class to manage post indexing.
 */
class IndexerHooks {
	/**
	 * The connector instance used for indexing operations.
	 *
	 * @var AbstractConnector
	 */
	protected $connector;

	/**
	 * The hook name used to collect post IDs for indexing.
	 *
	 * @var string
	 */
	public static $index_post_ids_hook = 'instantsearch_posts_to_index';

	/**
	 * The hook name used to collect post IDs for deletion.
	 *
	 * @var string
	 */
	public static $delete_post_ids_hook = 'instantsearch_posts_to_delete';

	/**
	 * Constructor to initialize the Indexer with a specific connector.
	 *
	 * @return void
	 */
	public function __construct() {

		add_action( 'save_post', array( $this, 'index_post' ), 10, 3 );
		add_action( 'delete_post', array( $this, 'delete_post' ) );
		add_action( 'shutdown', array( $this, 'index_or_delete_posts' ) );
	}

	/**
	 * Index a single post when it is saved.
	 *
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post    Post object.
	 * @param bool     $update  Whether this is an existing post being updated or not.
	 *
	 * @return void
	 */
	public function index_post( $post_id, $post, $update ) {
		$should_index = apply_filters( 'instantsearch_should_index_post', null, $post_id, $post, $update );

		if ( null !== $should_index && ! $should_index ) {
			add_filter(
				self::$delete_post_ids_hook,
				function ( $post_ids ) use ( $post_id ) {
					$post_ids[] = $post_id;
					return array_values( array_unique( $post_ids ) );
				}
			);
			return;
		}

		add_filter(
			self::$index_post_ids_hook,
			function ( $post_ids ) use ( $post_id ) {
				$post_ids[] = $post_id;
				return array_values( array_unique( $post_ids ) );
			}
		);
	}

	/**
	 * Index all posts that have been marked for indexing.
	 *
	 * @return void
	 */
	public function index_or_delete_posts() {
		$post_ids = apply_filters( self::$index_post_ids_hook, array() );
		if ( ! empty( $post_ids ) ) {
			do_action( 'instantsearch_index_posts', $post_ids );
		}

		$delete_post_ids = apply_filters( self::$delete_post_ids_hook, array() );
		if ( ! empty( $delete_post_ids ) ) {
			do_action( 'instantsearch_delete_posts', $delete_post_ids );
		}
	}

	/**
	 * Delete a single post from the index when it is deleted.
	 *
	 * @param int $post_id Post ID.
	 */
	public function delete_post( $post_id ) {
		do_action( 'instantsearch_delete_post', $post_id );
	}
}
