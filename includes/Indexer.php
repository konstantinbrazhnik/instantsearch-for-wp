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
class Indexer {

	/**
	 * Available search providers.
	 *
	 * @var array
	 */
	private static array $providers = array(
		'algolia' => Connectors\AlgoliaConnector::class,
		// Future providers can be added here.
	);

	/**
	 * The connector instance used for indexing operations.
	 *
	 * @var Connectors\AbstractConnector|null
	 */
	public $provider;

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
	 * Singleton instance of the Indexer.
	 *
	 * @var Indexer|null
	 */
	public static $instance = null;

	/**
	 * Constructor to initialize the Indexer with a specific connector.
	 *
	 * @return void
	 */
	public function __construct() {
		add_action( 'save_post', array( $this, 'index_post' ), 10, 3 );
		add_action( 'delete_post', array( $this, 'delete_post' ) );
		add_action( 'shutdown', array( $this, 'index_or_delete_posts' ) );

		$this->provider = $this->get_provider();
	}


	/**
	 * Get the search provider based on settings or environment.
	 *
	 * @return Connectors\AbstractConnector|null The connector instance or null if not found.
	 */
	public function get_provider() {
		if ( defined( 'INSTANTSEARCH_FOR_WP_PROVIDER' ) && array_key_exists( INSTANTSEARCH_FOR_WP_PROVIDER, self::$providers ) ) {
			$provider_class = self::$providers[ INSTANTSEARCH_FOR_WP_PROVIDER ];
			return new $provider_class();
		}

		$provider = Settings::get_settings( 'provider' );
		if ( $provider && is_string( $provider ) && array_key_exists( $provider, self::$providers ) ) {
			$provider_class = self::$providers[ $provider ];
			return new $provider_class();
		}

		return null;
	}

	/**
	 * Get the singleton instance of the Indexer.
	 *
	 * @return Indexer The singleton instance.
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
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
	 * @param array               $post_ids        Array of post IDs to index.
	 * @param array               $delete_post_ids Array of post IDs to delete.
	 * @param Index|\WP_Post|null $index           Index object.
	 *
	 * @return array Array containing responses for indexed and deleted posts.
	 */
	public function index_or_delete_posts( $post_ids = array(), $delete_post_ids = array(), $index = null ) {
		$post_ids = apply_filters( self::$index_post_ids_hook, $post_ids );
		if ( ! empty( $post_ids ) ) {
			$indexed_response = $this->provider->index_posts( $post_ids, $index );
		}

		$delete_post_ids = apply_filters( self::$delete_post_ids_hook, $delete_post_ids );
		if ( ! empty( $delete_post_ids ) ) {
			$deleted_response = $this->provider->delete_posts( $delete_post_ids, $index );
		}

		return array(
			'indexed' => $indexed_response ?? null,
			'deleted' => $deleted_response ?? null,
		);
	}

	/**
	 * Delete a single post from the index when it is deleted.
	 *
	 * @param int $post_id Post ID.
	 */
	public function delete_post( $post_id ) {
		do_action( 'instantsearch_delete_posts', array( $post_id ) );
	}
}
