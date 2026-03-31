<?php
/**
 * Render callback for instantsearch-for-wp/clear-refinements block.
 *
 * @var array $attributes Block attributes.
 */

$included_raw = $attributes['includedAttributes'] ?? '';
$included = array_filter( array_map( 'trim', explode( ',', $included_raw ) ) );

$config_data = [
	'buttonLabel' => $attributes['buttonLabel'] ?? 'Clear refinements',
];

if ( ! empty( $included ) ) {
	$config_data['includedAttributes'] = array_values( $included );
}

$config = wp_json_encode( $config_data );
?>
<div
	<?php echo get_block_wrapper_attributes(); // phpcs:ignore ?>
	data-isfwp-widget="clearRefinements"
	data-isfwp-config="<?php echo esc_attr( $config ); ?>"
></div>
