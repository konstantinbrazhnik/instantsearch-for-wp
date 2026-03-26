#!/usr/bin/env bash
# =============================================================================
# dev.sh  —  InstantSearch for WP local development entry point
# =============================================================================
# Usage:
#   ./dev.sh up         Start everything (Docker + WordPress + demo content)
#   ./dev.sh down       Stop all containers
#   ./dev.sh test       Run Playwright E2E tests
#   ./dev.sh screenshot Capture key plugin state screenshots → docs/media/
#   ./dev.sh gif        Record interaction GIFs → docs/media/
#   ./dev.sh reset      Wipe volumes and reimport fresh content
#   ./dev.sh logs       Tail WordPress + MySQL logs
#   ./dev.sh wpcli ...  Run any WP-CLI command (e.g. ./dev.sh wpcli post list)
#   ./dev.sh shell      Open a bash shell inside the WordPress container
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DC_FILE="$REPO_ROOT/dev/docker-compose.yml"
DC="docker-compose -f $DC_FILE"
E2E_DIR="$REPO_ROOT/tests/e2e"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[dev.sh]${NC} $*"; }
success() { echo -e "${GREEN}[dev.sh]${NC} $*"; }
warn()    { echo -e "${YELLOW}[dev.sh]${NC} $*"; }
error()   { echo -e "${RED}[dev.sh] ERROR:${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

# ── Load .env ─────────────────────────────────────────────────────────────────
load_env() {
  if [ -f "$REPO_ROOT/.env" ]; then
    set -a; source "$REPO_ROOT/.env"; set +a
  else
    warn ".env not found — using defaults. Copy .env.example to .env to customise."
  fi
}

# ── Check dependencies ────────────────────────────────────────────────────────
check_deps() {
  local missing=()

  command -v docker   &>/dev/null || missing+=("docker")
  command -v node     &>/dev/null || missing+=("node")
  command -v npm      &>/dev/null || missing+=("npm")

  # Prefer 'docker compose' (v2 plugin) over 'docker-compose' (v1 standalone)
  if docker compose version &>/dev/null 2>&1; then
    DC="docker compose -f $DC_FILE"
  elif command -v docker-compose &>/dev/null; then
    DC="docker-compose -f $DC_FILE"
  else
    missing+=("docker-compose (or Docker Compose v2 plugin)")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    error "Missing required tools:"
    for t in "${missing[@]}"; do
      echo -e "  ${RED}✗${NC} $t"
    done
    die "Please install the above tools and try again."
  fi
}

# ── /etc/hosts entry ──────────────────────────────────────────────────────────
ensure_hosts_entry() {
  local domain="instantsearch-dev.local"
  if grep -q "$domain" /etc/hosts 2>/dev/null; then
    return 0
  fi
  warn "Adding '$domain' to /etc/hosts (requires sudo password)..."
  echo "127.0.0.1 $domain" | sudo tee -a /etc/hosts > /dev/null \
    && success "Added: 127.0.0.1 $domain to /etc/hosts" \
    || warn "Could not update /etc/hosts. Access the site at http://localhost:8080 instead."
}

# ── Wait for a service to be healthy ─────────────────────────────────────────
wait_healthy() {
  local service="$1"
  local label="${2:-$service}"
  local retries=60

  info "Waiting for $label to be healthy..."
  until $DC ps "$service" 2>/dev/null | grep -E "(healthy|running)" &>/dev/null; do
    retries=$((retries - 1))
    [ "$retries" -le 0 ] && die "$label did not become healthy in time. Run './dev.sh logs' to diagnose."
    sleep 2
  done
  success "$label is ready."
}

# ── Print banner ──────────────────────────────────────────────────────────────
banner() {
  echo ""
  echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║        InstantSearch for WP — Dev Environment        ║${NC}"
  echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# =============================================================================
# Commands
# =============================================================================

cmd_up() {
  banner
  load_env
  check_deps
  ensure_hosts_entry

  info "Starting Docker services..."
  $DC up -d --remove-orphans

  # Wait for critical services
  wait_healthy db        "MySQL"
  wait_healthy wordpress "WordPress"

  # Run WordPress setup (install core, import content, configure plugin)
  info "Running WordPress setup..."
  SKIP_HOSTS=true bash "$REPO_ROOT/dev/setup.sh"
}

cmd_down() {
  load_env
  check_deps
  info "Stopping Docker services..."
  $DC down
  success "All services stopped."
}

cmd_test() {
  load_env
  check_deps

  info "Setting up Playwright..."
  cd "$E2E_DIR"

  # Install deps if node_modules is missing
  if [ ! -d "node_modules" ]; then
    npm install
  fi

  # Install Playwright browsers if missing
  if [ ! -d "$(npm root)/@playwright/test" ] && \
     ! npx playwright --version &>/dev/null 2>&1; then
    npm install
  fi

  # Install browser binaries
  npx playwright install chromium 2>/dev/null || true

  # Create test-results dir
  mkdir -p test-results

  info "Running E2E tests..."
  npx playwright test "$@"
  local exit_code=$?

  cd "$REPO_ROOT"

  if [ $exit_code -eq 0 ]; then
    success "All tests passed."
  else
    warn "Some tests failed. Run 'cd tests/e2e && npm run test:report' to view details."
  fi
  return $exit_code
}

cmd_screenshot() {
  load_env
  check_deps

  info "Installing E2E dependencies..."
  cd "$E2E_DIR"
  [ ! -d "node_modules" ] && npm install
  npx playwright install chromium 2>/dev/null || true

  info "Capturing screenshots → docs/media/"
  node helpers/screenshots.js

  cd "$REPO_ROOT"
  success "Screenshots saved to docs/media/"
}

cmd_gif() {
  load_env
  check_deps

  info "Installing E2E dependencies..."
  cd "$E2E_DIR"
  [ ! -d "node_modules" ] && npm install
  npx playwright install chromium 2>/dev/null || true

  info "Recording interaction GIFs → docs/media/"
  node helpers/gif-recorder.js

  cd "$REPO_ROOT"
  success "GIFs saved to docs/media/"
}

cmd_reset() {
  load_env
  check_deps

  warn "This will WIPE all Docker volumes (database, WordPress files) and reimport content."
  read -r -p "Are you sure? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    info "Reset cancelled."
    return 0
  fi

  info "Stopping containers and removing volumes..."
  $DC down -v

  info "Restarting fresh..."
  cmd_up
}

cmd_logs() {
  load_env
  check_deps
  info "Tailing WordPress and MySQL logs (Ctrl+C to stop)..."
  $DC logs -f wordpress db
}

cmd_wpcli() {
  load_env
  check_deps
  $DC run --rm wpcli "$@"
}

cmd_shell() {
  load_env
  check_deps
  info "Opening bash shell in WordPress container..."
  $DC exec wordpress bash
}

cmd_build() {
  info "Building plugin JS/CSS assets..."
  cd "$REPO_ROOT"
  npm run build
  success "Build complete. Hard-refresh your browser to see changes."
}

cmd_status() {
  load_env
  check_deps
  echo ""
  echo -e "${BOLD}Service Status:${NC}"
  $DC ps 2>/dev/null || true
  echo ""
  echo -e "${BOLD}URLs:${NC}"
  echo -e "  Site:   ${CYAN}http://instantsearch-dev.local:8080${NC}"
  echo -e "  Admin:  ${CYAN}http://instantsearch-dev.local:8080/wp-admin${NC}"
  echo -e "  Search: ${CYAN}http://instantsearch-dev.local:8080/search${NC}"
  echo -e "  Typesense: ${CYAN}http://localhost:8108/health${NC}"
  echo ""
}

cmd_help() {
  banner
  echo -e "${BOLD}Usage:${NC}  ./dev.sh <command> [args]"
  echo ""
  echo -e "${BOLD}Commands:${NC}"
  echo -e "  ${GREEN}up${NC}           Start everything (Docker + WordPress + demo content)"
  echo -e "  ${GREEN}down${NC}         Stop all containers"
  echo -e "  ${GREEN}test${NC}         Run Playwright E2E tests"
  echo -e "  ${GREEN}screenshot${NC}   Capture key plugin state screenshots → docs/media/"
  echo -e "  ${GREEN}gif${NC}          Record interaction GIFs → docs/media/"
  echo -e "  ${GREEN}reset${NC}        Wipe volumes and reimport fresh demo content"
  echo -e "  ${GREEN}logs${NC}         Tail WordPress + MySQL logs"
  echo -e "  ${GREEN}build${NC}        Build plugin JS/CSS assets (npm run build)"
  echo -e "  ${GREEN}status${NC}       Show running services and URLs"
  echo -e "  ${GREEN}wpcli${NC} ...    Run any WP-CLI command"
  echo -e "             ${CYAN}Example: ./dev.sh wpcli post list${NC}"
  echo -e "  ${GREEN}shell${NC}        Open bash shell inside WordPress container"
  echo -e "  ${GREEN}help${NC}         Show this help message"
  echo ""
  echo -e "${BOLD}Examples:${NC}"
  echo -e "  ./dev.sh up"
  echo -e "  ./dev.sh test"
  echo -e "  ./dev.sh screenshot && ./dev.sh gif"
  echo -e "  ./dev.sh wpcli option get instantsearch_for_wp_settings"
  echo -e "  ./dev.sh reset"
  echo ""
  echo -e "See ${CYAN}docs/AI_AGENT_GUIDE.md${NC} for full documentation."
  echo ""
}

# =============================================================================
# Main dispatcher
# =============================================================================

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  up)         cmd_up "$@" ;;
  down)       cmd_down "$@" ;;
  test)       cmd_test "$@" ;;
  screenshot) cmd_screenshot "$@" ;;
  gif)        cmd_gif "$@" ;;
  reset)      cmd_reset "$@" ;;
  logs)       cmd_logs "$@" ;;
  build)      cmd_build "$@" ;;
  status)     cmd_status "$@" ;;
  wpcli)      cmd_wpcli "$@" ;;
  shell)      cmd_shell "$@" ;;
  help|--help|-h) cmd_help ;;
  *)
    error "Unknown command: '$COMMAND'"
    echo ""
    cmd_help
    exit 1
    ;;
esac
