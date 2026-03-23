<?php

namespace InstantSearchForWP\Integrations;

class BeaverBuilder {

    /**
     * Constructor to set up hooks for Beaver Builder integration.
     *
     * @since 1.0.0
     */
    public function __construct() {
        // Detect if Beaver Builder is active before adding the filter.
        if ( ! class_exists( 'FLBuilder' ) ) {
            return;
        }

        add_filter( 'instantsearch_for_wp_search_trigger_query_selectors', array( $this, 'add_beaver_builder_search_triggers' ) );
    }
    
    /**
     * Add Beaver Builder search triggers to the list of selectors that trigger the site search.
     *
     * @param string $selectors The existing CSS selectors for search triggers.
     * @return string The modified CSS selectors including Beaver Builder triggers.
     */
    public function add_beaver_builder_search_triggers( array $selectors ) {
        $beaver_builder_selectors = array( '.menu-item .fl-search-form .fl-button-wrap > a', '.swp-input--search' );
        return array_merge( $selectors, $beaver_builder_selectors );
    }
}