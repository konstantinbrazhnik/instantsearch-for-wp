<?php
/**
 * Render callback for instantsearch-for-wp/pagination block.
 *
 * @var array $attributes Block attributes.
 */

$config = wp_json_encode( [
	'totalPages' => isset( $attributes['totalPages'] ) ? (int) $attributes['totalPages'] : null,
	'padding'    => (int) ( $attributes['padding'] ?? 3 ),
] );
?>
<div
	<?php echo get_block_wrapper_attributes(); // phpcs:ignore ?>
	data-isfwp-widget="pagination"
	data-isfwp-config="<?php echo esc_attr( $config ); ?>"
></div>
