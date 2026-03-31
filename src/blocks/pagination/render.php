<?php
/**
 * Render callback for instantsearch-for-wp/pagination block.
 *
 * @var array $attributes Block attributes.
 */

$config_data = [
	'padding' => (int) ( $attributes['padding'] ?? 3 ),
];

if ( isset( $attributes['totalPages'] ) && '' !== $attributes['totalPages'] ) {
	$config_data['totalPages'] = (int) $attributes['totalPages'];
}

$config = wp_json_encode( $config_data );
?>
<div
	<?php echo get_block_wrapper_attributes(); // phpcs:ignore ?>
	data-isfwp-widget="pagination"
	data-isfwp-config="<?php echo esc_attr( $config ); ?>"
></div>
