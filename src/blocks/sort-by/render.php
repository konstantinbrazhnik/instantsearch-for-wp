<?php
/**
 * Render callback for instantsearch-for-wp/sort-by block.
 *
 * @var array $attributes Block attributes.
 */

$items = $attributes['items'] ?? [];
if ( empty( $items ) ) {
	return;
}

$config = wp_json_encode( [ 'items' => $items ] );
?>
<div
	<?php echo get_block_wrapper_attributes(); // phpcs:ignore ?>
	data-isfwp-widget="sortBy"
	data-isfwp-config="<?php echo esc_attr( $config ); ?>"
></div>
