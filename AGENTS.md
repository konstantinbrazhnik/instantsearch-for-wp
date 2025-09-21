# Agent Instructions for InstantSearch for WP

## Project Overview

**InstantSearch for WP** is a WordPress plugin that provides a set of Gutenberg Blocks for InstantSearch.js widgets, enabling powerful search functionality through with search providers like Aloglia, Typesense, and Melei search. This plugin follows WordPress coding standards and modern development practices.

### Core Functionality
- **InstantSearch.js Integration**: Provides search UI components as Gutenberg blocks
- **Typesense/Algolia/Meleisearch Backend**: Fast, typo-tolerant search engine integration
- **WordPress Integration**: Native WordPress admin, user management, and content indexing
- **Gutenberg Blocks**: Modern block-based approach for search interface building
- **Performance Optimized**: Efficient search indexing and caching strategies

### Key Technologies
- **WordPress Plugin Development**: PHP 8.0+ with WordPress coding standards
- **Gutenberg Blocks**: React/JSX components using @wordpress/scripts
- **Search Engine**: Typesense integration with InstantSearch.js
- **Build System**: wp-scripts (webpack), Composer, npm
- **Testing**: PHPUnit for PHP, Jest for JavaScript
- **Code Quality**: PHPCS, ESLint, Prettier, Husky pre-commit hooks

## Development Environment Setup

### Prerequisites
- PHP 8.0+ with WordPress development environment
- Node.js 18+ (check `.nvmrc` for exact version)
- Composer 2.0+
- WordPress 4.5+ (tested up to 6.2.2)

### Initial Setup
```bash
# Install PHP dependencies
composer install

# Install Node.js dependencies
npm install

# Build assets for development
npm run start

# Or build for production
npm run build
```

### Typesense Setup (for search development)
```bash
# Option 1: Using Homebrew (macOS)
npm run typesense

# Option 2: Using Docker
npm run typesense:docker

# Option 3: Manual macOS setup
npm run typesense:mac:install
npm run typesense:mac
```

## Code Architecture

### Directory Structure
```
├── src/                    # Gutenberg blocks source code
│   └── boilerplate-block/  # Example block structure
├── includes/               # PHP classes (PSR-4 autoloaded)
├── templates/              # PHP template files
├── assets/                 # Built CSS/JS assets
├── tests/                  # PHPUnit tests
├── lib/                    # Composer dependencies (vendor)
└── build/                  # Built block assets
```

### PHP Architecture
- **Namespace**: All classes under `YokoCo\` namespace
- **Autoloading**: PSR-4 via Composer (`includes/` directory)
- **Main Plugin File**: `instantsearch-for-wp.php`
- **Pattern**: Singleton pattern for main plugin class
- **Hooks**: WordPress action/filter system

### Block Development
- **Location**: Each block in its own `src/` subdirectory
- **Structure**: 
  - `block.json` - Block configuration and metadata
  - `index.js` - Block registration and build entry
  - `edit.js` - Editor component (React)
  - `save.js` - Static save component or use server-side render
  - `render.php` - Server-side rendering (if using dynamic blocks)
  - `view.js` - Frontend interactivity script
  - `editor.scss` - Editor-only styles
  - `style.scss` - Frontend styles
  - `update.php` - Block deprecation/migration logic
- **Styles**: `.scss` files compiled via wp-scripts
- **Registration**: Automatic via `block.json` with WordPress 6.0+
- **Textdomain**: Use `yoko-core` for all translatable strings

## Code Standards & Guidelines

### PHP Development
- **Standards**: WordPress PHP Coding Standards (enforced by PHPCS)
- **Security**: Always sanitize input and escape output
- **Database**: Use `$wpdb->prepare()` for raw queries
- **Hooks**: Prefer class methods for callbacks
- **Documentation**: PHPDoc required for public methods

Example PHP class:
```php
<?php
namespace YokoCo\Search;

class SearchWidget {
    /**
     * Initialize the search widget.
     *
     * @since 1.0.0
     * @param array $args Widget arguments.
     * @return void
     */
    public function init( array $args = [] ): void {
        $args = wp_parse_args( $args, $this->get_defaults() );
        // Implementation here
    }
}
```

### JavaScript Development
- **Framework**: React/JSX for Gutenberg blocks
- **ES6+**: Use modern JavaScript features
- **Imports**: ES6 modules (`import`/`export`)
- **WordPress APIs**: Use `@wordpress/` packages
- **Internationalization**: Use `__()` from `@wordpress/i18n`

Example block component:
```javascript
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';

export default function Edit() {
    const blockProps = useBlockProps();
    
    return (
        <div {...blockProps}>
            <p>{__('InstantSearch Widget', 'yoko-core')}</p>
        </div>
    );
}
```

### CSS Development
- **Methodology**: BEM-style naming encouraged
- **Prefixes**: Use `.yoko-` prefix for classes
- **Location**: Block-specific styles in block folders
- **Build**: SCSS compiled via wp-scripts

## Testing Guidelines

### PHP Testing
```bash
# Run PHP tests
composer test

# Run with coverage
phpunit --coverage-html coverage/
```

- **Framework**: PHPUnit with WordPress test suite
- **Location**: `tests/` directory
- **Naming**: `test_` prefix for test methods
- **Setup**: Extend `WP_UnitTestCase`

### JavaScript Testing
```bash
# Run JS tests (if configured)
npm test

# Lint JavaScript
npm run lint:js

# Format code
npm run format
```

### Code Quality
```bash
# PHP linting
composer run phpcs

# CSS linting
npm run lint:css

# Fix auto-fixable issues
npm run format
composer run phpcbf
```

## Common Development Tasks

### Creating a New Block
1. **Copy boilerplate**: Use `src/boilerplate-block/` as template
   ```bash
   cp -r src/boilerplate-block src/my-new-block
   ```
2. **Update block.json**: Change name, title, category, textdomain
   ```json
   {
     "name": "yoko-core/my-new-block",
     "title": "My New Block",
     "textdomain": "yoko-core"
   }
   ```
3. **Implement Edit component**: React component for editor in `edit.js`
4. **Implement Save component**: Static output in `save.js` or use `render.php`
5. **Add styles**: Create `editor.scss` and `style.scss` files
6. **Add view script**: Interactive frontend behavior in `view.js`
7. **Register**: Build with `npm run build` - automatic via `block.json`

### Adding PHP Functionality
1. **Create class**: In `includes/` directory
2. **Follow namespace**: Use `YokoCo\` namespace
3. **Add to autoloader**: PSR-4 handles automatically
4. **Hook into WordPress**: Use actions/filters appropriately
5. **Write tests**: Add PHPUnit tests

### Typesense Integration
- **Client**: Use `typesense/typesense-php` package included in composer.json
- **Configuration**: Set API keys and server details in WordPress admin
- **Indexing**: Create collections and index WordPress content (posts, pages, custom post types)
- **Search**: Use InstantSearch.js widgets with Typesense adapter
- **Performance**: Implement caching and optimize for large datasets
- **Development**: Local Typesense server setup via npm scripts

Example Typesense integration:
```php
use Typesense\Client;

$client = new Client([
    'api_key' => get_option('typesense_api_key'),
    'nodes' => [
        [
            'host' => get_option('typesense_host', 'localhost'),
            'port' => get_option('typesense_port', '8108'),
            'protocol' => 'http'
        ]
    ]
]);
```

### Building and Deployment
```bash
# Development build (watch mode)
npm run start

# Production build
npm run build

# Create plugin zip
npm run plugin-zip

# Build documentation dashboard
npm run typesense:dashboard
```

## WordPress-Specific Guidelines

### Plugin Structure
- **Main file**: `instantsearch-for-wp.php` with plugin headers
- **Activation/Deactivation**: Use WordPress hooks
- **Uninstall**: Clean up options and data
- **Capabilities**: Check user permissions
- **Nonces**: Verify for security

### Gutenberg Integration
- **Block registration**: Use `block.json` for modern approach
- **Server-side rendering**: Use `render_callback` when needed
- **Block supports**: Define in `block.json`
- **Styles**: Enqueue properly for editor and frontend

### Performance Considerations
- **Caching**: Use WordPress transients appropriately
- **Asset loading**: Conditional loading based on block usage
- **Database queries**: Optimize and cache when possible
- **Search indexing**: Batch operations for large datasets

## Documentation

Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask.

Use the following Context7 library paths for reference:
 - WordPress: /websites/developer_wordpress
 - WordPress Coding Standards: /wordpress/wordpress-coding-standards
 - Typesense: /websites/typesense
 - InstantSearch.js: /algolia/instantsearch
 - Algolia: /websites/algolia-doc

## Troubleshooting

### Common Issues

**Build failures**:
- Check Node.js version matches `.nvmrc`
- Clear `node_modules` and reinstall
- Verify wp-scripts compatibility

**PHP errors**:
- Check autoloader (`composer dump-autoload`)
- Verify namespace and class names
- Check WordPress version compatibility

**Typesense connection**:
- Verify server is running
- Check API keys and configuration
- Ensure CORS is enabled for development

**Block not appearing**:
- Check `block.json` syntax
- Verify build process completed
- Clear any caching plugins

### Development Commands
```bash
# Reset development environment
rm -rf node_modules build lib composer.lock package-lock.json
npm install && composer install && npm run build

# Debug build issues
npm run start -- --verbose

# Check code standards
npm run lint:js && npm run lint:css && composer run phpcs

# Run all tests
npm test && composer test
```

## Resources

### Documentation
- [WordPress Block Development](https://developer.wordpress.org/block-editor/)
- [Typesense Documentation](https://typesense.org/docs/)
- [InstantSearch.js Guide](https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/js/)
- [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/)

### Internal Files
- `CODING_STYLES.md`: Detailed coding standards and conventions
- `phpcs.xml.dist`: PHP CodeSniffer configuration
- `package.json`: Build scripts and dependencies
- `composer.json`: PHP dependencies and autoloading

### Development Tools
- **@wordpress/scripts**: Build and development tools
- **PHPCS**: PHP code standards checking
- **Husky**: Git hooks for code quality
- **WordPress CLI**: Command-line WordPress management

## Contribution Guidelines

- Fork the repository and create a feature branch off of the `develop` branch
- Follow coding standards and write tests for new functionality
- Submit a pull request with a clear description of changes

---

*This file provides comprehensive guidance for GitHub Copilot and human developers working on the InstantSearch for WP plugin. Keep it updated as the project evolves.*