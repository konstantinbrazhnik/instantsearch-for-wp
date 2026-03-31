<?php
/**
 * Render callback for instantsearch-for-wp/refinement-list block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks HTML.
 * @var \WP_Block $block     Block instance.
 */

$label = esc_html( $attributes['label'] ?? '' );
$sort_by_raw = $attributes['sortBy'] ?? 'isRefined,count:desc,name:asc';
$args = [
	'attribute'     => $attributes['attribute'] ?? 'post_type',
	'limit'         => (int) ( $attributes['limit'] ?? 10 ),
	'showMore'      => (bool) ( $attributes['showMore'] ?? false ),
	'showMoreLimit' => (int) ( $attributes['showMoreLimit'] ?? 20 ),
	'showCount'     => (bool) ( $attributes['showCount'] ?? true ),
	'sortBy'        => explode( ',', $sort_by_raw ),
];

// Allow themes/plugins to modify the refinement list config.
$args   = apply_filters( 'instantsearch_refinement_list_args', $args, $attributes, $block );
$config = wp_json_encode( $args );
?>
<div <?php echo get_block_wrapper_attributes(); // phpcs:ignore ?>>
	<?php if ( $label ) : ?>
		<p class="isfwp-refinement-list__label"><strong><?php echo $label; ?></strong></p>
	<?php endif; ?>
	<div
		data-isfwp-widget="refinementList"
		data-isfwp-config="<?php echo esc_attr( $config ); ?>"
	></div>
</div>
