<?php
/**
 * Render callback for instantsearch-for-wp/hits block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks HTML.
 * @var \WP_Block $block     Block instance.
 */

$custom_class = sanitize_html_class( $attributes['customClass'] ?? '' );
$config = wp_json_encode( [
	'showImage'   => (bool) ( $attributes['showImage'] ?? false ),
	'showExcerpt' => (bool) ( $attributes['showExcerpt'] ?? true ),
] );

$extra_classes = $custom_class ? " $custom_class" : '';
?>
<div
	<?php echo get_block_wrapper_attributes( [ 'class' => 'isfwp-hits-container' . $extra_classes ] ); // phpcs:ignore ?>
	data-isfwp-widget="hits"
	data-isfwp-config="<?php echo esc_attr( $config ); ?>"
></div>
