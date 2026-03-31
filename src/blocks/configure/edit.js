import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	Notice,
	RangeControl,
	TextareaControl,
	ToggleControl,
	TextControl,
	ExternalLink,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit( { attributes, setAttributes } ) {
	const { metadata: blockMetadata = {} } = attributes;
	const {
		hitsPerPage,
		attributesToRetrieve,
		attributesToNotRetrieve,
		restrictSearchableAttributes,
		filters,
		distinct,
		distinctCount,
		analytics,
		clickAnalytics,
		highlightPreTag,
		highlightPostTag,
		snippetAttributes,
	} = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Configure Override', 'instantsearch-for-wp' ) } initialOpen>
					<p style={ { marginTop: 0 } }>
						{ __( 'Control visibility of this configuration by placing it in a group and customizing Visibility.', 'instantsearch-for-wp' ) }
					</p>
					<p style={ { marginTop: 0 } }>
						<ExternalLink href="https://www.algolia.com/doc/api-reference/api-parameters/attributesToRetrieve/">
							{ __( 'Reference: Algolia search attributes documentation', 'instantsearch-for-wp' ) }
						</ExternalLink>
					</p>
					<TextControl
						label={ __( 'Label', 'instantsearch-for-wp' ) }
						value={ blockMetadata.name ?? '' }
						onChange={ ( name ) =>
							setAttributes( {
								metadata: {
									...blockMetadata,
									name,
								},
							} )
						}
						placeholder={ __( 'e.g. Logged-out users promo override', 'instantsearch-for-wp' ) }
						help={ __( 'Use this as an editor reminder for what this override does and who it is for.', 'instantsearch-for-wp' ) }
					/>
					<RangeControl
						label={ __( 'Hits per page', 'instantsearch-for-wp' ) }
						value={ hitsPerPage }
						onChange={ ( val ) => setAttributes( { hitsPerPage: val } ) }
						min={ 1 }
						max={ 100 }
					/>
					<TextareaControl
						label={ __( 'Attributes to retrieve', 'instantsearch-for-wp' ) }
						value={ attributesToRetrieve }
						onChange={ ( val ) => setAttributes( { attributesToRetrieve: val } ) }
						placeholder="title, content, url"
						help={ __( 'Comma-separated list of attributes to fetch. Leave empty to use parent block behavior.', 'instantsearch-for-wp' ) }
						rows={ 2 }
					/>
					<TextareaControl
						label={ __( 'Attributes to NOT retrieve', 'instantsearch-for-wp' ) }
						value={ attributesToNotRetrieve }
						onChange={ ( val ) => setAttributes( { attributesToNotRetrieve: val } ) }
						placeholder="password, internal_notes"
						help={ __( 'Comma-separated list of attributes to exclude. Ignored if "Attributes to retrieve" is set.', 'instantsearch-for-wp' ) }
						rows={ 2 }
					/>
					<TextareaControl
						label={ __( 'Restrict searchable attributes', 'instantsearch-for-wp' ) }
						value={ restrictSearchableAttributes }
						onChange={ ( val ) => setAttributes( { restrictSearchableAttributes: val } ) }
						placeholder="title, content"
						help={ __( 'Comma-separated list of attributes to search within. Leave empty to use parent block behavior.', 'instantsearch-for-wp' ) }
						rows={ 2 }
					/>
					<TextareaControl
						label={ __( 'Filters', 'instantsearch-for-wp' ) }
						value={ filters }
						onChange={ ( val ) => setAttributes( { filters: val } ) }
						placeholder="status:published AND type:post"
						help={ __( 'Default filter applied to all queries (Algolia filter syntax).', 'instantsearch-for-wp' ) }
						rows={ 2 }
					/>
					<ToggleControl
						label={ __( 'Distinct (deduplicate results)', 'instantsearch-for-wp' ) }
						checked={ distinct }
						onChange={ ( val ) => setAttributes( { distinct: val } ) }
					/>
					{ distinct && (
						<RangeControl
							label={ __( 'Distinct count', 'instantsearch-for-wp' ) }
							value={ distinctCount }
							onChange={ ( val ) => setAttributes( { distinctCount: val } ) }
							min={ 1 }
							max={ 10 }
							help={ __( 'Maximum number of results per group when distinct is enabled.', 'instantsearch-for-wp' ) }
						/>
					) }
					<ToggleControl
						label={ __( 'Analytics', 'instantsearch-for-wp' ) }
						checked={ analytics }
						onChange={ ( val ) => setAttributes( { analytics: val } ) }
						help={ __( 'Send search queries to Algolia Analytics.', 'instantsearch-for-wp' ) }
					/>
					<ToggleControl
						label={ __( 'Click analytics', 'instantsearch-for-wp' ) }
						checked={ clickAnalytics }
						onChange={ ( val ) => setAttributes( { clickAnalytics: val } ) }
						help={ __( 'Enable click analytics for conversion tracking.', 'instantsearch-for-wp' ) }
					/>
					<TextControl
						label={ __( 'Highlight pre-tag', 'instantsearch-for-wp' ) }
						value={ highlightPreTag }
						onChange={ ( val ) => setAttributes( { highlightPreTag: val } ) }
						help={ __( 'Opening HTML tag wrapping highlighted text (default: <mark>).', 'instantsearch-for-wp' ) }
					/>
					<TextControl
						label={ __( 'Highlight post-tag', 'instantsearch-for-wp' ) }
						value={ highlightPostTag }
						onChange={ ( val ) => setAttributes( { highlightPostTag: val } ) }
						help={ __( 'Closing HTML tag wrapping highlighted text (default: </mark>).', 'instantsearch-for-wp' ) }
					/>
					<TextareaControl
						label={ __( 'Snippet attributes', 'instantsearch-for-wp' ) }
						value={ snippetAttributes }
						onChange={ ( val ) => setAttributes( { snippetAttributes: val } ) }
						placeholder="content:30, excerpt:20"
						help={ __( 'Comma-separated list of attributes with optional word count to snippet (e.g. content:30).', 'instantsearch-for-wp' ) }
						rows={ 2 }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...useBlockProps() }>
				<div className="isfwp-widget-preview">
					<div className="isfwp-widget-preview__label">{ __( 'Configure Override', 'instantsearch-for-wp' ) }</div>
					{ blockMetadata.name ? (
						<p style={ { margin: '0 0 0.5rem' } }>
							<strong>{ __( 'Label:', 'instantsearch-for-wp' ) }</strong> { blockMetadata.name }
						</p>
					) : null }
					<p style={ { margin: 0 } }>
						{ __( 'Search parameter overrides are active when this block is visible.', 'instantsearch-for-wp' ) }
					</p>
					<Notice status="info" isDismissible={ false }>
						{ __( 'This block renders a configure widget override on the frontend.', 'instantsearch-for-wp' ) }
					</Notice>
				</div>
			</div>
		</>
	);
}
