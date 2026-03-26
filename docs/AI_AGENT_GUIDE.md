# AI Agent Guide — InstantSearch for WP Dev Environment

This document tells AI agents exactly how to operate the dev environment, run tests,
capture screenshots, record GIFs, and produce visual PR documentation autonomously.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Starting the Dev Server](#starting-the-dev-server)
3. [Verifying the Environment is Ready](#verifying-the-environment-is-ready)
4. [Accessing WordPress Admin and Frontend](#accessing-wordpress-admin-and-frontend)
5. [Running Tests](#running-tests)
6. [Capturing Screenshots](#capturing-screenshots)
7. [Recording Interaction GIFs](#recording-interaction-gifs)
8. [Generating Video Walkthroughs](#generating-video-walkthroughs)
9. [Before/After Comparisons for PR Documentation](#beforeafter-comparisons-for-pr-documentation)
10. [Common Troubleshooting](#common-troubleshooting)
11. [Environment Architecture](#environment-architecture)

---

## Prerequisites

Before using the dev environment, ensure the following are available on the host machine:

| Tool | Version | Check |
|------|---------|-------|
| Docker | 24+ | `docker --version` |
| Docker Compose | v2 plugin | `docker compose version` |
| Node.js | 20.x (see `.nvmrc`) | `node --version` |
| npm | 10+ | `npm --version` |

The `.env` file must exist at the repo root. Copy from the template if not present:

```bash
cp .env.example .env
# Then edit .env with your credentials (Algolia keys, or leave defaults for Typesense)
```

---

## Starting the Dev Server

### One-Command Setup

```bash
./dev.sh up
```

**What this does:**

1. Loads environment variables from `.env`
2. Ensures `/etc/hosts` contains `127.0.0.1 instantsearch-dev.local` (may prompt for sudo)
3. Starts Docker Compose services: MySQL, Typesense, WordPress, WP-CLI
4. Waits for all services to be healthy (can take 30–60 seconds on first run)
5. Runs `dev/setup.sh` which:
   - Installs WordPress core (skipped if already installed)
   - Activates the plugin
   - Installs Twenty Twenty-Three theme
   - Imports ~15 demo blog posts with categories and tags
   - Configures plugin settings (provider, site search, snippet length)

**Expected output when ready:**

```
╔══════════════════════════════════════════════════════╗
║  Setup complete!                                      ║
╠══════════════════════════════════════════════════════╣
║  Site:   http://instantsearch-dev.local:8080          ║
║  Admin:  http://instantsearch-dev.local:8080/wp-admin ║
║  Login:  admin / admin                                ║
║  Search: Typesense (local Docker :8108)               ║
╚══════════════════════════════════════════════════════╝
```

**First run takes longer** (~2–3 minutes) because Docker pulls images and WordPress installs. Subsequent runs start in ~10 seconds.

---

## Verifying the Environment is Ready

### Check Service Health

```bash
docker-compose -f dev/docker-compose.yml ps
```

All services should show `healthy` or `running`:

```
NAME               STATUS              PORTS
focused-dubinsky-db-1          healthy   3306/tcp
focused-dubinsky-typesense-1   running   0.0.0.0:8108->8108/tcp
focused-dubinsky-wordpress-1   healthy   0.0.0.0:8080->80/tcp
```

### Check WordPress is Responding

```bash
curl -s -o /dev/null -w "%{http_code}" http://instantsearch-dev.local:8080
# Expected: 200
```

### Check Typesense is Responding

```bash
curl http://localhost:8108/health
# Expected: {"ok":true}
```

### Check Plugin is Active

```bash
docker-compose -f dev/docker-compose.yml run --rm wpcli plugin list --status=active
# Should include: instantsearch-for-wp
```

---

## Accessing WordPress Admin and Frontend

### Frontend (Site Search)

- **Homepage**: `http://instantsearch-dev.local:8080`
- **Search Page**: `http://instantsearch-dev.local:8080/search`
- **Blog**: `http://instantsearch-dev.local:8080/blog`

### WordPress Admin

- **Dashboard**: `http://instantsearch-dev.local:8080/wp-admin/`
- **Plugin Settings**: `http://instantsearch-dev.local:8080/wp-admin/admin.php?page=instantsearch-for-wp`
- **Search Indexes**: `http://instantsearch-dev.local:8080/wp-admin/edit.php?post_type=isfwp_index`

**Admin credentials** (set in `.env`):
- Username: `admin` (or `$WP_ADMIN_USER`)
- Password: `admin` (or `$WP_ADMIN_PASSWORD`)

### REST API

```bash
# Get plugin settings
curl http://instantsearch-dev.local:8080/wp-json/instantsearch-for-wp/v1/settings \
  -H "Content-Type: application/json"

# Get available indexing parameters
curl http://instantsearch-dev.local:8080/wp-json/instantsearch-for-wp/v1/available-indexing-parameters
```

---

## Running Tests

### Full E2E Test Suite

```bash
./dev.sh test
```

This installs Playwright (if not already installed) and runs all specs.

### Run Specific Test File

```bash
cd tests/e2e
npm install
npx playwright test specs/search.spec.js
```

### Run with Browser Visible (Headed Mode)

```bash
cd tests/e2e
npm run test:headed
```

### Run with Playwright UI (Interactive Debugging)

```bash
cd tests/e2e
npm run test:ui
```

### View Test Report

```bash
cd tests/e2e
npm run test:report
# Opens HTML report in browser
```

### Expected Test Output

```
Running 3 test files...

  ✓ search.spec.js > Search box > search trigger is visible (1.2s)
  ✓ search.spec.js > Search box > search input accepts keyboard input (1.8s)
  ✓ search.spec.js > Search results > hits container renders in the DOM (0.9s)
  ~ filters.spec.js > Facets > clicking a refinement filter ... (skipped: facets not configured)
  ✓ pagination.spec.js > Pagination > stats widget shows result count (1.1s)
  ...

  8 passed, 4 skipped
```

Skipped tests are normal when facets or pagination aren't configured yet. They self-skip with a message explaining what's needed.

### CI Environment Variables

```bash
CI=true ./dev.sh test   # Enables retries and CI-friendly output
```

---

## Capturing Screenshots

### Capture All Key States

```bash
./dev.sh screenshot
```

Screenshots are saved to `docs/media/`:

| File | Description |
|------|-------------|
| `homepage.png` | WordPress homepage |
| `search-overlay-open.png` | Search overlay opened |
| `search-query-wordpress.png` | Results for "wordpress" |
| `search-query-plugin.png` | Results for "search plugin" |
| `search-no-results.png` | Empty state / no results |
| `search-page-empty.png` | Dedicated search page, no query |
| `search-page-results.png` | Dedicated search page with results |
| `facets-visible.png` | Search with facets sidebar |
| `facets-applied.png` | After clicking a facet |
| `admin-settings.png` | Plugin settings in wp-admin |
| `admin-index-list.png` | Index list in wp-admin |
| `search-page-wide.png` | Search page at 1440px |
| `search-mobile.png` | Search page on mobile |

### Capture a Single Custom Screenshot

Using the Playwright CLI directly:

```bash
cd tests/e2e && npx playwright screenshot \
  --browser chromium \
  "http://instantsearch-dev.local:8080/search" \
  ../../docs/media/my-custom-screenshot.png
```

Or programmatically in a script:

```javascript
const { chromium } = require('@playwright/test');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://instantsearch-dev.local:8080/search');
await page.locator('.ais-SearchBox-input').fill('wordpress');
await page.waitForTimeout(800);
await page.screenshot({ path: 'docs/media/custom-state.png' });
await browser.close();
```

---

## Recording Interaction GIFs

```bash
./dev.sh gif
```

**What gets recorded:**

| File | Description |
|------|-------------|
| `search-interaction.gif` | Types "wordpress search" character-by-character → results appear |
| `filter-interaction.gif` | Types a query → hovers over facet checkbox → clicks → results filter |

### Manual GIF Recording

```bash
cd tests/e2e && npm run gif
```

### Requirements for GIF Recording

The GIF recorder uses `gifencoder` and `canvas`. Install them if needed:

```bash
cd tests/e2e && npm install
# canvas may require system deps on macOS:
# brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
```

If `canvas` installation fails, the recorder falls back to saving individual frame PNGs, which can be assembled with an external tool (e.g., `ffmpeg -framerate 8 -i frame_%04d.png output.gif`).

---

## Generating Video Walkthroughs

Playwright can record video automatically during test runs.

### Record Video of All Tests

```bash
cd tests/e2e
PWVIDEO=1 npx playwright test --video=on
# Videos saved to: test-results/
```

### Record a Custom Video Walkthrough

```javascript
// tests/e2e/helpers/video-walkthrough.js
const { chromium } = require('@playwright/test');

const browser = await chromium.launch();
const context = await browser.newContext({
  recordVideo: {
    dir: '../../docs/media/',
    size: { width: 1280, height: 800 },
  },
});
const page = await context.newPage();

await page.goto('http://instantsearch-dev.local:8080');
// ... interact with the page ...
await context.close(); // This saves the video
await browser.close();
```

Run it:

```bash
node tests/e2e/helpers/video-walkthrough.js
# Video saved to docs/media/ as a .webm file
```

### Convert WebM to GIF (for GitHub PRs)

```bash
# Using ffmpeg:
ffmpeg -i docs/media/video.webm \
  -vf "fps=10,scale=1280:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 docs/media/walkthrough.gif
```

---

## Before/After Comparisons for PR Documentation

Follow this workflow to produce visual before/after evidence for a PR:

### Step 1 — Capture "Before" Screenshots

```bash
# Checkout the base branch (or stash changes)
git stash  # or: git checkout main

# Restart dev environment to use the old code
./dev.sh reset

# Capture before state
./dev.sh screenshot

# Rename before screenshots
for f in docs/media/*.png; do
  mv "$f" "${f%.png}-before.png"
done
```

### Step 2 — Apply Changes

```bash
git stash pop  # or: git checkout feature/your-branch
```

### Step 3 — Capture "After" Screenshots

```bash
# The dev environment will pick up code changes automatically
# (the plugin is volume-mounted, no rebuild needed for PHP/JS changes)
# For JS changes, rebuild first:
npm run build

./dev.sh screenshot

# Rename after screenshots
for f in docs/media/*.png; do
  [[ "$f" != *-before.png ]] && mv "$f" "${f%.png}-after.png"
done
```

### Step 4 — Embed in PR Description

```markdown
## Visual Changes

### Search Results Page

| Before | After |
|--------|-------|
| ![before](docs/media/search-page-results-before.png) | ![after](docs/media/search-page-results-after.png) |

### Search Interaction

![interaction gif](docs/media/search-interaction.gif)
```

---

## Common Troubleshooting

### "Cannot reach WordPress at http://instantsearch-dev.local:8080"

1. Check Docker is running: `docker ps`
2. Check containers are healthy: `docker-compose -f dev/docker-compose.yml ps`
3. Check /etc/hosts: `cat /etc/hosts | grep instantsearch`
4. If missing, add manually: `echo "127.0.0.1 instantsearch-dev.local" | sudo tee -a /etc/hosts`

### WordPress returns 500 error

```bash
# Check WordPress error log
./dev.sh logs
# or:
docker-compose -f dev/docker-compose.yml exec wordpress tail -f /var/www/html/wp-content/debug.log
```

### Plugin not activated

```bash
docker-compose -f dev/docker-compose.yml run --rm wpcli plugin activate instantsearch-for-wp
```

### Demo content not imported / need a fresh start

```bash
./dev.sh reset
```

This wipes all Docker volumes and reimports fresh content.

### Playwright tests fail with "browser not found"

```bash
cd tests/e2e && npx playwright install chromium
```

### Typesense returns 401 Unauthorized

Check that `TYPESENSE_API_KEY` in `.env` matches the key in `docker-compose.yml`.
Default for local dev: `dev-typesense-api-key`

### Port 8080 already in use

Edit `dev/docker-compose.yml` and change the WordPress port mapping:
```yaml
ports:
  - "8081:80"   # Change 8080 to 8081
```
Then update `WP_SITE_URL` in `.env` to `http://instantsearch-dev.local:8081`.

### MySQL won't start / data corruption

```bash
./dev.sh reset   # Wipes mysql_data volume and starts fresh
```

### WP-CLI commands time out

The WP-CLI container runs against the WordPress volume. If WordPress isn't fully started, WP-CLI will fail. Wait 30 seconds after `./dev.sh up` before running manual WP-CLI commands.

```bash
docker-compose -f dev/docker-compose.yml run --rm wpcli core is-installed
```

---

## Environment Architecture

```
Host Machine
├── localhost:8080  → WordPress (Apache + PHP 8.2)
├── localhost:8108  → Typesense search engine
│
Docker Network: focused-dubinsky_default
├── wordpress   — wordpress:php8.2-apache
│   └── /var/www/html/wp-content/plugins/instantsearch-for-wp  → (volume-mounted from repo)
├── db          — mysql:8.0
├── typesense   — typesense/typesense:28.0.0
└── wpcli       — wordpress:cli-php8.2 (ephemeral, used by dev.sh)

Volumes:
├── mysql_data       — MySQL database files
├── typesense_data   — Typesense data directory
├── wp_core          — WordPress core files (persisted between restarts)
└── wp_uploads       — WordPress media uploads
```

### Code Changes & Hot Reload

- **PHP changes** — Take effect immediately (volume-mounted, no rebuild needed)
- **JS/CSS changes** — Rebuild required: `npm run build` (then hard refresh browser)
- **Settings changes** — Use wp-admin or re-run `./dev.sh reset` for full reconfiguration

---

*This guide is maintained alongside the dev environment. Update it when adding new commands, changing URLs, or modifying the Docker setup.*
