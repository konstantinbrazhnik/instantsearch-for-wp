<?php

namespace InstantSearchForWP;

use WP_Query;

class Index {

	/**
	 * The custom post type slug for indexes.
	 *
	 * @var string
	 */
	public static string $cpt_slug = 'isfwp_index';

	/**
	 * The post object representing the index.
	 *
	 * @var \WP_Post
	 */
	public \WP_Post $index_post;

	/**
	 * The index settings.
	 *
	 * @var array
	 */
	public array $index_settings;

	/**
	 * The name of the index in the search provider.
	 *
	 * @var string
	 */
	public string $name;

	/**
	 * Constructor for the Index class.
	 *
	 * @param int $index_id The ID of the index post.
	 */
	public function __construct( $index_id = 0 ) {
		if ( 0 === $index_id ) {
			// Constructor code here.
			$index_post = get_posts(
				array(
					'post_type'      => self::$cpt_slug,
					'posts_per_page' => 1,
					'post_status'    => 'publish',
				)
			);
			$index_post = ! empty( $index_post ) ? $index_post[0] : null;
		} else {
			// Constructor code here.
			$index_post = get_post( $index_id );
		}
		if ( $index_post && $index_post->post_type === self::$cpt_slug ) {
			$this->index_post     = $index_post;
			$this->index_settings = json_decode( $index_post->post_content, true );
			$this->name           = Settings::get_index_name( $index_post->post_name );
		}
	}

	/**
	 * Initialize the Index class by registering the custom post type.
	 *
	 * @return void
	 */
	public static function init() {
		if ( is_admin() || defined( 'REST_API_VERSION' ) ) {
			add_action( 'init', array( __CLASS__, 'register_index_cpt' ) );
			add_filter( 'the_content', array( __CLASS__, 'disable_wpautop' ), 0 );
		}
	}

	/**
	 * Register the custom post type for indexes.
	 *
	 * @return void
	 */
	public static function register_index_cpt() {
		// Register a private CPT for indexes.
		register_post_type(
			self::$cpt_slug,
			array(
				'labels'             => array(
					'name'          => __( 'InstantSearch Indexes', 'instantsearch-for-wp' ),
					'singular_name' => __( 'InstantSearch Index', 'instantsearch-for-wp' ),
				),
				'public'             => false,
				'show_ui'            => false,
				'supports'           => array( 'title', 'editor' ),
				'map_meta_cap'       => true,
				'has_archive'        => false,
				'rewrite'            => false,
				'show_in_rest'       => true,
			)
		);
	}

	/**
	 * Disable wpautop filter for index content.
	 *
	 * @param string $content The post content.
	 * @return string The filtered content.
	 */
	public static function disable_wpautop( $content ) {
		if ( get_post_type() === self::$cpt_slug ) {
			remove_filter( 'the_content', 'wpautop' );
		}
		return $content;
	}

	/**
	 * Retrieve posts for indexing based on index settings.
	 *
	 * @param int $number Number of posts to retrieve.
	 * @param int $offset Offset for pagination.
	 * 
	 * @return WP_Query The WP_Query object containing the posts.
	 */
	public function get_posts_query( $number = 100, $offset = 0 ) {
		$query = new WP_Query(
			array(
				'post_type'      => $this->index_settings['post_types'] ?? 'post',
				'posts_per_page' => $number,
				'offset'         => $offset,
				'post_status'    => 'publish',
				'fields'         => 'ids',
			)
		);

		return $query;
	}
}
