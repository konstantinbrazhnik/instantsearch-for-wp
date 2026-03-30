<?php
/**
 * Render callback for instantsearch-for-wp/instantsearch block.
 *
 * @package InstantSearchForWP
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks HTML.
 * @var \WP_Block $block     Block instance.
 */

$instance_id = esc_attr( $attributes['instanceId'] ?? uniqid( 'isfwp-' ) );

// Resolve credentials.
$settings       = \InstantSearchForWP\Settings::get_settings();
$use_global     = $attributes['useGlobalCredentials'] ?? true;
$app_id         = $use_global ? ( $settings['algolia']['app_id'] ?? '' ) : ( $attributes['customAppId'] ?? '' );
$api_key        = $use_global ? ( $settings['algolia']['search_only_api_key'] ?? '' ) : ( $attributes['customApiKey'] ?? '' );

// Resolve index name.
$index_name = $attributes['indexName'] ?? '';
if ( empty( $index_name ) ) {
	$index_name = \InstantSearchForWP\Settings::get_index_name();
}

$config = wp_json_encode(
	[
		'instanceId'  => $instance_id,
		'indexName'   => $index_name,
		'appId'       => $app_id,
		'apiKey'      => $api_key,
		'hitsPerPage' => (int) ( $attributes['hitsPerPage'] ?? 10 ),
		'distinct'    => (bool) ( $attributes['distinct'] ?? false ),
	]
);

$wrapper_attrs = get_block_wrapper_attributes(
	[
		'id'                   => 'isfwp-instance-' . $instance_id,
		'class'                => 'isfwp-block-instance',
		'data-isfwp-instance'  => $instance_id,
	]
);
?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<script type="application/json" class="isfwp-block-config"><?php echo $config; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></script>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
