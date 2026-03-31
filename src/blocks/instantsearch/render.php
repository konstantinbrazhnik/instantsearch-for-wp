<?php
/**
 * Render callback for instantsearch-for-wp/instantsearch block.
 *
 * @package InstantSearchForWP
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks HTML.
 * @var \WP_Block $block     Block instance.
 */

$instance_id = esc_attr( $attributes['instanceId'] ?? uniqid( 'isfwp-' ) );

// Resolve credentials.
$settings       = \InstantSearchForWP\Settings::get_settings();
$use_global     = $attributes['useGlobalCredentials'] ?? true;
$app_id         = $use_global ? ( $settings['algolia']['app_id'] ?? '' ) : ( $attributes['customAppId'] ?? '' );
$api_key        = $use_global ? ( $settings['algolia']['search_only_api_key'] ?? '' ) : ( $attributes['customApiKey'] ?? '' );

// Resolve index name.
$index_name = $attributes['indexName'] ?? '';
if ( empty( $index_name ) ) {
	$index_name = \InstantSearchForWP\Settings::get_index_name();
}

// Parse comma-separated string attributes into arrays, filtering empty entries.
$parse_csv = function( string $val ): array {
	return array_values( array_filter( array_map( 'trim', explode( ',', $val ) ) ) );
};

$attributes_to_retrieve     = $parse_csv( $attributes['attributesToRetrieve'] ?? '' );
$attributes_to_not_retrieve = $parse_csv( $attributes['attributesToNotRetrieve'] ?? '' );
$restrict_searchable        = $parse_csv( $attributes['restrictSearchableAttributes'] ?? '' );
$snippet_attrs_raw          = $parse_csv( $attributes['snippetAttributes'] ?? '' );

// Build attributesToRetrieve: explicit list takes priority; if only exclusions
// are provided, use wildcard + negated entries.
if ( ! empty( $attributes_to_retrieve ) ) {
	$resolved_attributes_to_retrieve = $attributes_to_retrieve;
} elseif ( ! empty( $attributes_to_not_retrieve ) ) {
	$resolved_attributes_to_retrieve = array_merge(
		[ '*' ],
		array_map( fn( $a ) => '-' . $a, $attributes_to_not_retrieve )
	);
} else {
	$resolved_attributes_to_retrieve = null;
}

$config_data = [
	'instanceId'   => $instance_id,
	'indexName'    => $index_name,
	'appId'        => $app_id,
	'apiKey'       => $api_key,
	'hitsPerPage'  => (int) ( $attributes['hitsPerPage'] ?? 20 ),
	'distinct'     => $attributes['distinct'] ?? false
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

$wrapper_attrs = get_block_wrapper_attributes(
	[
		'id'                   => 'isfwp-instance-' . $instance_id,
		'class'                => 'isfwp-block-instance',
		'data-isfwp-instance'  => $instance_id,
	]
);
?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<script type="application/json" class="isfwp-block-config"><?php echo $config; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></script>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
