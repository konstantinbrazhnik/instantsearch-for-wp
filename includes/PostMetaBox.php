<?php
/**
 * Post Meta Box Class
 *
 * Registers an InstantSearch meta box on post edit screens for all post types
 * that are included in at least one configured index. For attachment post types,
 * the meta box is displayed when the attachment post type is indexed; non-PDF
 * attachments are flagged as not indexed in the rendered output.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PostMetaBox
 *
 * Adds a sidebar meta box to eligible post edit screens and manages the
 * `_instantsearch_omit_from_index` post meta value.
 */
class PostMetaBox {

	/**
	 * Post meta key used to flag a post as excluded from the search index.
	 *
	 * @var string
	 */
	const META_KEY = '_instantsearch_omit_from_index';

	/**
	 * Nonce action used for meta box form verification.
	 *
	 * @var string
	 */
	const NONCE_ACTION = 'instantsearch_meta_box';

	/**
	 * Nonce field name embedded in the meta box form.
	 *
	 * @var string
	 */
	const NONCE_FIELD = 'instantsearch_meta_box_nonce';

	/**
	 * Constructor – registers WordPress hooks.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_action( 'add_meta_boxes', array( $this, 'register_meta_box' ) );
		add_action( 'save_post', array( $this, 'save_meta_box' ), 10, 2 );
	}

	/**
	 * Register the meta box for all post types included in at least one index.
	 *
	 * Hooked on `add_meta_boxes`. The first argument passed by WordPress is the
	 * current post type slug, so the meta box is added only when that post type
	 * is configured in at least one `isfwp_index`.
	 *
	 * @since 1.0.0
	 *
	 * @param string $post_type The current post type slug.
	 * @return void
	 */
	public function register_meta_box( $post_type ) {
		if ( ! Index::is_post_type_indexed( $post_type ) ) {
			return;
		}

		add_meta_box(
			'instantsearch-for-wp',
			__( 'InstantSearch', 'yoko-core' ),
			array( $this, 'render_meta_box' ),
			$post_type,
			'side',
			'default'
		);
	}

	/**
	 * Render the meta box HTML.
	 *
	 * For attachment post types that are not PDF files, a notice is displayed
	 * because only PDF attachments are indexed by the plugin.
	 *
	 * @since 1.0.0
	 *
	 * @param \WP_Post $post The current post object.
	 * @return void
	 */
	public function render_meta_box( $post ) {
		if ( 'attachment' === $post->post_type && 'application/pdf' !== get_post_mime_type( $post->ID ) ) {
			echo '<p>' . esc_html__( 'Only PDF attachments are indexed.', 'yoko-core' ) . '</p>';
			return;
		}

		$omit = get_post_meta( $post->ID, self::META_KEY, true );

		wp_nonce_field( self::NONCE_ACTION, self::NONCE_FIELD );
		?>
		<label>
			<input
				type="checkbox"
				name="instantsearch_omit_from_index"
				value="1"
				<?php checked( $omit, '1' ); ?>
			>
			<?php esc_html_e( 'Exclude from search index', 'yoko-core' ); ?>
		</label>
		<?php
	}

	/**
	 * Persist the meta box value when the post is saved.
	 *
	 * Verifies the nonce, skips autosaves, and checks user capabilities before
	 * updating the `_instantsearch_omit_from_index` post meta.
	 *
	 * @since 1.0.0
	 *
	 * @param int      $post_id The ID of the post being saved.
	 * @param \WP_Post $post    The post object being saved.
	 * @return void
	 */
	public function save_meta_box( $post_id, $post ) {
		// Bail if the nonce field is absent (e.g. autosave or REST save).
		if ( ! isset( $_POST[ self::NONCE_FIELD ] ) ) {
			return;
		}

		// Verify the nonce.
		if ( ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST[ self::NONCE_FIELD ] ) ), self::NONCE_ACTION ) ) {
			return;
		}

		// Skip autosaves.
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		// Check edit capability.
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$omit = ( isset( $_POST['instantsearch_omit_from_index'] ) && '1' === $_POST['instantsearch_omit_from_index'] ) ? '1' : '';
		update_post_meta( $post_id, self::META_KEY, $omit );
	}
}
