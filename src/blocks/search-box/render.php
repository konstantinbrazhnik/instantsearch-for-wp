<?php
/**
 * Render callback for instantsearch-for-wp/search-box block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks HTML.
 * @var \WP_Block $block     Block instance.
 */

$config = wp_json_encode( [
	'placeholder' => $attributes['placeholder'] ?? 'Search…',
	'autofocus'   => (bool) ( $attributes['autofocus'] ?? false ),
	'showSubmit'  => (bool) ( $attributes['showSubmit'] ?? true ),
	'showReset'   => (bool) ( $attributes['showReset'] ?? true ),
] );
?>
<div
	<?php echo get_block_wrapper_attributes(); // phpcs:ignore ?>
	data-isfwp-widget="searchBox"
	data-isfwp-config="<?php echo esc_attr( $config ); ?>"
></div>
