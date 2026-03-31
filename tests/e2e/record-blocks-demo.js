/**
 * Playwright script to record a polished demo of the InstantSearch Gutenberg blocks.
 *
 * Run with:
 *   node tests/e2e/record-blocks-demo.js
 *
 * Requires the Docker dev environment running at localhost:8080 (./dev.sh up).
 * Output: ~/Desktop/instantsearch-blocks-demo.mp4
 */

const { chromium } = require( '@playwright/test' );
const path = require( 'path' );
const os = require( 'os' );
const fs = require( 'fs' );
const { execSync } = require( 'child_process' );

const BASE_URL = 'http://localhost:8080';
const WP_ADMIN = `${ BASE_URL }/wp-admin`;
const VIDEO_DIR = path.join( os.tmpdir(), 'isfwp-blocks-demo' );
const DESKTOP = path.join( os.homedir(), 'Desktop' );

async function sleep( ms ) {
	return new Promise( ( r ) => setTimeout( r, ms ) );
}

async function loginAsAdmin( page ) {
	await page.goto( `${ BASE_URL }/wp-login.php`, { waitUntil: 'load' } );
	await page.fill( '#user_login', 'admin' );
	await page.fill( '#user_pass', 'admin' );
	await page.click( '#wp-submit' );
	await page.waitForURL( /wp-admin/, { timeout: 30_000 } );
	await sleep( 800 );
}

async function recordDemo() {
	if ( ! fs.existsSync( VIDEO_DIR ) ) {
		fs.mkdirSync( VIDEO_DIR, { recursive: true } );
	}

	console.log( 'Launching browser (headless: false for visible recording)...' );
	const browser = await chromium.launch( { headless: false, slowMo: 60 } );
	const context = await browser.newContext( {
		viewport: { width: 1400, height: 900 },
		recordVideo: {
			dir: VIDEO_DIR,
			size: { width: 1400, height: 900 },
		},
	} );
	const page = await context.newPage();

	// ── Step 1: Login ────────────────────────────────────────
	console.log( '1. Logging in to WP Admin...' );
	await loginAsAdmin( page );

	// ── Step 2: Go to Pages > Add New ───────────────────────
	console.log( '2. Opening block editor (new page)...' );
	await page.goto( `${ WP_ADMIN }/post-new.php?post_type=page`, { waitUntil: 'load', timeout: 60_000 } );
	await sleep( 2000 );

	// Dismiss any welcome / guide dialogs that appear on first use
	const overlays = page.locator( '.components-modal__screen-overlay' );
	for ( let attempt = 0; attempt < 5; attempt++ ) {
		const visible = await overlays.first().isVisible( { timeout: 1_500 } ).catch( () => false );
		if ( ! visible ) break;
		// Try close button with various aria-labels used by Gutenberg
		for ( const label of [ 'Close', 'close', 'Dismiss' ] ) {
			const btn = overlays.first().locator( `button[aria-label="${ label }"]` );
			if ( await btn.isVisible( { timeout: 500 } ).catch( () => false ) ) {
				await btn.click();
				await sleep( 600 );
				break;
			}
		}
		// Fallback: try any button inside the modal that looks like close
		const anyClose = overlays.first().locator( 'button' ).last();
		if ( await anyClose.isVisible( { timeout: 500 } ).catch( () => false ) ) {
			await page.keyboard.press( 'Escape' );
			await sleep( 600 );
		}
	}

	// Wait for the editor canvas to be ready
	await page.locator( '.block-editor-writing-flow, .editor-styles-wrapper' ).waitFor( { state: 'visible', timeout: 30_000 } );
	await sleep( 800 );

	// Add page title
	const titleField = page.locator(
		'.editor-post-title__input, h1.wp-block[role="textbox"], [aria-label="Add title"]'
	).first();
	await titleField.click();
	await titleField.type( 'Search Page' );
	await sleep( 600 );

	// ── Step 3: Open block inserter, search "InstantSearch" ──
	console.log( '3. Opening block inserter...' );
	const inserterBtn = page.locator( 'button[aria-label="Toggle block inserter"]' );
	await inserterBtn.click();
	await sleep( 600 );

	const searchInput = page.locator(
		'input[placeholder="Search"], input[aria-label="Search for blocks and patterns"]'
	);
	await searchInput.waitFor( { state: 'visible', timeout: 5_000 } );
	await searchInput.type( 'InstantSearch', { delay: 80 } );
	await sleep( 800 );

	await page.screenshot( { path: path.join( VIDEO_DIR, 'step3-inserter.png' ) } );

	// ── Step 4: Insert Container block ──────────────────────
	console.log( '4. Inserting InstantSearch Container block...' );
	const containerOption = page
		.locator( `[role="option"]:has-text("InstantSearch"), .block-editor-block-types-list__item-title:has-text("InstantSearch")` )
		.first();
	await containerOption.click();
	await sleep( 1500 );

	// ── Step 5: Show the default template (Search Box, Stats, Hits, Pagination) ──
	console.log( '5. Container inserted with default child blocks...' );
	await page.screenshot( { path: path.join( VIDEO_DIR, 'step5-container.png' ) } );
	await sleep( 1000 );

	// ── Step 6: Open inserter again, add a Refinement List ──
	console.log( '6. Adding Refinement List child block...' );
	await inserterBtn.click();
	await sleep( 400 );
	await searchInput.fill( '' );
	await searchInput.type( 'Refinement List', { delay: 80 } );
	await sleep( 700 );
	const refinementOption = page
		.locator( `[role="option"]:has-text("Refinement List"), .block-editor-block-types-list__item-title:has-text("Refinement List")` )
		.first();
	await refinementOption.click();
	await sleep( 1000 );

	// ── Step 7: Configure the container — set index name ────
	console.log( '7. Configuring container (index name)...' );
	// Click the container block to select it
	const containerBlock = page.locator( '.isfwp-block-instance' ).first();
	await containerBlock.click();
	await sleep( 600 );

	// The inspector should already show the Index panel
	const sidebar = page.locator( '.interface-complementary-area' );
	const manualIndexInput = sidebar.locator( 'input[placeholder*="index"], input[placeholder*="e.g."]' ).first();
	if ( await manualIndexInput.isVisible( { timeout: 3_000 } ).catch( () => false ) ) {
		await manualIndexInput.click();
		await manualIndexInput.fill( 'wp_posts' );
		await sleep( 600 );
	}
	await page.screenshot( { path: path.join( VIDEO_DIR, 'step7-configured.png' ) } );
	await sleep( 800 );

	// ── Step 8: Open List View to show hierarchy ─────────────
	console.log( '8. Showing block hierarchy in List View...' );
	const listViewBtn = page
		.locator( 'button[aria-label="Document Overview"], button[aria-label="List View"]' )
		.first();
	await listViewBtn.click();
	await sleep( 1000 );
	await page.screenshot( { path: path.join( VIDEO_DIR, 'step8-list-view.png' ) } );
	await sleep( 800 );
	// Close list view
	await listViewBtn.click();
	await sleep( 400 );

	// ── Step 9: Publish the page ─────────────────────────────
	console.log( '9. Publishing the page...' );
	const publishBtn = page
		.locator( 'button.editor-post-publish-panel__toggle, button:has-text("Publish")' )
		.first();
	await publishBtn.click();
	await sleep( 600 );
	const confirmPublish = page.locator( 'button.editor-post-publish-button:has-text("Publish"), .editor-post-publish-panel button:has-text("Publish")' );
	if ( await confirmPublish.isVisible( { timeout: 3_000 } ).catch( () => false ) ) {
		await confirmPublish.click();
	}
	await sleep( 2000 );
	await page.screenshot( { path: path.join( VIDEO_DIR, 'step9-published.png' ) } );

	// ── Step 10: Navigate to frontend ───────────────────────
	console.log( '10. Switching to frontend preview...' );
	const viewPageLink = page
		.locator( 'a:has-text("View Page"), a:has-text("View page")' )
		.first();
	const href = await viewPageLink.getAttribute( 'href' ).catch( () => null );
	if ( href ) {
		await page.goto( href, { waitUntil: 'load' } );
		await sleep( 2000 );
		await page.screenshot( { path: path.join( VIDEO_DIR, 'step10-frontend.png' ) } );

		// ── Step 11: Interact with the search interface ──────
		console.log( '11. Interacting with search widgets...' );
		const searchInput2 = page.locator( '.ais-SearchBox-input, .wp-block-instantsearch-for-wp-search-box input' ).first();
		if ( await searchInput2.isVisible( { timeout: 5_000 } ).catch( () => false ) ) {
			await searchInput2.click();
			await sleep( 400 );
			await searchInput2.type( 'WordPress', { delay: 100 } );
			await sleep( 2000 );
			await page.screenshot( { path: path.join( VIDEO_DIR, 'step11-search.png' ) } );
		} else {
			console.log( 'Search input not visible on frontend — skipping interaction step.' );
		}
	} else {
		console.log( 'Could not find View Page link — skipping frontend step.' );
	}

	await sleep( 1500 );

	// ── Save video ───────────────────────────────────────────
	console.log( 'Saving video...' );
	const videoPath = await page.video()?.path();
	await context.close();
	await browser.close();

	if ( ! videoPath ) {
		console.log( 'No video path returned — check tmp dir for .webm files.' );
		return;
	}

	const webmDest = path.join( DESKTOP, 'instantsearch-blocks-demo.webm' );
	const mp4Dest = path.join( DESKTOP, 'instantsearch-blocks-demo.mp4' );
	fs.copyFileSync( videoPath, webmDest );
	console.log( `WebM saved: ${ webmDest }` );

	// Try ffmpeg conversion
	try {
		execSync( `ffmpeg -y -i "${ webmDest }" -c:v libx264 -preset fast -crf 22 "${ mp4Dest }"`, {
			stdio: 'inherit',
		} );
		fs.unlinkSync( webmDest );
		console.log( `\nMP4 saved: ${ mp4Dest }` );
	} catch {
		console.log( `\nffmpeg not found or conversion failed — WebM is at: ${ webmDest }` );
	}
}

recordDemo().catch( ( err ) => {
	console.error( 'Demo recording failed:', err );
	process.exit( 1 );
} );
