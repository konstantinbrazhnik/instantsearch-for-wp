---
sidebar_position: 1
---

# Contributing

## WP-CLI Usage

- Run WP-CLI commands only in the Docker environment used by e2e tests.
- Use ./dev.sh wpcli for all WP-CLI operations during development and validation.
- Avoid running host WP-CLI directly against non-test environments.

Examples:

- ./dev.sh wpcli post list
- ./dev.sh wpcli option get instantsearch_for_wp_settings

## Scenario Testing Requirement

- Every user-facing scenario change should include test coverage for both layers:
- Backend layer: data/API/state behavior is asserted (WP-CLI, REST, or PHPUnit).
- Frontend/admin layer: user-visible behavior is asserted with Playwright.

For exclusion and indexing scenarios, include one backend assertion and one wp-admin/front-end assertion in the same change.

## Running Backend Tests

- Run backend PHPUnit tests via Docker:
	- ./dev.sh phpunit
- Run a focused class/filter:
	- ./dev.sh phpunit --filter PostExclusionAttachmentTest

## PSR-4 Format

## Writing Tests

## Publishing Releases