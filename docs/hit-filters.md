# InstantSearch Block Hit Filters

The InstantSearch block frontend exposes JavaScript filter hooks that run before each hit is rendered.

These hooks are applied inside the Hits widget `transformItems` callback in [src/blocks/instantsearch/view.js](../src/blocks/instantsearch/view.js), which means they run after search results are returned and before either the default renderer or a custom Mustache template consumes the hit.

## Available Hooks

Global hook for all InstantSearch block instances:

```js
wp.hooks.addFilter(
	'isfwp.blockHit',
	'my-theme/add-computed-hit-fields',
	( hit, context ) => {
		return {
			...hit,
			reading_time: estimateReadingTime( hit.content || '' ),
		};
	}
);
```

Per-instance hook for a specific InstantSearch block instance:

```js
wp.hooks.addFilter(
	'isfwp.blockHit.hero-search',
	'my-theme/add-hero-search-fields',
	( hit, context ) => {
		return {
			...hit,
			badge_label: 'Featured Result',
		};
	}
);
```

If the InstantSearch block `instanceId` is `hero-search`, the following hooks will run in order:

1. `isfwp.blockHit`
2. `isfwp.blockHit.hero-search`

## Filter Arguments

Each filter receives:

1. `hit`
The current Algolia/InstantSearch hit object.

2. `context`
An object containing:

```js
{
	config,
	container,
	index,
	instanceId,
	results,
}
```

This allows you to compute new fields from the search result payload, block config, or the specific block instance.

## When To Enqueue Your Filter Script

Enqueue your custom filter script on the front end with `wp_enqueue_scripts`.

Your filter must be registered before the InstantSearch block initializes on `DOMContentLoaded`. In practice, this means:

1. Enqueue your script on normal front-end requests.
2. Make sure it loads before `DOMContentLoaded` fires.
3. Make sure `wp-hooks` is available.

If your script is enqueued in the normal footer flow, WordPress will print it before the page finishes loading, which is early enough for the filter registration to be picked up by the InstantSearch block.

## Theme Example

In your theme `functions.php`:

```php
<?php
/**
 * Enqueue InstantSearch hit filters for the front end.
 */
function mytheme_enqueue_instantsearch_hit_filters() {
	if ( is_admin() ) {
		return;
	}

	wp_enqueue_script(
		'mytheme-instantsearch-hit-filters',
		get_stylesheet_directory_uri() . '/assets/js/instantsearch-hit-filters.js',
		array( 'wp-hooks' ),
		filemtime( get_stylesheet_directory() . '/assets/js/instantsearch-hit-filters.js' ),
		true
	);
}
add_action( 'wp_enqueue_scripts', 'mytheme_enqueue_instantsearch_hit_filters' );
```

In your theme script file:

```js
( function () {
	wp.hooks.addFilter(
		'isfwp.blockHit',
		'mytheme/add-computed-hit-fields',
		function( hit, context ) {
			var content = hit.content || '';
			var wordCount = content.trim() ? content.trim().split( /\s+/ ).length : 0;

			return {
				...hit,
				reading_time: Math.max( 1, Math.ceil( wordCount / 200 ) ),
				result_position: context.index + 1,
			};
		}
	);
}() );
```

## Plugin Example

In a custom plugin:

```php
<?php
/**
 * Plugin Name: My InstantSearch Filters
 */

function myplugin_enqueue_instantsearch_hit_filters() {
	if ( is_admin() ) {
		return;
	}

	wp_enqueue_script(
		'myplugin-instantsearch-hit-filters',
		plugin_dir_url( __FILE__ ) . 'assets/js/hit-filters.js',
		array( 'wp-hooks' ),
		'1.0.0',
		true
	);
}
add_action( 'wp_enqueue_scripts', 'myplugin_enqueue_instantsearch_hit_filters' );
```

## Using Computed Fields In Templates

Once a filter adds a property to each hit, you can use it in a custom Hits block template.

Example:

```html
<article class="isfwp-hit">
	<h3>{{{_highlightResult.title.value}}}</h3>
	<p>{{excerpt}}</p>
	<p>Estimated reading time: {{reading_time}} min</p>
</article>
```

## Notes

1. Return a hit object from your filter. Do not return `null` or a non-object value.
2. Prefer adding derived fields instead of mutating nested InstantSearch metadata.
3. Use the per-instance hook when different block instances need different computed fields.