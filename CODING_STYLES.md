# Yoko Core & SSO Plugin Coding Styles & Guidelines

Welcome to the Yoko Core and Yoko SSO CP codebase! This document outlines the coding standards and conventions to follow when contributing new features, fixing bugs, or updating documentation.

## 1. Tools & Configuration
- **EditorConfig** (`.editorconfig`): Enforces basic formatting across file types.
- **PHP_CodeSniffer (PHPCS)**: Configured via `phpcs.xml.dist` for WordPress PHP standards.
- **@wordpress/scripts**: Provides ESLint, Prettier, stylelint, and build tools for JS/CSS.
- **Husky & Pre-commit hooks**: Automatically run linters/formatters before commits.

## 2. File Formatting Rules
| File Type                  | Extension(s)                           | Indent Style | Indent Size | Notes                                      |
|----------------------------|----------------------------------------|--------------|-------------|--------------------------------------------|
| PHP, CSS, PHP templates    | .php, .css, .php (in templates)        | Tabs         | 4 spaces    | Follow WP Coding Standards                 |
| JavaScript & JSX           | .js, .jsx                              | Spaces       | 4 spaces    | Use `npm run format` (Prettier)            |
| JSON, YAML                 | .json, .yml                            | Spaces       | 2 spaces    | Follow `.editorconfig`                     |
| Markdown & Documentation   | .md                                    | Tabs         | 4 spaces    | Code blocks may use fenced syntax          |

> **Always** rely on `npm run format`, `npm run lint:js`, and `npm run lint:css` for JS/CSS, and `composer run phpcs` (or CI hooks) for PHP.

## 3. PHP Guidelines
- **Standards**: Follow WordPress PHP Coding Standards (PSR-12 compatible) as enforced by PHPCS.
- **Namespaces & Autoloading**: All PHP classes live under the `YokoCo\\` namespace, mapped via PSR-4 in `composer.json` (folder `includes/`).
- **Class Files**: One class per file, `PascalCase` class name matches file name (e.g. `class AdminUI` in `AdminUI.php`).
- **Functions**: Use `snake_case`, prefix with `yoko_` or namespace-based static methods. Keep global scope minimal.
- **DocBlocks**: Provide PHPDoc for classes, public methods, and functions. Include `@since`, `@param`, `@return`.
- **Security**:
  - Prevent direct access with `defined('ABSPATH') || exit;` at the top of PHP files (if not a class file in `includes/`).
  - Sanitize all input (`sanitize_text_field()`, etc.) and escape all output (`esc_html()`, `esc_url()`, `esc_attr()`).
- **Database & Queries**: Use `$wpdb->prepare()` for raw queries; prefer WP API functions when available.
- **Hooks & Filters**: Name callbacks clearly; use `add_action( 'hook', [ $this, 'method' ] )` or static `[ ClassName::class, 'method' ]`.

## 4. JavaScript & React (Gutenberg Blocks)
- **ES6+ & JSX**: Use `import`/`export`, `const`/`let`, arrow functions, and JSX for React components.
- **Naming**:
  - Components & classes: `PascalCase` (e.g. `MyBlockEdit`).
  - Variables & functions: `camelCase`.
- **File Structure**: Group block code in its own folder under `src/`, with `block.json`, `index.js`, and style files if needed.
- **i18n**: Wrap strings in `__()`, `_x()`, etc., from `@wordpress/i18n`.
- **Lint & Format**: Always run `npm run lint:js` and `npm run format` before commit. Config is via `@wordpress/scripts`.

## 5. CSS
- **Selectors**: Prefix classes with `.yoko-` to avoid collisions.
- **BEM-style**: Encourage Block__Element--Modifier naming for reusable components.
- **Location**: Styles for admin vs. frontend in `assets/css/` (or block-specific CSS in each block folder).
- **Lint**: Run `npm run lint:css` (stylelint via WP Scripts).

## 6. Templates
- **Directory**: Place overrideable PHP template files under `templates/`.
- **Naming**: Use `snake_case.php` (e.g. `single-event.php`).
- **Logic**: Keep PHP logic minimal; no direct DB calls—only WP functions.
- **Escaping**: Escape all echoed variables with appropriate `esc_*` functions.

## 7. Tests
- **PHP Unit Tests**: Located in `tests/`, extending `WP_UnitTestCase`. Name test methods `test_feature_does_x`.
- **JS Tests**: If present, colocated with code or under `tests/js/`. Use Jest or WP Scripts test runner.
- **Running**: `bin/install-wp-tests.sh` bootstraps; run `composer test` or `npm test` as configured.

## 8. Documentation
- **Plugin Readme**: Update `readme.txt` for WordPress.org, following WP readme standard.
- **Developer Docs**: Add or update Markdown files under `website/docs/`; rebuild site via Docusaurus.
- **Changelog**: Keep release notes up to date in `readme.txt` or the docs site.

## 9. Commit Messages & Git
- **Conventional Commits**: Use `<type>(<scope>): <subject>` (e.g., `feat(blocks): add new block variation`).
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
  - Scope: the area of change (`core`, `blocks`, `sso`, `css`, etc.).
- **Pre-commit Hooks**: Husky runs linters/formatters—ensure all checks pass before pushing.

## 10. Code Review
- Keep PRs focused on a single change or feature.
- Link related issues or tickets in the PR description.
- Respond promptly to review comments; iterate with small follow-up commits.

---
Following these guidelines helps keep our code consistent, maintainable, and high-quality. Thank you for contributing!