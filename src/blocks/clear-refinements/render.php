<?php
/**
 * Render callback for instantsearch-for-wp/clear-refinements block.
 *
 * @var array $attributes Block attributes.
 */

$included_raw = $attributes['includedAttributes'] ?? '';
$included = array_filter( array_map( 'trim', explode( ',', $included_raw ) ) );

$config = wp_json_encode( [
	'buttonLabel'        => $attributes['buttonLabel'] ?? 'Clear refinements',
	'includedAttributes' => ! empty( $included ) ? array_values( $included ) : null,
] );
?>
<div
	<?php echo get_block_wrapper_attributes(); // phpcs:ignore ?>
	data-isfwp-widget="clearRefinements"
	data-isfwp-config="<?php echo esc_attr( $config ); ?>"
></div>
