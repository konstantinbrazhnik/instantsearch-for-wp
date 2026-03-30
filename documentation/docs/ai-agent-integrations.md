---
sidebar_position: 2
---

# AI Agent Integrations

Use this guide when themes or companion plugins extend InstantSearch for WP indexing behavior.

## Copy/paste integration template

Use this starter in a theme or companion plugin, then replace field keys and meta keys for your use case.

```php
<?php
/**
 * Plugin Name: InstantSearch Integration Starter
 */

add_filter(
	'instantsearch_algolia_record',
	function ( $record, $post, $index ) {
		$custom_value = get_post_meta( $post->ID, 'custom_meta_key', true );
		if ( ! empty( $custom_value ) ) {
			$record['custom_field'] = is_array( $custom_value ) ? array_values( array_filter( $custom_value ) ) : (string) $custom_value;
		}

		return $record;
	},
	10,
	3
);

add_filter(
	'instantsearch_facet_attributes',
	function ( $attributes, $index_name ) {
		$attributes[] = 'custom_field';
		return array_values( array_unique( $attributes ) );
	},
	10,
	2
);

add_filter(
	'instantsearch_filterable_attributes',
	function ( $attributes, $index_name ) {
		$attributes[] = 'custom_field';
		return array_values( array_unique( $attributes ) );
	},
	10,
	2
);

// Optional: include custom text in search relevance.
add_filter(
	'instantsearch_searchable_attributes',
	function ( $attributes, $index_name ) {
		$attributes[] = 'custom_field';
		return array_values( array_unique( $attributes ) );
	},
	10,
	2
);
```

After adding callbacks, run a full reindex so existing records are rebuilt with the new field.

## Add custom facets and custom record data

To add a working custom facet in Algolia, you must do both parts:

1. Add the data field to each Algolia record.
2. Add that field to the appropriate Algolia index settings.

If you only configure settings but do not add the field to the record payload, facet values will be empty.

### Required filters for end-to-end facet support

1. instantsearch_algolia_record
- Purpose: Add custom attributes to the Algolia object payload during post formatting.
- Source: includes/Connectors/AlgoliaConnector.php (format_post).
- Typical use: Add values from post meta, computed data, or external mappings.

2. instantsearch_facet_attributes
- Purpose: Declare fields that should behave as facets.
- Typical use: Add your custom attribute key (for example, audience or metadata.region).

3. instantsearch_filterable_attributes
- Purpose: Add filterOnly(...) attributes for strict filtering.
- Typical use: Add fields that should be available to filters but do not need to be searchable facets.

4. instantsearch_searchable_attributes
- Purpose: Add fields that should contribute to text relevance.
- Typical use: Add custom text attributes if they should be part of full-text matching.

5. instantsearch_index_settings
- Purpose: Final override of the full settings array before setSettings is sent.
- Typical use: Normalize edge cases, enforce ordering, or set advanced Algolia options.

### Optional related filter

1. instantsearch_for_wp_available_custom_fields
- Purpose: Controls which custom fields are exposed in the plugin REST/UI indexing options.
- Important: This does not inject custom fields into Algolia records by itself.

### Recommended integration flow

1. Register instantsearch_algolia_record and append your custom data fields.
2. Register instantsearch_facet_attributes and add the field name.
3. Register instantsearch_filterable_attributes when exact filtering is needed.
4. Register instantsearch_searchable_attributes when the field should affect keyword relevance.
5. Use instantsearch_index_settings only when you need final low-level adjustments.
6. Reindex content so existing records are rebuilt with the new field.

### Example: add a custom facet from post meta

```php
add_filter(
	'instantsearch_algolia_record',
	function ( $record, $post, $index ) {
		$audience = get_post_meta( $post->ID, 'audience', true );
		if ( ! empty( $audience ) ) {
			$record['audience'] = is_array( $audience ) ? array_values( array_filter( $audience ) ) : (string) $audience;
		}

		return $record;
	},
	10,
	3
);

add_filter(
	'instantsearch_facet_attributes',
	function ( $attributes, $index_name ) {
		$attributes[] = 'audience';
		return array_values( array_unique( $attributes ) );
	},
	10,
	2
);

add_filter(
	'instantsearch_filterable_attributes',
	function ( $attributes, $index_name ) {
		$attributes[] = 'audience';
		return array_values( array_unique( $attributes ) );
	},
	10,
	2
);
```

### Example: add a nested facet (metadata.region)

```php
add_filter(
	'instantsearch_algolia_record',
	function ( $record, $post, $index ) {
		$region = get_post_meta( $post->ID, 'region', true );
		if ( ! empty( $region ) ) {
			if ( ! isset( $record['metadata'] ) || ! is_array( $record['metadata'] ) ) {
				$record['metadata'] = array();
			}

			$record['metadata']['region'] = is_array( $region ) ? array_values( array_filter( $region ) ) : (string) $region;
		}

		return $record;
	},
	10,
	3
);

add_filter(
	'instantsearch_facet_attributes',
	function ( $attributes, $index_name ) {
		$attributes[] = 'metadata.region';
		return array_values( array_unique( $attributes ) );
	},
	10,
	2
);

add_filter(
	'instantsearch_filterable_attributes',
	function ( $attributes, $index_name ) {
		$attributes[] = 'metadata.region';
		return array_values( array_unique( $attributes ) );
	},
	10,
	2
);
```

For nested facets, use the dot path in settings filters (metadata.region) and nested arrays in the record payload ($record['metadata']['region']).

### Data-shape guidance

- Scalar facets: Use strings, numbers, or booleans for single-value facets.
- Multi-value facets: Use arrays of scalar values for multi-select facets.
- Nested facets: Use dot-addressable keys through nested arrays (for example, metadata.region -> $record['metadata']['region']).

### Reindex requirement

Changing facet-related filters or record field structure requires a reindex. Existing records keep the old shape until they are re-saved.

## QA and release checklist

1. Confirm record data is present
- Temporarily log or inspect one indexed object and verify the custom attribute exists (for example, audience or metadata.region).

2. Confirm facet settings are applied
- Verify index settings include your new attribute in attributesForFaceting and, when needed, searchableAttributes.

3. Reindex and validate results
- Run a full reindex after filter changes, then verify facet counts and filtering behavior in the search UI.

4. Validate fallback behavior
- Ensure integrations do not break indexing when custom data is empty or missing.

5. Document integration ownership
- Record where the integration callbacks live (theme or companion plugin) and who owns ongoing maintenance.
