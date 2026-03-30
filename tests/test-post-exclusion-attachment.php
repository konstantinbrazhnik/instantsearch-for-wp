<?php
/**
 * PHPUnit tests for PDF attachment post exclusion behavior.
 *
 * @package InstantSearch_For_WP
 */

/**
 * Test cases for attachment exclusion behavior.
 */
class PostExclusionAttachmentTest extends \WP_UnitTestCase {

	/**
	 * Admin user ID used for capability checks.
	 *
	 * @var int
	 */
	private $admin_user_id = 0;

	/**
	 * Set up test fixtures.
	 *
	 * @return void
	 */
	public function setUp(): void {
		parent::setUp();

		\InstantSearchForWP\Index::register_index_cpt();
		$this->admin_user_id = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $this->admin_user_id );
	}

	/**
	 * Reset globals after each test.
	 *
	 * @return void
	 */
	public function tearDown(): void {
		$_POST = array();
		parent::tearDown();
	}

	/**
	 * Create a legacy index post with no explicit post_types setting.
	 *
	 * @param string $slug Index slug.
	 * @return int
	 */
	private function create_legacy_index( $slug ) {
		return wp_insert_post(
			array(
				'post_type'    => \InstantSearchForWP\Index::$cpt_slug,
				'post_status'  => 'publish',
				'post_title'   => 'Legacy Index',
				'post_name'    => $slug,
				'post_content' => wp_json_encode(
					array(
						'name' => $slug,
					)
				),
			)
		);
	}

	/**
	 * Create a PDF attachment post.
	 *
	 * @return int
	 */
	private function create_pdf_attachment() {
		$attachment_id = self::factory()->post->create(
			array(
				'post_title'     => 'Unit Test PDF Attachment',
				'post_type'      => 'post',
				'post_status'    => 'publish',
			)
		);

		wp_update_post(
			array(
				'ID'             => $attachment_id,
				'post_type'      => 'attachment',
				'post_status'    => 'inherit',
				'post_mime_type' => 'application/pdf',
				'guid'           => 'http://example.org/wp-content/uploads/unit-test.pdf',
			)
		);

		return absint( $attachment_id );
	}

	/**
	 * REST payload for an attachment should not include indices when index JSON
	 * omits explicit attachment post type inclusion.
	 *
	 * @return void
	 */
	public function test_rest_payload_excludes_indices_for_attachment_with_legacy_index_settings() {
		$index_slug     = 'legacy-attachment-index';
		$this->create_legacy_index( $index_slug );
		$attachment_id  = $this->create_pdf_attachment();
		$post_exclusion = new \InstantSearchForWP\PostExclusion();

		$request  = new \WP_REST_Request( 'GET', '/instantsearch-for-wp/v1/post-exclusions/' . $attachment_id );
		$request->set_param( 'post_id', $attachment_id );
		$response = $post_exclusion->rest_get_exclusions( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'indices', $data );
		$this->assertEmpty( $data['indices'] );
	}

	/**
	 * Saving attachment exclusions should reject slugs from legacy indices when
	 * attachment post type is not explicitly included.
	 *
	 * @return void
	 */
	public function test_save_meta_box_rejects_attachment_exclusion_slug_from_legacy_index() {
		$index_slug     = 'legacy-save-index';
		$this->create_legacy_index( $index_slug );
		$attachment_id  = $this->create_pdf_attachment();
		$post           = get_post( $attachment_id );
		$post_exclusion = new \InstantSearchForWP\PostExclusion();

		$_POST['instantsearch_exclusion_nonce']     = wp_create_nonce( 'instantsearch_exclusion_nonce' );
		$_POST['instantsearch_exclude_indices']     = array( $index_slug );
		$_POST['instantsearch_exclude_all']         = '';

		$post_exclusion->save_meta_box( $attachment_id, $post );

		$stored = get_post_meta( $attachment_id, \InstantSearchForWP\PostExclusion::META_KEY, true );

		$this->assertEmpty( $stored );
	}
}
