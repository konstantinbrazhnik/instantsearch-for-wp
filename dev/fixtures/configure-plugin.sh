#!/usr/bin/env bash
# =============================================================================
# dev/fixtures/configure-plugin.sh
# =============================================================================
# Reconfigures plugin settings in a running dev environment.
# Useful after changing .env credentials without a full reset.
#
# Usage (from repo root):
#   docker-compose -f dev/docker-compose.yml run --rm wpcli \
#     bash /var/www/html/wp-content/plugins/instantsearch-for-wp/dev/fixtures/configure-plugin.sh
# =============================================================================

set -euo pipefail

PLUGIN_PATH="/var/www/html/wp-content/plugins/instantsearch-for-wp"

# Load .env from plugin directory if present
if [ -f "$PLUGIN_PATH/.env" ]; then
  set -a; source "$PLUGIN_PATH/.env"; set +a
fi

SEARCH_PROVIDER="${SEARCH_PROVIDER:-typesense}"
ALGOLIA_APP_ID="${ALGOLIA_APP_ID:-}"
ALGOLIA_SEARCH_ONLY_API_KEY="${ALGOLIA_SEARCH_ONLY_API_KEY:-}"
ALGOLIA_ADMIN_API_KEY="${ALGOLIA_ADMIN_API_KEY:-}"
TYPESENSE_API_KEY="${TYPESENSE_API_KEY:-dev-typesense-api-key}"

echo "[configure-plugin] Search provider: $SEARCH_PROVIDER"

if [ "$SEARCH_PROVIDER" = "algolia" ] && [ -n "$ALGOLIA_APP_ID" ]; then
  SETTINGS=$(cat <<JSON
{
  "provider": "algolia",
  "algolia": {
    "app_id": "$ALGOLIA_APP_ID",
    "search_only_api_key": "$ALGOLIA_SEARCH_ONLY_API_KEY",
    "admin_api_key": "$ALGOLIA_ADMIN_API_KEY"
  },
  "use_as_sitesearch": true,
  "sitesearch_settings": {
    "placeholder_text": "Search posts, pages, and more...",
    "sidebar_position": "left",
    "snippet_length": 120
  }
}
JSON
)
else
  SETTINGS=$(cat <<JSON
{
  "provider": "typesense",
  "algolia": {
    "app_id": "",
    "search_only_api_key": "",
    "admin_api_key": ""
  },
  "use_as_sitesearch": true,
  "sitesearch_settings": {
    "placeholder_text": "Search posts, pages, and more...",
    "sidebar_position": "left",
    "snippet_length": 120
  }
}
JSON
)
fi

wp option update instantsearch_for_wp_settings "$SETTINGS" --format=json --path=/var/www/html --allow-root
echo "[configure-plugin] Settings saved."

# Flush rewrite rules
wp rewrite flush --path=/var/www/html --allow-root
echo "[configure-plugin] Rewrite rules flushed."

# Flush object cache
wp cache flush --path=/var/www/html --allow-root 2>/dev/null || true

echo "[configure-plugin] Done."
