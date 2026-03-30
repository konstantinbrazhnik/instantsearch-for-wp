// @ts-check
const { test, expect } = require('@playwright/test');
const { BASE_URL, loginToAdmin } = require('../helpers/wordpress');
const { ensurePdfAttachmentScenario, runWpCli } = require('../helpers/wpcli');

test.describe('PDF attachment exclusion scenario', () => {
  let attachmentId;
  let indexCount;

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
});
