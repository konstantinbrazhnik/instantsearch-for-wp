<?php
/**
 * Render callback for instantsearch-for-wp/current-refinements block.
 *
 * @var array $attributes Block attributes.
 */

$excluded_raw = $attributes['excludedAttributes'] ?? '';
$excluded = array_filter( array_map( 'trim', explode( ',', $excluded_raw ) ) );

$config = wp_json_encode( [
	'excludedAttributes' => array_values( $excluded ),
] );
?>
<div
	<?php echo get_block_wrapper_attributes(); // phpcs:ignore ?>
	data-isfwp-widget="currentRefinements"
	data-isfwp-config="<?php echo esc_attr( $config ); ?>"
></div>
