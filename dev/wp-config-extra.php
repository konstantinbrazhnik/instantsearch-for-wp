<?php
/**
 * Extra WordPress configuration for the dev environment.
 *
 * This file is NOT loaded automatically — it's referenced here as
 * documentation of the constants injected via WORDPRESS_CONFIG_EXTRA
 * in docker-compose.yml.  You can also include it manually in wp-config.php
 * if you mount WordPress differently.
 *
 * @package InstantSearchForWP\Dev
 */

// Debug.
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );   // Logs to wp-content/debug.log
define( 'WP_DEBUG_DISPLAY', false );
define( 'SCRIPT_DEBUG', true );
define( 'SAVEQUERIES', true );

// Site URL (matches /etc/hosts entry added by dev.sh).
define( 'WP_HOME',    'http://instantsearch-dev.local:8080' );
define( 'WP_SITEURL', 'http://instantsearch-dev.local:8080' );

// Search provider: 'algolia' or 'typesense'.
define( 'INSTANTSEARCH_FOR_WP_PROVIDER', 'typesense' );

// Algolia credentials (set in .env if using Algolia).
define( 'ALGOLIA_APP_ID',        getenv( 'ALGOLIA_APP_ID' ) ?: '' );
define( 'ALGOLIA_API_KEY',       getenv( 'ALGOLIA_SEARCH_ONLY_API_KEY' ) ?: '' );
define( 'ALGOLIA_ADMIN_API_KEY', getenv( 'ALGOLIA_ADMIN_API_KEY' ) ?: '' );

// Typesense (Docker service name resolves inside the network).
define( 'TYPESENSE_HOST',     'typesense' );
define( 'TYPESENSE_PORT',     '8108' );
define( 'TYPESENSE_PROTOCOL', 'http' );
define( 'TYPESENSE_API_KEY',  getenv( 'TYPESENSE_API_KEY' ) ?: 'dev-typesense-api-key' );

// Increase memory for development.
define( 'WP_MEMORY_LIMIT', '256M' );
define( 'WP_MAX_MEMORY_LIMIT', '512M' );
