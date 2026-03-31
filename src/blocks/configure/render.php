<?php
/**
 * Render callback for instantsearch-for-wp/configure block.
 *
 * This block emits an InstantSearch configure widget payload based on the same
 * search parameter controls as the main InstantSearch container block.
 * Visibility for when this block should appear is expected to be handled by
 * block visibility controls/plugins.
 *
 * @var array $attributes Block attributes.
 */

// Parse comma-separated attributes exactly like the main container block.
$parse_csv = static function( string $val ): array {
	return array_values( array_filter( array_map( 'trim', explode( ',', $val ) ) ) );
};

$attributes_to_retrieve     = $parse_csv( $attributes['attributesToRetrieve'] ?? '' );
$attributes_to_not_retrieve = $parse_csv( $attributes['attributesToNotRetrieve'] ?? '' );
$restrict_searchable        = $parse_csv( $attributes['restrictSearchableAttributes'] ?? '' );
$snippet_attrs_raw          = $parse_csv( $attributes['snippetAttributes'] ?? '' );

if ( ! empty( $attributes_to_retrieve ) ) {
	$resolved_attributes_to_retrieve = $attributes_to_retrieve;
} elseif ( ! empty( $attributes_to_not_retrieve ) ) {
	$resolved_attributes_to_retrieve = array_merge(
		[ '*' ],
		array_map( static fn( $a ) => '-' . $a, $attributes_to_not_retrieve )
	);
} else {
	$resolved_attributes_to_retrieve = null;
}

$config_data = [
	'hitsPerPage'      => (int) ( $attributes['hitsPerPage'] ?? 20 ),
	'distinct'         => $attributes['distinct'] ?? false
		? (int) ( $attributes['distinctCount'] ?? 1 )
		: false,
	'analytics'        => (bool) ( $attributes['analytics'] ?? true ),
	'clickAnalytics'   => (bool) ( $attributes['clickAnalytics'] ?? false ),
	'highlightPreTag'  => $attributes['highlightPreTag'] ?? '<mark>',
	'highlightPostTag' => $attributes['highlightPostTag'] ?? '</mark>',
];

if ( ! empty( $attributes['filters'] ) ) {
	$config_data['filters'] = $attributes['filters'];
}

if ( null !== $resolved_attributes_to_retrieve ) {
	$config_data['attributesToRetrieve'] = $resolved_attributes_to_retrieve;
}

if ( ! empty( $restrict_searchable ) ) {
	$config_data['restrictSearchableAttributes'] = $restrict_searchable;
}

if ( ! empty( $snippet_attrs_raw ) ) {
	$config_data['snippetAttributes'] = $snippet_attrs_raw;
}

$config = wp_json_encode( $config_data );

if ( ! $config ) {
	return;
}
?>
<div
	data-isfwp-widget="configure"
	data-isfwp-config="<?php echo esc_attr( $config ); ?>"
	hidden
></div>
