<?php
/**
 * Render callback for instantsearch-for-wp/menu-select block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks HTML.
 * @var \WP_Block $block     Block instance.
 */

$label  = esc_html( $attributes['label'] ?? '' );
$config = wp_json_encode( [
	'attribute' => $attributes['attribute'] ?? 'post_type',
	'limit'     => (int) ( $attributes['limit'] ?? 10 ),
	'sortBy'    => $attributes['sortBy'] ?? [ 'name:asc', 'count:desc' ],
] );
?>
<div <?php echo get_block_wrapper_attributes(); // phpcs:ignore ?>>
	<?php if ( $label ) : ?>
		<p class="isfwp-menu-select__label"><strong><?php echo $label; ?></strong></p>
	<?php endif; ?>
	<div
		data-isfwp-widget="menuSelect"
		data-isfwp-config="<?php echo esc_attr( $config ); ?>"
	></div>
</div>
