#!/usr/bin/env bash
# =============================================================================
# dev/setup.sh  —  Full WordPress install + demo content + plugin config
# =============================================================================
# Called by dev.sh after Docker services are healthy.
# Must be run from the repo root; all docker-compose calls use dev/docker-compose.yml.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# Prefer docker compose v2 plugin over legacy docker-compose v1 binary
# Use arrays to handle paths with spaces (e.g. "Yoko Co")
if docker compose version &>/dev/null 2>&1; then
  DC=(docker compose -f "$REPO_ROOT/dev/docker-compose.yml")
else
  DC=(docker-compose -f "$REPO_ROOT/dev/docker-compose.yml")
fi
WP=("${DC[@]}" run --rm wpcli)

# Load .env if present
if [ -f "$REPO_ROOT/.env" ]; then
  set -a; source "$REPO_ROOT/.env"; set +a
fi

WP_SITE_URL="${WP_SITE_URL:-http://instantsearch-dev.local:8080}"
WP_ADMIN_USER="${WP_ADMIN_USER:-admin}"
WP_ADMIN_PASSWORD="${WP_ADMIN_PASSWORD:-admin}"
WP_ADMIN_EMAIL="${WP_ADMIN_EMAIL:-admin@instantsearch-dev.local}"
WP_SITE_TITLE="${WP_SITE_TITLE:-InstantSearch Dev}"
SEARCH_PROVIDER="${SEARCH_PROVIDER:-typesense}"
TYPESENSE_API_KEY="${TYPESENSE_API_KEY:-dev-typesense-api-key}"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[setup]${NC} $*"; }
success() { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $*"; }

# =============================================================================
# 1. Wait for WordPress container to be ready
# =============================================================================
wait_for_wordpress() {
  info "Waiting for WordPress container to be ready..."
  local retries=30
  until "${DC[@]}" exec -T wordpress curl -sf http://localhost/wp-login.php > /dev/null 2>&1; do
    retries=$((retries - 1))
    if [ "$retries" -le 0 ]; then
      echo "ERROR: WordPress container did not become ready in time." >&2
      exit 1
    fi
    sleep 3
  done
  success "WordPress container is ready."
}

# =============================================================================
# 2. Install WordPress core
# =============================================================================
install_wordpress() {
  if "${WP[@]}" core is-installed 2>/dev/null; then
    info "WordPress is already installed — skipping core install."
    return 0
  fi

  info "Installing WordPress core..."
  "${WP[@]}" core install \
    --url="$WP_SITE_URL" \
    --title="$WP_SITE_TITLE" \
    --admin_user="$WP_ADMIN_USER" \
    --admin_password="$WP_ADMIN_PASSWORD" \
    --admin_email="$WP_ADMIN_EMAIL" \
    --skip-email

  success "WordPress installed."

  # General settings
  "${WP[@]}" option update blogdescription "Powered by InstantSearch for WP"
  "${WP[@]}" option update timezone_string "America/New_York"
  "${WP[@]}" option update date_format "F j, Y"
  "${WP[@]}" option update permalink_structure "/%postname%/"
  "${WP[@]}" rewrite flush
}

# =============================================================================
# 3. Activate the plugin
# =============================================================================
activate_plugin() {
  info "Activating instantsearch-for-wp plugin..."
  "${WP[@]}" plugin activate instantsearch-for-wp 2>/dev/null || warn "Plugin activation returned non-zero (may already be active)"
  success "Plugin activated."
}

# =============================================================================
# 4. Install & activate a lightweight theme
# =============================================================================
install_theme() {
  if "${WP[@]}" theme is-installed twentytwentythree 2>/dev/null; then
    info "Theme twentytwentythree already installed."
  else
    info "Installing Twenty Twenty-Three theme..."
    "${WP[@]}" theme install twentytwentythree
  fi
  "${WP[@]}" theme activate twentytwentythree
  success "Theme activated: twentytwentythree"
}

# =============================================================================
# 5. Import demo content
# =============================================================================
import_demo_content() {
  # Check if demo content already exists
  local post_count
  post_count=$("${WP[@]}" post list --post_status=publish --format=count 2>/dev/null || echo "0")
  if [ "$post_count" -gt 5 ]; then
    info "Demo content already present ($post_count posts) — skipping import."
    return 0
  fi

  info "Importing demo content..."

  # ── Categories ─────────────────────────────────────────────
  "${WP[@]}" term create category "Search & Discovery"   --slug=search-discovery   --description="Articles about search technology and UX"
  "${WP[@]}" term create category "WordPress Development" --slug=wordpress-dev      --description="WordPress tips and best practices"
  "${WP[@]}" term create category "Tutorials"             --slug=tutorials          --description="Step-by-step guides and how-tos"
  "${WP[@]}" term create category "Product Updates"       --slug=product-updates    --description="Plugin news and release notes"
  "${WP[@]}" term create category "Performance"           --slug=performance        --description="Speed and optimization topics"

  # ── Tags ───────────────────────────────────────────────────
  for tag in algolia typesense instantsearch gutenberg search-ux facets relevance indexing woocommerce php javascript react; do
    "${WP[@]}" term create post_tag "$tag" --slug="$tag" 2>/dev/null || true
  done

  # ── Pages ──────────────────────────────────────────────────
  "${WP[@]}" post create \
    --post_type=page \
    --post_title="Search" \
    --post_name=search \
    --post_status=publish \
    --post_content="<!-- wp:paragraph --><p>Use the search bar below to explore all content on this site. Results update in real-time as you type.</p><!-- /wp:paragraph -->"

  "${WP[@]}" post create \
    --post_type=page \
    --post_title="About" \
    --post_name=about \
    --post_status=publish \
    --post_content="<!-- wp:paragraph --><p>This is the InstantSearch for WP demo environment. It showcases the plugin's full-text search capabilities powered by Typesense and Algolia.</p><!-- /wp:paragraph -->"

  # Set static front page
  local about_id
  about_id=$("${WP[@]}" post list --post_type=page --post_status=publish --name=about --field=ID --format=ids 2>/dev/null | head -1)
  "${WP[@]}" option update page_on_front "$about_id" 2>/dev/null || true
  "${WP[@]}" option update show_on_front page 2>/dev/null || true

  # ── Blog posts ─────────────────────────────────────────────
  # Helper: create a post and assign category + tags
  create_post() {
    local title="$1" slug="$2" category="$3" tags="$4" content="$5"
    local post_id
    post_id=$("${WP[@]}" post create \
      --post_title="$title" \
      --post_name="$slug" \
      --post_status=publish \
      --post_content="$content" \
      --porcelain 2>/dev/null)
    "${WP[@]}" post term set "$post_id" category "$category" 2>/dev/null || true
    IFS=',' read -ra tag_arr <<< "$tags"
    for t in "${tag_arr[@]}"; do
      "${WP[@]}" post term add "$post_id" post_tag "$(echo "$t" | xargs)" 2>/dev/null || true
    done
  }

  create_post \
    "Getting Started with InstantSearch for WP" \
    "getting-started-instantsearch" \
    "tutorials" \
    "instantsearch,algolia,typesense" \
    "<!-- wp:paragraph --><p>InstantSearch for WP is a provider-agnostic plugin that brings the power of InstantSearch.js to your WordPress site. Whether you're using Algolia, Typesense, or another backend, this guide walks you through installation, configuration, and your first live search widget.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Installation</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Upload the plugin, activate it from the WordPress admin, then navigate to <strong>InstantSearch → Settings</strong> to connect your search provider.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Quick Configuration</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Enter your API credentials, choose which post types to index, and click <em>Save &amp; Index</em>. Within seconds, your content is searchable.</p><!-- /wp:paragraph -->"

  create_post \
    "Algolia vs Typesense: Choosing the Right Search Backend" \
    "algolia-vs-typesense" \
    "search-discovery" \
    "algolia,typesense,relevance" \
    "<!-- wp:paragraph --><p>Both Algolia and Typesense deliver blazing-fast, typo-tolerant search — but they differ in hosting model, pricing, and feature set. This post compares them across the dimensions that matter most for WordPress sites.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Algolia</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Algolia is a managed SaaS platform. It offers an exceptionally polished dashboard, advanced analytics, A/B testing for relevance, and 99.999% uptime SLA. Pricing is usage-based.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Typesense</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Typesense is open-source and can be self-hosted or run via Typesense Cloud. It's extremely fast, has excellent typo tolerance, and is free if you self-host. Ideal for cost-sensitive or privacy-conscious teams.</p><!-- /wp:paragraph -->"

  create_post \
    "Building Faceted Search with InstantSearch.js Widgets" \
    "faceted-search-instantsearch" \
    "tutorials" \
    "instantsearch,facets,search-ux" \
    "<!-- wp:paragraph --><p>Faceted navigation — the ability to filter results by category, tag, author, or any custom attribute — dramatically improves search UX. InstantSearch.js provides a rich set of widgets to build this experience with minimal code.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>RefinementList Widget</h2><!-- /wp:heading --><!-- wp:paragraph --><p>The <code>refinementList</code> widget renders a list of filter checkboxes based on an attribute in your index. Add it to your search page and point it at a field like <code>categories</code> or <code>tags</code>.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>HierarchicalMenu Widget</h2><!-- /wp:heading --><!-- wp:paragraph --><p>For taxonomy hierarchies, the <code>hierarchicalMenu</code> widget displays parent → child relationships, letting users drill down through nested categories.</p><!-- /wp:paragraph -->"

  create_post \
    "How Search Indexing Works in WordPress" \
    "search-indexing-wordpress" \
    "search-discovery" \
    "indexing,algolia,typesense,php" \
    "<!-- wp:paragraph --><p>When you publish or update a post in WordPress, InstantSearch for WP automatically schedules an indexing job via WooCommerce Action Scheduler. This ensures your search index is always in sync without impacting page-load performance.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>The Indexing Pipeline</h2><!-- /wp:heading --><!-- wp:paragraph --><p>1. WordPress fires the <code>save_post</code> hook. 2. The plugin adds a background action to the queue. 3. Action Scheduler processes the job asynchronously. 4. Post content is chunked, transformed, and pushed to the search provider.</p><!-- /wp:paragraph -->"

  create_post \
    "Search UX Best Practices for WordPress Sites" \
    "search-ux-best-practices" \
    "search-discovery" \
    "search-ux,instantsearch,relevance" \
    "<!-- wp:paragraph --><p>Great search UX is invisible — users find what they need without thinking about the mechanics. Here are the key principles that separate good search from great search.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Instant Results</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Results should appear as the user types, with debouncing to avoid excessive API calls. Aim for sub-200ms response times.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Typo Tolerance</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Users make typos. Your search backend should handle one or two character errors gracefully, especially for longer words.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Empty State Handling</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Show helpful suggestions when no results are found: check spelling, try broader terms, or browse popular categories.</p><!-- /wp:paragraph -->"

  create_post \
    "WooCommerce Product Search with InstantSearch" \
    "woocommerce-product-search" \
    "tutorials" \
    "woocommerce,instantsearch,search-ux" \
    "<!-- wp:paragraph --><p>E-commerce search has higher stakes than blog search. Shoppers who can't find products leave — and that means lost revenue. This guide shows how to configure InstantSearch for WP to power WooCommerce product search.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Indexing Products</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Enable the <code>product</code> post type in your index settings. You can include custom fields like <code>_price</code>, <code>_sku</code>, and <code>_stock_status</code> to enable price and availability filtering.</p><!-- /wp:paragraph -->"

  create_post \
    "Improving WordPress Search Relevance" \
    "improving-search-relevance" \
    "performance" \
    "relevance,algolia,typesense,indexing" \
    "<!-- wp:paragraph --><p>Relevance tuning is the art of making sure the most useful results appear first. Both Algolia and Typesense give you powerful tools to control ranking — here's how to use them effectively.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Attribute Weights</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Title matches should outweigh body text matches. Configure your index to weight the <code>post_title</code> field higher than <code>post_content</code> for more intuitive results.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Custom Ranking</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Use post date, view count, or a custom relevance score as a secondary sort criterion to surface fresh or popular content.</p><!-- /wp:paragraph -->"

  create_post \
    "Gutenberg Blocks for Search: A Developer's Guide" \
    "gutenberg-blocks-for-search" \
    "wordpress-dev" \
    "gutenberg,javascript,react,instantsearch" \
    "<!-- wp:paragraph --><p>InstantSearch for WP ships as a collection of Gutenberg blocks that wrap InstantSearch.js widgets. This architecture means editors can assemble search interfaces visually in the block editor without writing code.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Block Architecture</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Each block is defined in <code>block.json</code> with a React <code>edit</code> component for the editor experience and a frontend <code>view.js</code> that initialises the InstantSearch.js widget.</p><!-- /wp:paragraph -->"

  create_post \
    "Real-Time Search Performance Optimisation" \
    "real-time-search-performance" \
    "performance" \
    "instantsearch,search-ux,javascript" \
    "<!-- wp:paragraph --><p>InstantSearch delivers results as users type, which means every keystroke can trigger a network request. Here's how to keep your search interface snappy at scale.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Debouncing</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Wrap your search input with a 200-300ms debounce to batch rapid keystrokes into single API calls. InstantSearch.js handles this automatically via the <code>queryHook</code> option.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Caching</h2><!-- /wp:heading --><!-- wp:paragraph --><p>InstantSearch.js includes a built-in cache that stores recent query results in memory, making back-navigation instantaneous.</p><!-- /wp:paragraph -->"

  create_post \
    "Setting Up Custom Post Types for Search" \
    "custom-post-types-search" \
    "wordpress-dev" \
    "php,indexing,wordpress-dev" \
    "<!-- wp:paragraph --><p>WordPress Custom Post Types (CPTs) extend the CMS beyond posts and pages. If your site has CPTs — portfolios, team members, events, recipes — you probably want them searchable.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Enabling CPT Indexing</h2><!-- /wp:heading --><!-- wp:paragraph --><p>In the plugin settings, navigate to <strong>Index Configuration</strong> and toggle on the post types you want to include. Each enabled type will appear in search results automatically.</p><!-- /wp:paragraph -->"

  create_post \
    "Search Analytics: Understanding What Users Look For" \
    "search-analytics" \
    "search-discovery" \
    "algolia,relevance,search-ux" \
    "<!-- wp:paragraph --><p>Search analytics reveal a goldmine of intent data. Knowing what users search for — and what they don't find — lets you improve content strategy, fix gaps, and tune relevance.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Zero-Result Queries</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Zero-result searches are high-priority signals. They indicate content your users expect to find but can't. Export these queries monthly and create content or synonyms to address them.</p><!-- /wp:paragraph -->"

  create_post \
    "Multilingual Search in WordPress" \
    "multilingual-search" \
    "wordpress-dev" \
    "indexing,search-ux,php" \
    "<!-- wp:paragraph --><p>Running a multilingual WordPress site with WPML or Polylang adds complexity to search indexing. You need each language's content in a separate index (or collection) for accurate results.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Per-Language Indexes</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Configure a separate InstantSearch index for each language, named with the locale suffix (e.g., <code>site_search_en</code>, <code>site_search_fr</code>). The plugin's filter hooks let you override the index name dynamically.</p><!-- /wp:paragraph -->"

  create_post \
    "Pagination Strategies for Search Results" \
    "pagination-search-results" \
    "search-discovery" \
    "instantsearch,search-ux,javascript" \
    "<!-- wp:paragraph --><p>How you paginate search results significantly affects user experience. Traditional numbered pages work, but infinite scroll and load-more patterns can feel more natural in a search context.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Infinite Scroll</h2><!-- /wp:heading --><!-- wp:paragraph --><p>InstantSearch.js provides an <code>infiniteHits</code> widget that loads more results as the user scrolls. This pattern works well for discovery-oriented searches.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Classic Pagination</h2><!-- /wp:heading --><!-- wp:paragraph --><p>The <code>pagination</code> widget renders numbered page controls. It's better for navigational searches where users want to jump to a specific page.</p><!-- /wp:paragraph -->"

  create_post \
    "Plugin Release: Version 1.1.0 — Typesense Facets Override" \
    "release-1-1-0-typesense-facets" \
    "product-updates" \
    "typesense,instantsearch" \
    "<!-- wp:paragraph --><p>Version 1.1.0 ships with a highly requested feature: the ability to override Typesense facet configuration directly from the WordPress admin. Previously, facet fields had to be defined in code; now they can be managed visually.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>What's New</h2><!-- /wp:heading --><!-- wp:paragraph --><p><strong>Facet Override UI</strong> — Configure per-index facet fields, types, and sort orders from the InstantSearch admin panel. <strong>Action Scheduler Integration</strong> — Background indexing is now more robust with retry logic and detailed logging.</p><!-- /wp:paragraph -->"

  create_post \
    "API-First Search Architecture for Headless WordPress" \
    "api-first-search-headless" \
    "wordpress-dev" \
    "php,javascript,react,instantsearch" \
    "<!-- wp:paragraph --><p>Headless WordPress (WordPress as a backend CMS, decoupled frontend) is gaining popularity. InstantSearch for WP's REST API endpoints make it easy to integrate search into any headless architecture.</p><!-- /wp:paragraph --><!-- wp:heading --><h2>Available REST Endpoints</h2><!-- /wp:heading --><!-- wp:paragraph --><p><code>GET /wp/v2/instantsearch-for-wp/v1/settings</code> — Retrieve plugin configuration. <code>POST /instantsearch-for-wp/v1/isfwp_index/{id}/run-indexer</code> — Trigger a re-index from your CI pipeline.</p><!-- /wp:paragraph -->"

  # ── Static front page: set home to About page ──────────────
  # (already done above, just confirm blog page)
  local blog_post_id
  blog_post_id=$("${WP[@]}" post create \
    --post_type=page \
    --post_title="Blog" \
    --post_name=blog \
    --post_status=publish \
    --post_content="<!-- wp:paragraph --><p>Latest articles.</p><!-- /wp:paragraph -->" \
    --porcelain 2>/dev/null)
  "${WP[@]}" option update page_for_posts "$blog_post_id" 2>/dev/null || true

  success "Demo content imported ($(
    "${WP[@]}" post list --post_status=publish --format=count 2>/dev/null
  ) posts total)."
}

# =============================================================================
# 6. Configure the plugin
# =============================================================================
configure_plugin() {
  info "Configuring plugin settings (provider: $SEARCH_PROVIDER)..."

  if [ "$SEARCH_PROVIDER" = "algolia" ] && [ -n "${ALGOLIA_APP_ID:-}" ]; then
    "${WP[@]}" option update instantsearch_for_wp_settings \
      "{\"provider\":\"algolia\",\"algolia\":{\"app_id\":\"${ALGOLIA_APP_ID}\",\"search_only_api_key\":\"${ALGOLIA_SEARCH_ONLY_API_KEY:-}\",\"admin_api_key\":\"${ALGOLIA_ADMIN_API_KEY:-}\"},\"use_as_sitesearch\":true,\"sitesearch_settings\":{\"placeholder_text\":\"Search posts, pages, and more...\",\"sidebar_position\":\"left\",\"snippet_length\":120}}" \
      --format=json
    success "Plugin configured with Algolia provider."
  else
    # Default: Typesense (local Docker service)
    "${WP[@]}" option update instantsearch_for_wp_settings \
      "{\"provider\":\"typesense\",\"algolia\":{\"app_id\":\"\",\"search_only_api_key\":\"\",\"admin_api_key\":\"\"},\"use_as_sitesearch\":true,\"sitesearch_settings\":{\"placeholder_text\":\"Search posts, pages, and more...\",\"sidebar_position\":\"left\",\"snippet_length\":120}}" \
      --format=json
    success "Plugin configured with Typesense provider (local Docker)."
  fi

  # Create a search index post (CPT: isfwp_index) if none exists
  local index_count
  index_count=$("${WP[@]}" post list --post_type=isfwp_index --format=count 2>/dev/null || echo "0")
  if [ "$index_count" -eq 0 ]; then
    info "Creating default search index..."
    "${WP[@]}" post create \
      --post_type=isfwp_index \
      --post_title="Main Search Index" \
      --post_name=main-search \
      --post_status=publish \
      --post_content="" 2>/dev/null || warn "Could not create index CPT (plugin may not be fully initialised yet)"
  fi

  success "Plugin configuration complete."
}

# =============================================================================
# 7. Add /etc/hosts entry (if running on macOS/Linux host)
# =============================================================================
ensure_hosts_entry() {
  local host_entry="127.0.0.1 instantsearch-dev.local"
  if grep -q "instantsearch-dev.local" /etc/hosts 2>/dev/null; then
    info "/etc/hosts already has instantsearch-dev.local"
    return 0
  fi

  warn "Adding instantsearch-dev.local to /etc/hosts (requires sudo)..."
  echo "$host_entry" | sudo tee -a /etc/hosts > /dev/null && \
    success "Added: $host_entry" || \
    warn "Could not update /etc/hosts — access the site at http://localhost:8080 instead."
}

# =============================================================================
# Main
# =============================================================================
main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   InstantSearch for WP — Dev Environment Setup   ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""

  wait_for_wordpress
  install_wordpress
  activate_plugin
  install_theme
  import_demo_content
  configure_plugin

  # Only run hosts setup when called from dev.sh (not in CI)
  if [ "${CI:-}" != "true" ] && [ "${SKIP_HOSTS:-}" != "true" ]; then
    ensure_hosts_entry
  fi

  echo ""
  success "╔══════════════════════════════════════════════════════╗"
  success "║  Setup complete!                                      ║"
  success "╠══════════════════════════════════════════════════════╣"
  success "║  Site:   http://instantsearch-dev.local:8080          ║"
  success "║  Admin:  http://instantsearch-dev.local:8080/wp-admin ║"
  success "║  Login:  $WP_ADMIN_USER / $WP_ADMIN_PASSWORD          ║"
  if [ "$SEARCH_PROVIDER" = "algolia" ] && [ -n "${ALGOLIA_APP_ID:-}" ]; then
  success "║  Search: Algolia ($ALGOLIA_APP_ID)              ║"
  else
  success "║  Search: Typesense (local Docker :8108)               ║"
  fi
  success "╚══════════════════════════════════════════════════════╝"
  echo ""
}

main "$@"
