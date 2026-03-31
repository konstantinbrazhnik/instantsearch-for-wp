<?php
/**
 * Render callback for instantsearch-for-wp/search-box block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks HTML.
 * @var \WP_Block $block     Block instance.
 */

$args = [
	'placeholder' => $attributes['placeholder'] ?? 'Search…',
	'autofocus'   => (bool) ( $attributes['autofocus'] ?? false ),
	'showSubmit'  => (bool) ( $attributes['showSubmit'] ?? true ),
	'showReset'   => (bool) ( $attributes['showReset'] ?? true ),
];

// Allow themes/plugins to modify the search box config.
$args   = apply_filters( 'instantsearch_search_box_args', $args, $attributes, $block );
$config = wp_json_encode( $args );
?>
<div
	<?php echo get_block_wrapper_attributes(); // phpcs:ignore ?>
	data-isfwp-widget="searchBox"
	data-isfwp-config="<?php echo esc_attr( $config ); ?>"
></div>
