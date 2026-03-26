// @ts-check
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config({ path: '../../.env' });

const BASE_URL = process.env.WP_SITE_URL || 'http://instantsearch-dev.local:8080';
const ADMIN_USER = process.env.WP_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.WP_ADMIN_PASSWORD || 'admin';

/**
 * Playwright configuration for InstantSearch for WP E2E tests.
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './specs',
  testMatch: '**/*.spec.js',

  /* Run tests serially — WordPress is stateful */
  fullyParallel: false,
  workers: 1,

  /* Retry on CI */
  retries: process.env.CI ? 2 : 0,

  /* Reporter */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  /* Output directory for screenshots, videos, traces */
  outputDir: 'test-results',

  use: {
    baseURL: BASE_URL,

    /* Always capture screenshots on failure */
    screenshot: 'only-on-failure',

    /* Capture video on retry (helps debug flaky tests) */
    video: 'on-first-retry',

    /* Full trace on retry */
    trace: 'on-first-retry',

    /* Viewport */
    viewport: { width: 1280, height: 800 },

    /* Generous timeout for WordPress which can be slow in Docker */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  },

  /* Global timeout per test */
  timeout: 60_000,

  /* Global setup/teardown */
  globalSetup: './helpers/global-setup.js',

  /* Test projects */
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'Desktop Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  /* Export these for use in tests */
  metadata: {
    baseURL: BASE_URL,
    adminUser: ADMIN_USER,
    adminPass: ADMIN_PASS,
  },
});
