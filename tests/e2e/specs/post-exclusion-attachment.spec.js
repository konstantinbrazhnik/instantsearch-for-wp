// @ts-check
const { test, expect } = require('@playwright/test');
const { BASE_URL, loginToAdmin } = require('../helpers/wordpress');
const { ensurePdfAttachmentScenario, runWpCli } = require('../helpers/wpcli');

test.describe('PDF attachment exclusion scenario', () => {
  let attachmentId;
  let indexCount;
  let noAttachmentIndexAttachmentId;

  test.beforeAll(async () => {
    const setup = ensurePdfAttachmentScenario();
    attachmentId = setup.attachmentId;
    indexCount = setup.indexCount;
  });

  test('backend: REST exclusions endpoint resolves attachment indices', async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'Runs once on Desktop Chrome to avoid duplicate wpcli mutations.');

    const output = runWpCli([
      'eval',
      [
        `$post_id = ${Number(attachmentId)};`,
        'wp_set_current_user( 1 );',
        '$request = new WP_REST_Request( "GET", "/instantsearch-for-wp/v1/post-exclusions/" . $post_id );',
        '$response = rest_do_request( $request );',
        '$data = $response->get_data();',
        'echo wp_json_encode( $data );',
      ].join(' '),
    ]);

    const payload = JSON.parse(output);

    expect(Array.isArray(payload.indices)).toBeTruthy();

    if (indexCount > 0) {
      expect(payload.indices.length).toBeGreaterThan(0);
    }
  });

  test('wp-admin: PDF attachment edit screen shows InstantSearch exclusion controls', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'Runs once on Desktop Chrome to avoid duplicate wpcli mutations.');

    await loginToAdmin(page);
    await page.goto(`${BASE_URL}/wp-admin/post.php?post=${attachmentId}&action=edit`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Exclude from all indices').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=InstantSearch Status').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=No search indices are configured for this post type.')).toHaveCount(0);
  });

  test('backend: REST exclusions endpoint returns no indices when attachment is not included in any index', async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'Runs once on Desktop Chrome to avoid duplicate wpcli mutations.');

    const setupOutput = runWpCli([
      'eval',
      [
        'global $wpdb;',
        '$attachment_id = wp_insert_post(',
        '  array(',
        "    'post_type'      => 'attachment',",
        "    'post_status'    => 'inherit',",
        "    'post_title'     => 'E2E PDF Attachment (No Attachment Index)',",
        "    'post_mime_type' => 'application/pdf',",
        '  )',
        ');',
        '$index_posts = get_posts( array(',
        "  'post_type'      => 'isfwp_index',",
        "  'post_status'    => 'publish',",
        "  'posts_per_page' => -1,",
        ') );',
        'foreach ( $index_posts as $index_post ) {',
        '  $settings = json_decode( $index_post->post_content, true );',
        '  if ( ! is_array( $settings ) ) {',
        '    $settings = array();',
        '  }',
        "  $settings['name'] = $index_post->post_name;",
        "  $settings['post_types'] = array( 'post' );",
        '  $wpdb->update(',
        '    $wpdb->posts,',
        "    array( 'post_content' => wp_json_encode( $settings ) ),",
        "    array( 'ID' => $index_post->ID ),",
        "    array( '%s' ),",
        "    array( '%d' )",
        '  );',
        '  clean_post_cache( $index_post->ID );',
        '}',
        "echo wp_json_encode( array( 'attachment_id' => (int) $attachment_id ) );",
      ].join(' '),
    ]);

    noAttachmentIndexAttachmentId = JSON.parse(setupOutput).attachment_id;

    const output = runWpCli([
      'eval',
      [
        `$post_id = ${Number(noAttachmentIndexAttachmentId)};`,
        'wp_set_current_user( 1 );',
        '$request = new WP_REST_Request( "GET", "/instantsearch-for-wp/v1/post-exclusions/" . $post_id );',
        '$response = rest_do_request( $request );',
        '$data = $response->get_data();',
        'echo wp_json_encode( $data );',
      ].join(' '),
    ]);

    const payload = JSON.parse(output);

    expect(Array.isArray(payload.indices)).toBeTruthy();
    expect(payload.indices.length).toBe(0);
  });

  test('wp-admin: PDF attachment edit screen hides exclusion controls when attachment is not included in any index', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'Runs once on Desktop Chrome to avoid duplicate wpcli mutations.');

    expect(noAttachmentIndexAttachmentId).toBeTruthy();

    await loginToAdmin(page);
    await page.goto(`${BASE_URL}/wp-admin/post.php?post=${noAttachmentIndexAttachmentId}&action=edit`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Exclude from all indices')).toHaveCount(0);
    await expect(page.locator('text=InstantSearch Status')).toHaveCount(0);
    await expect(page.locator('text=No search indices are configured for this post type.')).toHaveCount(0);
  });
});
