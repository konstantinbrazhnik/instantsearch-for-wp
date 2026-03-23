<?php

namespace InstantSearchForWP;

class Integrations {

    /**
     * Constructor to set up hooks for integrations.
     *
     * @since 1.0.0
     */
    public function __construct() {
        new Integrations\BeaverBuilder();
    }
}