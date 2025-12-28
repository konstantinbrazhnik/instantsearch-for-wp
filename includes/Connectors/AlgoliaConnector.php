<?php
/**
 * Algolia Connector Class
 *
 * This class implements the AbstractConnector to provide integration with the Algolia search service.
 * It includes methods for indexing, formatting, deleting, and searching posts using Algolia's API
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP\Connectors;

use InstantSearchForWP\Connectors\;
use Algolia\AlgoliaSearch\Api\SearchClient;

/**
 * The AlgoliaConnector class provides methods to interact with the Algolia search service.
 */
class Connector extends AbstractConnector {

	/**
	 * The Algolia client instance.
	 *
	 * @var \Algolia\AlgoliaSearch\Api\SearchClient
	 */
	protected $client;

	/**
	 * The Algolia index instance.
	 *
	 * @var \Algolia\AlgoliaSearch\Api\SearchIndex
	 */
	protected $index;

	/**
	 * Constructor to initialize the Algolia client and index.
	 *
	 * @param string $index_name The name of the Algolia index to use.
	 */
	public function __construct() {
		parent::__construct();

		[ $app_id, $api_key ] = $this->get_credentials();

		$this->client = SearchClient::create( $app_id, $api_key );
		$this->index  = $this->client->initIndex( $this->index_name() );
	}

	/**
	 * Retrieve Algolia credentials from settings or environment.
	 *
	 * @return array An array containing the application ID and API key.
	 */
	protected function get_credentials() {
		// Replace with actual retrieval logic, e.g., from WordPress options or environment variables.
		$app_id  = defined( 'ALGOLIA_APP_ID' ) ? ALGOLIA_APP_ID : '';
		$api_key = defined( 'ALGOLIA_API_KEY' ) ? ALGOLIA_API_KEY : '';
		return array( $app_id, $api_key );
	}

	/**
	 * Index the given posts in the Algolia service.
	 *
	 * @param array $post_ids Array of post IDs to index.
	 * @return void
	 */
	public function index_posts( array $post_ids ) {
		$records = array();

		// Delete all records with postIDs in $post_ids before re-indexing.
		$this->delete_posts( $post_ids );

		foreach ( $post_ids as $post_id ) {
			$record = $this->format_post( $post_id );
			if ( $record ) {
				$records[] = $record;
			}
		}

		if ( ! empty( $records ) ) {
			$this->index->saveObjects( $records, array( 'autoGenerateObjectIDIfNotExist' => true ) );
		}
	}

	/**
	 * Format a single post for indexing in Algolia.
	 *
	 * @param int $post_id The ID of the post to format.
	 * @return array|null Formatted post data or null if post not found.
	 */
	public function format_post( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return null;
		}

		return array(
			'postID'  => $post->ID,
			'title'   => $post->post_title,
			'content' => $post->post_content,
			'author'  => $post->post_author,
			'date'    => $post->post_date,
		);
	}

	/**
	 * Delete the given posts from the Algolia service.
	 *
	 * Use a search based delete in order to delete by postID.
	 *
	 * @param array $post_ids Array of post IDs to delete.
	 * @return void
	 */
	public function delete_posts( array $post_ids ) {
		// Use Browse API to find all redords with postID in $post_ids and delete them.
		$filters = implode(
			' OR ',
			array_map(
				function ( $id ) {
					return 'postID:' . $id;
				},
				$post_ids
			)
		);

		// Browse to get all objectIDs matching the filters.
		$object_ids = array();
		$iterator   = $this->index->browseObjects(
			array(
				'attributesToRetrieve' => array( 'objectID' ),
				'filters' => $filters
			)
		);
		foreach ( $iterator as $hit ) {
			if ( isset( $hit['objectID'] ) ) {
				$object_ids[] = $hit['objectID'];
			}
		}

		// Delete the objects by their objectIDs.
		if ( ! empty( $object_ids ) ) {
			$this->index->deleteObjects( $object_ids );
		}
	}

	/**
	 * Search for posts in the Algolia service.
	 *
	 * @param string $query The search query.
	 * @param array  $args  Additional search arguments.
	 * @return array Search results.
	 */
	public function search_posts( $query, array $args = array() ) {
		$results = $this->index->search( $query, $args );
		return $results['hits'];
	}
}
