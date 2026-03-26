#!/usr/bin/env node
// =============================================================================
// tests/e2e/helpers/gif-recorder.js
// =============================================================================
// Records interaction GIFs by capturing a sequence of screenshots during a
// Playwright automation flow, then stitching them together.
//
// Produces:
//   docs/media/search-interaction.gif   — type query, results appear
//   docs/media/filter-interaction.gif   — apply facet, results filter
//
// Usage:
//   cd tests/e2e && npm run gif
//   # or from repo root:
//   ./dev.sh gif
//
// Dependencies: @playwright/test, gifencoder, canvas
// =============================================================================

'use strict';

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const BASE_URL = process.env.WP_SITE_URL || 'http://instantsearch-dev.local:8080';
const MEDIA_DIR = path.resolve(__dirname, '../../../docs/media');

fs.mkdirSync(MEDIA_DIR, { recursive: true });

// ── GIF encoder via gifencoder + canvas ──────────────────────────────────────

async function createGif(frames, outputPath, opts = {}) {
  let GIFEncoder, createCanvas, loadImage;

  try {
    GIFEncoder = require('gifencoder');
    ({ createCanvas, loadImage } = require('canvas'));
  } catch {
    console.warn('[gif-recorder] gifencoder or canvas not installed — saving frames as PNGs instead.');
    frames.forEach((f, i) => {
      const dest = outputPath.replace('.gif', `_frame${String(i).padStart(3, '0')}.png`);
      fs.copyFileSync(f, dest);
    });
    return;
  }

  const { width = 1280, height = 800, delay = 200 } = opts;
  const encoder = new GIFEncoder(width, height);

  const stream = encoder.createReadStream();
  const chunks = [];
  stream.on('data', (chunk) => chunks.push(chunk));

  encoder.start();
  encoder.setRepeat(0);    // Loop forever
  encoder.setDelay(delay); // ms between frames
  encoder.setQuality(10);  // Lower = better quality

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  for (const framePath of frames) {
    const img = await loadImage(framePath);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  fs.writeFileSync(outputPath, Buffer.concat(chunks));
  console.log(`  ✓ ${path.basename(outputPath)} (${frames.length} frames)`);
}

// ── Recording utilities ───────────────────────────────────────────────────────

let _frameIdx = 0;

async function captureFrame(page, prefix) {
  const framePath = path.join(MEDIA_DIR, `_frame_${prefix}_${String(_frameIdx++).padStart(4, '0')}.png`);
  await page.screenshot({ path: framePath, fullPage: false });
  return framePath;
}

function collectFrames(prefix) {
  return fs.readdirSync(MEDIA_DIR)
    .filter((f) => f.startsWith(`_frame_${prefix}_`) && f.endsWith('.png'))
    .sort()
    .map((f) => path.join(MEDIA_DIR, f));
}

function cleanFrames(prefix) {
  fs.readdirSync(MEDIA_DIR)
    .filter((f) => f.startsWith(`_frame_${prefix}_`))
    .forEach((f) => fs.unlinkSync(path.join(MEDIA_DIR, f)));
}

// ── Recording: Search Interaction ────────────────────────────────────────────

async function recordSearchInteraction(page) {
  const prefix = 'search';
  console.log('\nRecording: search-interaction.gif');

  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  await captureFrame(page, prefix); // initial state

  const input = page.locator('.ais-SearchBox-input, input[type="search"]').first();
  if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.warn('  ⚠ Search input not found — skipping search recording');
    return;
  }

  // Type query character by character for a realistic animation
  const query = 'wordpress search';
  await input.click();
  await captureFrame(page, prefix);

  for (const char of query) {
    await input.press(char === ' ' ? 'Space' : char);
    await page.waitForTimeout(80);
    await captureFrame(page, prefix);
  }

  // Wait for results and capture a few frames
  await page.waitForTimeout(400);
  await captureFrame(page, prefix);
  await captureFrame(page, prefix); // duplicate for pause effect

  const frames = collectFrames(prefix);
  await createGif(frames, path.join(MEDIA_DIR, 'search-interaction.gif'), { delay: 120 });
  cleanFrames(prefix);
}

// ── Recording: Filter Interaction ────────────────────────────────────────────

async function recordFilterInteraction(page) {
  const prefix = 'filter';
  console.log('\nRecording: filter-interaction.gif');

  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });

  const input = page.locator('.ais-SearchBox-input, input[type="search"]').first();
  if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.warn('  ⚠ Search input not found — skipping filter recording');
    return;
  }

  await input.fill('wordpress');
  await page.waitForTimeout(600);
  await captureFrame(page, prefix);

  const checkbox = page.locator('.ais-RefinementList-checkbox').first();
  if (!(await checkbox.isVisible({ timeout: 3_000 }).catch(() => false))) {
    console.warn('  ⚠ No facets visible — skipping filter recording');
    cleanFrames(prefix);
    return;
  }

  // Hover over checkbox
  await checkbox.hover();
  await page.waitForTimeout(200);
  await captureFrame(page, prefix);

  // Click checkbox
  await checkbox.click();
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(150);
    await captureFrame(page, prefix);
  }

  // Hold on filtered state
  await captureFrame(page, prefix);
  await captureFrame(page, prefix);

  const frames = collectFrames(prefix);
  await createGif(frames, path.join(MEDIA_DIR, 'filter-interaction.gif'), { delay: 150 });
  cleanFrames(prefix);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\nRecording interaction GIFs for InstantSearch for WP\n${'─'.repeat(50)}`);
  console.log(`Base URL : ${BASE_URL}`);
  console.log(`Output   : ${MEDIA_DIR}`);

  _frameIdx = 0;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    await recordSearchInteraction(page);
    await recordFilterInteraction(page);
  } finally {
    await browser.close();
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`GIFs saved to: ${MEDIA_DIR}\n`);
}

run().catch((err) => {
  console.error('[gif-recorder] Error:', err.message);
  process.exit(1);
});
