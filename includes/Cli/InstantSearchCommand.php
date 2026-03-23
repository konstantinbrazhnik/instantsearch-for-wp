<?php
/**
 * WP-CLI command for InstantSearch.
 *
 * @package InstantSearchForWP
 */

namespace InstantSearchForWP\Cli;

use InstantSearchForWP\Index;
use InstantSearchForWP\Indexer;

/**
 * Core WP-CLI command for InstantSearch.
 */
class InstantSearchCommand {

	/**
	 * Registers the `wp instantsearch` command.
	 *
	 * @return void
	 */
	public static function register() {
		if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
			return;
		}

		try {
			\WP_CLI::add_command( 'instantsearch', __CLASS__ );
		} catch ( \Throwable $th ) {
			// Ignore duplicate registration and let the original command stand.
		}
	}

	/**
	 * Runs a full index from WP-CLI.
	 *
	 * ## OPTIONS
	 *
	 * [--index_id=<id>]
	 * : Index post ID to target. Defaults to the first configured index.
	 *
	 * [--batch_size=<size>]
	 * : Number of posts to index per batch.
	 *
	 * ## EXAMPLES
	 *
	 *     wp instantsearch index
	 *     wp instantsearch index --index_id=123 --batch_size=50
	 *
	 * @param array $args Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 *
	 * @return void
	 */
	public function index( $args, $assoc_args ) {
		unset( $args );

		$index_id   = isset( $assoc_args['index_id'] ) ? absint( $assoc_args['index_id'] ) : 0;
		$batch_size = isset( $assoc_args['batch_size'] ) ? absint( $assoc_args['batch_size'] ) : 100;

		if ( $batch_size < 1 ) {
			\WP_CLI::error( 'Batch size must be greater than 0.' );
		}

		$index = new Index( $index_id );

		if ( empty( $index->index_post ) || empty( $index->name ) ) {
			\WP_CLI::error( 'Invalid index ID or no index is configured.' );
		}

		$indexer = Indexer::get_instance();

		if ( empty( $indexer->provider ) ) {
			\WP_CLI::error( 'No InstantSearch provider is configured.' );
		}

		\WP_CLI::log( sprintf( 'Starting index "%s" with batch size %d.', $index->name, $batch_size ) );

		try {
			$indexer->provider->clear_index( $index->name );
		} catch ( \Throwable $th ) {
			\WP_CLI::error( sprintf( 'Failed to clear index: %s', $th->getMessage() ) );
		}

		$offset        = 0;
		$total_posts   = null;
		$indexed_posts = 0;

		do {
			$post_query = $index->get_posts_query( $batch_size, $offset );
			$post_ids   = $post_query->posts;

			if ( null === $total_posts ) {
				$total_posts = (int) $post_query->found_posts;
			}

			if ( empty( $post_ids ) ) {
				break;
			}

			try {
				$indexer->index_or_delete_posts( $post_ids, array(), $index );
			} catch ( \Throwable $th ) {
				\WP_CLI::error( sprintf( 'Indexing failed at offset %d: %s', $offset, $th->getMessage() ) );
			}

			$indexed_posts += count( $post_ids );
			$offset        += $batch_size;

			if ( $total_posts > 0 ) {
				$percent = min( 100, round( ( $indexed_posts / $total_posts ) * 100, 2 ) );
				\WP_CLI::log( sprintf( 'Indexed %d/%d posts (%s%%).', $indexed_posts, $total_posts, $percent ) );
			} else {
				\WP_CLI::log( sprintf( 'Indexed %d posts.', $indexed_posts ) );
			}
		} while ( count( $post_ids ) === $batch_size );

		\WP_CLI::success( sprintf( 'Indexing complete. Indexed %d post(s) into "%s".', $indexed_posts, $index->name ) );
	}
}