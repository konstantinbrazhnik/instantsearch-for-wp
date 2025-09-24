<?php
/**
 * Initializer Class
 *
 * This class is responsible for initializing the InstantSearch for WP plugin.
 * It sets up the necessary components and ensures that the plugin is ready to use.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP;

/**
 * The Initializer class sets up the plugin components.
 */
class Initializer {

	/**
	 * Available search providers.
	 *
	 * @var array
	 */
	private static array $providers = array(
		'algolia' => Connectors\AlgoliaConnector::class,
	);

	/**
	 * Constructor to initialize the plugin components.
	 *
	 * @return void
	 */
	public function __construct() {
		new IndexerHooks();
		new IndexingCriteria();

		$this->get_provider();
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

		// TODO: Get provider from settings.

		return null;
	}
}
