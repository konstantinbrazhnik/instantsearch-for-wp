// @ts-check
const { test, expect } = require('@playwright/test');
const {
  BASE_URL,
  SELECTORS,
  goToSearchPage,
  typeSearch,
  waitForHits,
  takeDocScreenshot,
} = require('../helpers/wordpress');

// ═══════════════════════════════════════════════════════════════════════════
// Pagination
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await goToSearchPage(page);
  });

  test('pagination widget renders when present', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found');
      return;
    }

    // Use a broad query to increase chance of multi-page results
    await typeSearch(page, 'a');
    await page.waitForTimeout(800);

    const pagination = page.locator(SELECTORS.pagination).first();
    const isPresent = await pagination.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!isPresent) {
      test.skip(true, 'Pagination widget not visible — may not be configured or results fit on one page');
      return;
    }

    await expect(pagination).toBeVisible();
    await takeDocScreenshot(page, '13-pagination-visible');
  });

  test('pagination items include page numbers', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found');
      return;
    }

    await typeSearch(page, 'the');
    await page.waitForTimeout(800);

    const pagination = page.locator(SELECTORS.pagination).first();
    if (!(await pagination.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Pagination not visible');
      return;
    }

    const items = page.locator(SELECTORS.paginationItem);
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking next page loads different results', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found');
      return;
    }

    await typeSearch(page, 'search');
    await page.waitForTimeout(800);

    const nextBtn = page.locator(SELECTORS.paginationNext).first();
    if (!(await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Next page button not visible — results fit on one page or pagination not configured');
      return;
    }

    // Capture first-page hits
    const firstPageHits = await page.locator(SELECTORS.hitItem).allInnerTexts();

    await nextBtn.click();
    await page.waitForTimeout(800);

    // URL should contain page=2 or similar state
    const urlAfterNav = page.url();
    const hasPageState = urlAfterNav.includes('page') || urlAfterNav.includes('Page') || urlAfterNav.includes('p=');

    // Either URL changed OR hit content changed
    const secondPageHits = await page.locator(SELECTORS.hitItem).allInnerTexts();
    const contentChanged = JSON.stringify(firstPageHits) !== JSON.stringify(secondPageHits);

    expect(hasPageState || contentChanged).toBe(true);

    await takeDocScreenshot(page, '14-page-2-results');
  });

  test('navigating to page 2 then back to page 1 restores original results', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found');
      return;
    }

    await typeSearch(page, 'wordpress');
    await page.waitForTimeout(800);

    const nextBtn = page.locator(SELECTORS.paginationNext).first();
    if (!(await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Next page button not visible');
      return;
    }

    const firstPageHits = await page.locator(SELECTORS.hitItem).allInnerTexts();

    // Go to page 2
    await nextBtn.click();
    await page.waitForTimeout(600);

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const restoredHits = await page.locator(SELECTORS.hitItem).allInnerTexts();

    // After back navigation, hits should match page 1
    if (firstPageHits.length > 0 && restoredHits.length > 0) {
      expect(restoredHits).toEqual(firstPageHits);
    }
  });

  test('stats widget shows result count', async ({ page }) => {
    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found');
      return;
    }

    await typeSearch(page, 'wordpress');
    await page.waitForTimeout(800);

    const stats = page.locator(SELECTORS.stats).first();
    if (!(await stats.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Stats widget not present');
      return;
    }

    const statsText = await stats.innerText();
    // Stats should contain a number
    expect(statsText).toMatch(/\d/);

    await takeDocScreenshot(page, '15-stats-widget');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// InfiniteHits variant
// ═══════════════════════════════════════════════════════════════════════════

test.describe('InfiniteHits / Load More', () => {
  test('load-more button appends additional results', async ({ page }) => {
    await goToSearchPage(page);

    const input = page.locator(SELECTORS.searchInput).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Search input not found');
      return;
    }

    await typeSearch(page, 'a');
    await page.waitForTimeout(800);

    const loadMoreBtn = page.locator(
      '.ais-InfiniteHits-loadMore, button[class*="load-more" i], button[aria-label*="load more" i]'
    ).first();

    if (!(await loadMoreBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Load more button not present — InfiniteHits may not be configured');
      return;
    }

    const initialCount = await page.locator('.ais-InfiniteHits-item').count();
    await loadMoreBtn.click();
    await page.waitForTimeout(800);
    const afterCount = await page.locator('.ais-InfiniteHits-item').count();

    expect(afterCount).toBeGreaterThan(initialCount);
    await takeDocScreenshot(page, '16-load-more-results');
  });
});
