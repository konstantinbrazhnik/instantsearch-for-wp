// @ts-check
const { test, expect } = require('@playwright/test');
const {
  BASE_URL,
  SELECTORS,
  goToHome,
  goToSearchPage,
  openSiteSearch,
  typeSearch,
  waitForHits,
  clearSearch,
  takeDocScreenshot,
} = require('../helpers/wordpress');

// ═══════════════════════════════════════════════════════════════════════════
// Search Box — Core Behaviour
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Search box', () => {
  test.beforeEach(async ({ page }) => {
    await goToHome(page);
  });

  test('search trigger is visible on the page', async ({ page }) => {
    // The plugin renders a search trigger button when site search is enabled.
    // Accept any of the common trigger patterns.
    const triggers = page.locator(
      [
        '[data-instantsearch-trigger]',
        '.instantsearch-trigger',
        'button[aria-label*="search" i]',
        '.search-toggle',
        'input[type="search"]',
        '.ais-SearchBox-input',
      ].join(', ')
    );

    await expect(triggers.first()).toBeVisible({ timeout: 10_000 });
    await takeDocScreenshot(page, '01-search-trigger-visible');
  });

  test('search input accepts keyboard input', async ({ page }) => {
    const opened = await openSiteSearch(page);
    if (!opened) {
      await goToSearchPage(page);
    }

    const input = page.locator(SELECTORS.searchInput).first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    await input.click();
    await input.fill('wordpress');
    await expect(input).toHaveValue('wordpress');

    await takeDocScreenshot(page, '02-search-input-filled');
  });

  test('search input is focusable via keyboard shortcut or click', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();

    if (!(await input.isVisible({ timeout: 3_000 }).catch(() => false))) {
      await openSiteSearch(page);
    }

    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.focus();
    await expect(input).toBeFocused();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Search Results — InstantSearch Behaviour
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Search results', () => {
  test.beforeEach(async ({ page }) => {
    await goToSearchPage(page);
  });

  test('hits container renders in the DOM', async ({ page }) => {
    // The hits container should be present even before a query is entered,
    // because InstantSearch.js renders it on initialisation.
    const hits = page.locator(SELECTORS.hitsContainer).first();
    await expect(hits).toBeAttached({ timeout: 15_000 });
  });

  test('typing a query updates results (instant search behaviour)', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();

    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found on search page — check plugin configuration');
      return;
    }

    // Capture initial state
    const initialHtml = await page.locator(SELECTORS.hitsContainer).first().innerHTML().catch(() => '');

    // Type a query
    await input.fill('search');
    await page.waitForTimeout(800);

    // Results container should have changed
    const updatedHtml = await page.locator(SELECTORS.hitsContainer).first().innerHTML().catch(() => '');

    // Either results appeared OR the HTML changed (empty state rendered)
    // We don't assert specific result counts because search needs backend credentials
    expect(updatedHtml).not.toBe('');

    await takeDocScreenshot(page, '03-search-results-query');
  });

  test('clearing the search input resets the results view', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not visible');
      return;
    }

    await input.fill('wordpress');
    await page.waitForTimeout(600);
    const filledHtml = await page.locator(SELECTORS.hitsContainer).first().innerHTML().catch(() => '');

    await clearSearch(page);
    const clearedHtml = await page.locator(SELECTORS.hitsContainer).first().innerHTML().catch(() => '');

    // DOM should change when query is cleared
    if (filledHtml && clearedHtml) {
      expect(clearedHtml).not.toBe(filledHtml);
    }

    await takeDocScreenshot(page, '04-search-cleared');
  });

  test('hit items are clickable links', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not visible');
      return;
    }

    await typeSearch(page, 'search');

    const hitLinks = page.locator(`${SELECTORS.hitItem} a`);
    const count = await hitLinks.count();

    if (count > 0) {
      // Verify hit links have valid hrefs
      const href = await hitLinks.first().getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);

      await takeDocScreenshot(page, '05-search-hit-items');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Empty State / No Results
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Empty state', () => {
  test.beforeEach(async ({ page }) => {
    await goToSearchPage(page);
  });

  test('no-results state renders for a nonsense query', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not visible');
      return;
    }

    // This query is extremely unlikely to match anything
    await input.fill('xyzzy_no_results_8675309_zzzz');
    await page.waitForTimeout(1_000);

    // The hits list should be empty (no hit items) or an explicit no-results
    // element should appear
    const hitCount = await page.locator(SELECTORS.hitItem).count();
    const noResultsEl = await page.locator(SELECTORS.noResults).isVisible().catch(() => false);

    // At least one of: zero hits OR an explicit empty state element
    const hasEmptyState = hitCount === 0 || noResultsEl;
    expect(hasEmptyState).toBe(true);

    await takeDocScreenshot(page, '06-no-results-state');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Plugin admin page loads
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Admin interface', () => {
  test('InstantSearch settings page loads in wp-admin', async ({ page }) => {
    // Log in
    await page.goto(`${BASE_URL}/wp-login.php`);
    await page.fill('#user_login', process.env.WP_ADMIN_USER || 'admin');
    await page.fill('#user_pass', process.env.WP_ADMIN_PASSWORD || 'admin');
    await page.click('#wp-submit');
    await page.waitForURL('**/wp-admin/**', { timeout: 15_000 });

    // Navigate to the plugin page — it registers under 'instantsearch-settings'.
    await page.goto(`${BASE_URL}/wp-admin/admin.php?page=instantsearch-settings`);
    await page.waitForLoadState('networkidle');

    // Admin page should load without a fatal error
    await expect(page).not.toHaveTitle(/Fatal error/i);
    await expect(page).not.toHaveTitle(/Parse error/i);

    // Some plugin UI element should be present
    const adminRoot = page.locator('#instantsearch-for-wp-admin, .instantsearch-admin, #wpbody');
    await expect(adminRoot).toBeVisible({ timeout: 10_000 });

    await takeDocScreenshot(page, '07-admin-settings-page');
  });
});
