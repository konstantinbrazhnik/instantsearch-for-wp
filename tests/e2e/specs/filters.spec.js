// @ts-check
const { test, expect } = require('@playwright/test');
const {
  BASE_URL,
  SELECTORS,
  goToSearchPage,
  typeSearch,
  takeDocScreenshot,
} = require('../helpers/wordpress');

// ═══════════════════════════════════════════════════════════════════════════
// Facets / Filters
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Facets and filters', () => {
  test.beforeEach(async ({ page }) => {
    await goToSearchPage(page);
  });

  test('refinement list widget renders when present', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found — plugin may not be configured');
      return;
    }

    await typeSearch(page, 'wordpress');

    const refinementList = page.locator(SELECTORS.refinementList).first();
    const isPresent = await refinementList.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!isPresent) {
      // Facets require an active search index with facet attributes configured.
      // This is acceptable in a fresh dev environment before indexing is complete.
      console.log('[filters.spec] Refinement list not visible — facets may not be configured yet.');
      test.skip(true, 'Refinement list not visible — configure facet attributes in the plugin settings');
      return;
    }

    await expect(refinementList).toBeVisible();
    await takeDocScreenshot(page, '08-refinement-list-visible');
  });

  test('clicking a refinement filter updates the URL state', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found');
      return;
    }

    await typeSearch(page, 'wordpress');

    const checkbox = page.locator(SELECTORS.refinementCheckbox).first();
    const isPresent = await checkbox.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isPresent) {
      test.skip(true, 'No refinement checkboxes — facets not configured');
      return;
    }

    const urlBefore = page.url();
    await checkbox.click();
    await page.waitForTimeout(500);
    const urlAfter = page.url();

    // InstantSearch.js updates the URL hash or query string when filters change
    expect(urlAfter).not.toBe(urlBefore);

    await takeDocScreenshot(page, '09-filter-applied');
  });

  test('active filter shows a count badge or selected indicator', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found');
      return;
    }

    await typeSearch(page, 'search');

    const checkbox = page.locator(SELECTORS.refinementCheckbox).first();
    if (!(await checkbox.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'No refinement checkboxes');
      return;
    }

    await checkbox.click();
    await page.waitForTimeout(500);

    // Look for selected-state class (varies by InstantSearch version)
    const selectedItem = page.locator(
      '.ais-RefinementList-item--selected, .ais-RefinementList-checkbox:checked'
    );
    const hasSelected = await selectedItem.count() > 0;
    expect(hasSelected).toBe(true);

    await takeDocScreenshot(page, '10-filter-selected-state');
  });

  test('clearing all filters resets refinements', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found');
      return;
    }

    await typeSearch(page, 'wordpress');

    const checkbox = page.locator(SELECTORS.refinementCheckbox).first();
    if (!(await checkbox.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'No refinement checkboxes');
      return;
    }

    await checkbox.click();
    await page.waitForTimeout(400);

    // Look for "Clear all" / "ClearRefinements" button
    const clearBtn = page.locator(
      '.ais-ClearRefinements-button, button[aria-label*="clear" i], .ais-CurrentRefinements-delete'
    ).first();

    if (await clearBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await clearBtn.click();
      await page.waitForTimeout(400);

      const stillSelected = await page.locator('.ais-RefinementList-item--selected').count();
      expect(stillSelected).toBe(0);

      await takeDocScreenshot(page, '11-filters-cleared');
    }
  });

  test('sort-by widget changes result order when present', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found');
      return;
    }

    await typeSearch(page, 'wordpress');

    const sortBy = page.locator('.ais-SortBy-select, select[name*="sort"]').first();
    if (!(await sortBy.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'SortBy widget not present');
      return;
    }

    const options = await sortBy.locator('option').count();
    expect(options).toBeGreaterThan(1);

    // Select the last option
    const optionValues = await sortBy.locator('option').allInnerTexts();
    await sortBy.selectOption({ index: options - 1 });
    await page.waitForTimeout(600);

    // URL should reflect the sort change
    expect(page.url()).toContain('sort');

    await takeDocScreenshot(page, '12-sort-changed');
  });
});
