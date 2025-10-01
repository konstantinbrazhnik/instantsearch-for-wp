<?php

namespace InstantSearchForWP;

class Settings {
	public function __construct() {
		add_action( 'init', array( $this, 'instantsearch_for_wp_settings' ) );
	}

	/**
	 * Register settings for the plugin
	 *
	 * @since 1.0.0
	 */
	public function instantsearch_for_wp_settings() {

		$public_post_types = get_post_types(
			array(
				'public' => true,
			)
		);

		$default = array(
			'provider'   => 'algolia',
			'post_types' => $public_post_types,
		);
		$schema  = array(
			'type'       => 'object',
			'properties' => array(
				'provider' => array(
					'type' => 'string',
					'enum' => array(
						'algolia',
						'typesense',
					),
				),
				'post_types' => array(
					'type'        => 'array',
					'uniqueItems' => true,
					'items'       => array(
						'type' => 'string',
					),
				),
			),
		);

		register_setting(
			'options',
			'instantsearch_for_wp_settings',
			array(
				'type'         => 'object',
				'default'      => $default,
				'show_in_rest' => array(
					'schema' => $schema,
				),
			)
		);
	}
}