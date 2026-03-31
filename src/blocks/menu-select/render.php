<?php
/**
 * Render callback for instantsearch-for-wp/menu-select block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks HTML.
 * @var \WP_Block $block     Block instance.
 */

$config = wp_json_encode( [
	'attribute'     => $attributes['attribute'] ?? 'post_type',
	'label'         => sanitize_text_field( $attributes['label'] ?? '' ),
	'hideWhenEmpty' => (bool) ( $attributes['hideWhenEmpty'] ?? true ),
	'limit'         => (int) ( $attributes['limit'] ?? 10 ),
	'sortBy'        => $attributes['sortBy'] ?? [ 'name:asc', 'count:desc' ],
] );
?>
<div <?php echo get_block_wrapper_attributes(); // phpcs:ignore ?>>
	<div
		data-isfwp-widget="menuSelect"
		data-isfwp-config="<?php echo esc_attr( $config ); ?>"
	></div>
</div>
