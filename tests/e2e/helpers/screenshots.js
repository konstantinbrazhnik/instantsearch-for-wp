#!/usr/bin/env node
// =============================================================================
// tests/e2e/helpers/screenshots.js
// =============================================================================
// Captures key plugin states as screenshots for documentation.
// Saves to docs/media/.
//
// Usage:
//   cd tests/e2e && npm run screenshot
//   # or from repo root:
//   ./dev.sh screenshot
// =============================================================================

'use strict';

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const BASE_URL = process.env.WP_SITE_URL || 'http://instantsearch-dev.local:8080';
const ADMIN_USER = process.env.WP_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.WP_ADMIN_PASSWORD || 'admin';
const MEDIA_DIR = path.resolve(__dirname, '../../../docs/media');

// Ensure output directory exists
fs.mkdirSync(MEDIA_DIR, { recursive: true });

/** @param {string} name */
function mediaPath(name) {
  return path.join(MEDIA_DIR, `${name}.png`);
}

async function run() {
  console.log(`\nCapturing screenshots for InstantSearch for WP\n${'─'.repeat(50)}`);
  console.log(`Base URL : ${BASE_URL}`);
  console.log(`Output   : ${MEDIA_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Helper: capture screenshot with label
  const capture = async (name, description) => {
    try {
      await page.screenshot({ path: mediaPath(name), fullPage: false });
      console.log(`  ✓ ${name}.png — ${description}`);
    } catch (e) {
      console.warn(`  ✗ ${name}.png — ${e.message}`);
    }
  };

  // ── 1. Homepage ──────────────────────────────────────────────────────────
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await capture('homepage', 'WordPress homepage with search trigger');

  // ── 2. Search overlay / trigger ─────────────────────────────────────────
  const triggerSels = [
    '[data-instantsearch-trigger]',
    'button[aria-label*="search" i]',
    '.search-toggle',
    '.instantsearch-trigger',
  ];
  for (const sel of triggerSels) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await el.click();
      await page.waitForTimeout(500);
      await capture('search-overlay-open', 'Search overlay opened');
      break;
    }
  }

  // ── 3. Typing a query ───────────────────────────────────────────────────
  const searchInput = page.locator('.ais-SearchBox-input, input[type="search"]').first();
  if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await searchInput.fill('wordpress');
    await page.waitForTimeout(800);
    await capture('search-query-wordpress', 'Results for query "wordpress"');

    await searchInput.fill('search plugin');
    await page.waitForTimeout(800);
    await capture('search-query-plugin', 'Results for query "search plugin"');

    // Empty search
    await searchInput.fill('xyzzy_no_results_9999');
    await page.waitForTimeout(800);
    await capture('search-no-results', 'No results empty state');

    await searchInput.fill('');
    await page.waitForTimeout(400);
  }

  // ── 4. Search page (dedicated) ───────────────────────────────────────────
  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  await capture('search-page-empty', 'Dedicated search page — empty state');

  const searchInputPage = page.locator('.ais-SearchBox-input, input[type="search"]').first();
  if (await searchInputPage.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await searchInputPage.fill('instantsearch');
    await page.waitForTimeout(800);
    await capture('search-page-results', 'Dedicated search page — results');

    // ── 5. Facets ──────────────────────────────────────────────────────────
    const refinement = page.locator('.ais-RefinementList').first();
    if (await refinement.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await capture('facets-visible', 'Search page with facets sidebar');

      const checkbox = page.locator('.ais-RefinementList-checkbox').first();
      if (await checkbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await checkbox.click();
        await page.waitForTimeout(500);
        await capture('facets-applied', 'Facet filter applied — results filtered');
      }
    }
  }

  // ── 6. Admin settings page ──────────────────────────────────────────────
  await page.goto(`${BASE_URL}/wp-login.php`);
  await page.fill('#user_login', ADMIN_USER);
  await page.fill('#user_pass', ADMIN_PASS);
  await page.click('#wp-submit');
  await page.waitForURL('**/wp-admin/**', { timeout: 15_000 });

  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=instantsearch-for-wp`, { waitUntil: 'networkidle' });
  await capture('admin-settings', 'Plugin settings page in wp-admin');

  // ── 7. Index list ────────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/wp-admin/edit.php?post_type=isfwp_index`, { waitUntil: 'networkidle' });
  await capture('admin-index-list', 'Search index list in wp-admin');

  // ── 8. Full-page search (1440px viewport) ────────────────────────────────
  await context.setDefaultViewportSize({ width: 1440, height: 900 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  const wideInput = page.locator('.ais-SearchBox-input, input[type="search"]').first();
  if (await wideInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await wideInput.fill('algolia typesense');
    await page.waitForTimeout(800);
  }
  await capture('search-page-wide', 'Search page at 1440px viewport');

  // ── 9. Mobile viewport ───────────────────────────────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  await capture('search-mobile', 'Search page on mobile viewport');

  await browser.close();

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Screenshots saved to: ${MEDIA_DIR}\n`);
}

run().catch((err) => {
  console.error('[screenshots] Error:', err.message);
  process.exit(1);
});
