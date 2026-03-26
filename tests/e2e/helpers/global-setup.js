// @ts-check
const { chromium } = require('@playwright/test');
require('dotenv').config({ path: '../../.env' });

const BASE_URL = process.env.WP_SITE_URL || 'http://instantsearch-dev.local:8080';
const ADMIN_USER = process.env.WP_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.WP_ADMIN_PASSWORD || 'admin';

/**
 * Global setup: verify WordPress is running and store auth state.
 * This runs once before all tests.
 */
async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Verify site is up
  try {
    const response = await page.goto(BASE_URL, { timeout: 30_000 });
    if (!response || response.status() >= 500) {
      throw new Error(`WordPress returned status ${response?.status()} — is the dev environment running? Run ./dev.sh up first.`);
    }
  } catch (error) {
    await browser.close();
    throw new Error(
      `Cannot reach WordPress at ${BASE_URL}.\n` +
      `Make sure the dev environment is running: ./dev.sh up\n` +
      `Original error: ${error.message}`
    );
  }

  // Log into WordPress admin and save auth state
  await page.goto(`${BASE_URL}/wp-login.php`);
  await page.fill('#user_login', ADMIN_USER);
  await page.fill('#user_pass', ADMIN_PASS);
  await page.click('#wp-submit');
  await page.waitForURL('**/wp-admin/**', { timeout: 15_000 });

  // Save authenticated state for use in admin tests
  await page.context().storageState({ path: 'test-results/.auth.json' });

  await browser.close();
  console.log(`[global-setup] WordPress verified at ${BASE_URL}`);
}

module.exports = globalSetup;
