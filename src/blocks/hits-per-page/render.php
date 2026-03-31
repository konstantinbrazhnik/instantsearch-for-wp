<?php
/**
 * Render callback for instantsearch-for-wp/hits-per-page block.
 *
 * @var array $attributes Block attributes.
 */

$raw_items = $attributes['items'] ?? array();
$items     = array();

foreach ( (array) $raw_items as $item ) {
	if ( ! is_array( $item ) ) {
		continue;
	}

	$value = isset( $item['value'] ) ? (int) $item['value'] : 0;
	if ( $value <= 0 ) {
		continue;
	}

	$items[] = array(
		'label'   => sanitize_text_field( (string) ( $item['label'] ?? (string) $value ) ),
		'value'   => $value,
		'default' => ! empty( $item['default'] ),
	);
}

if ( empty( $items ) ) {
	return;
}

$has_default = false;
foreach ( $items as $index => $item ) {
	if ( ! empty( $item['default'] ) && ! $has_default ) {
		$has_default = true;
		continue;
	}

	$items[ $index ]['default'] = false;
}

if ( ! $has_default ) {
	$items[0]['default'] = true;
}

$config = wp_json_encode(
	array(
		'label' => sanitize_text_field( $attributes['label'] ?? 'Results per page' ),
		'items' => $items,
	)
);
$label = sanitize_text_field( $attributes['label'] ?? 'Results per page' );
?>
<div <?php echo get_block_wrapper_attributes(); // phpcs:ignore ?> >
	<?php if ( '' !== $label ) : ?>
		<p class="isfwp-hits-per-page__label"><strong><?php echo esc_html( $label ); ?></strong></p>
	<?php endif; ?>
	<div
		data-isfwp-widget="hitsPerPage"
		data-isfwp-config="<?php echo esc_attr( $config ); ?>"
	></div>
</div>