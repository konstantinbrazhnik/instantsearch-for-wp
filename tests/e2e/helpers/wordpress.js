// @ts-check
const { expect } = require('@playwright/test');
require('dotenv').config({ path: '../../.env' });

const BASE_URL = process.env.WP_SITE_URL || 'http://instantsearch-dev.local:8080';
const ADMIN_USER = process.env.WP_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.WP_ADMIN_PASSWORD || 'admin';

// ── Selectors ────────────────────────────────────────────────────────────────
// These are based on the plugin's frontend HTML structure.
// Update if the plugin's DOM changes.
const SELECTORS = {
  // Site search trigger button (opens search overlay)
  searchTrigger: '[data-instantsearch-trigger], .instantsearch-trigger, button[aria-label*="search" i], .search-toggle',
  // Search input inside the InstantSearch widget
  searchInput: '.ais-SearchBox-input, input[placeholder*="search" i], input[type="search"]',
  // Search result hits container
  hitsContainer: '.ais-Hits, .ais-InfiniteHits, [data-instantsearch-hits]',
  // Individual hit item
  hitItem: '.ais-Hits-item, .ais-InfiniteHits-item',
  // RefinementList (facets) container
  refinementList: '.ais-RefinementList, [data-instantsearch-refinement]',
  // Refinement list checkbox
  refinementCheckbox: '.ais-RefinementList-checkbox',
  // Pagination
  pagination: '.ais-Pagination, [data-instantsearch-pagination]',
  paginationItem: '.ais-Pagination-item',
  paginationNext: '.ais-Pagination-item--nextPage a, .ais-Pagination-link[aria-label="Next"]',
  // No results message
  noResults: '.ais-Hits-empty, .ais-InfiniteHits-empty, [data-no-results], .instantsearch-no-results',
  // Stats
  stats: '.ais-Stats, [data-instantsearch-stats]',
  // Search overlay / dialog
  searchOverlay: '[data-instantsearch-overlay], .instantsearch-overlay, dialog[open]',
  // Loading indicator
  loadingIndicator: '.ais-LoadingIndicator',
};

// ── Helper functions ─────────────────────────────────────────────────────────

/**
 * Navigate to the WordPress frontend homepage.
 * @param {import('@playwright/test').Page} page
 */
async function goToHome(page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to the search page.
 * @param {import('@playwright/test').Page} page
 */
async function goToSearchPage(page) {
  await page.goto(`${BASE_URL}/search`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to WordPress admin.
 * @param {import('@playwright/test').Page} page
 */
async function goToAdmin(page) {
  await page.goto(`${BASE_URL}/wp-admin/`);
  await page.waitForLoadState('networkidle');
}

/**
 * Log into WordPress admin.
 * @param {import('@playwright/test').Page} page
 * @param {string} [user]
 * @param {string} [pass]
 */
async function loginToAdmin(page, user = ADMIN_USER, pass = ADMIN_PASS) {
  await page.goto(`${BASE_URL}/wp-login.php`);
  await page.fill('#user_login', user);
  await page.fill('#user_pass', pass);
  await page.click('#wp-submit');
  await page.waitForURL('**/wp-admin/**', { timeout: 15_000 });
}

/**
 * Open the site search overlay/interface.
 * Tries multiple trigger selectors in order.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} true if search was opened
 */
async function openSiteSearch(page) {
  const triggerSelectors = [
    '[data-instantsearch-trigger]',
    '.instantsearch-trigger',
    'button[aria-label*="search" i]',
    'button[aria-label*="Search" i]',
    '.search-toggle',
    'a[href*="?s="]',
  ];

  for (const sel of triggerSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await el.click();
      return true;
    }
  }
  return false;
}

/**
 * Type a search query and wait for results to update.
 * @param {import('@playwright/test').Page} page
 * @param {string} query
 * @param {{ expectResults?: boolean }} [opts]
 */
async function typeSearch(page, query, opts = {}) {
  const input = page.locator(SELECTORS.searchInput).first();
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.click();
  await input.fill(query);
  // Small wait for debounce + results
  await page.waitForTimeout(600);
  if (opts.expectResults) {
    await waitForHits(page);
  }
}

/**
 * Wait for search hits to appear.
 * @param {import('@playwright/test').Page} page
 * @param {number} [minCount=1]
 */
async function waitForHits(page, minCount = 1) {
  const hits = page.locator(SELECTORS.hitItem);
  await expect(hits.first()).toBeVisible({ timeout: 15_000 });
  const count = await hits.count();
  expect(count).toBeGreaterThanOrEqual(minCount);
  return count;
}

/**
 * Clear the search input.
 * @param {import('@playwright/test').Page} page
 */
async function clearSearch(page) {
  const input = page.locator(SELECTORS.searchInput).first();
  await input.fill('');
  await page.waitForTimeout(400);
}

/**
 * Take a named screenshot, saving to docs/media/.
 * @param {import('@playwright/test').Page} page
 * @param {string} name  e.g. "search-results-facets"
 */
async function takeDocScreenshot(page, name) {
  const path = `../../docs/media/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`[screenshot] Saved: ${path}`);
  return path;
}

module.exports = {
  BASE_URL,
  ADMIN_USER,
  ADMIN_PASS,
  SELECTORS,
  goToHome,
  goToSearchPage,
  goToAdmin,
  loginToAdmin,
  openSiteSearch,
  typeSearch,
  waitForHits,
  clearSearch,
  takeDocScreenshot,
};
