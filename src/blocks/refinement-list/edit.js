import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, RangeControl, ToggleControl, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const COMMON_ATTRIBUTES = [
	{ label: 'post_type', value: 'post_type' },
	{ label: 'taxonomies.category', value: 'taxonomies.category' },
	{ label: 'taxonomies.post_tag', value: 'taxonomies.post_tag' },
	{ label: 'author_name', value: 'author_name' },
];

export default function Edit( { attributes, setAttributes } ) {
	const { attribute, label, limit, showMore, showMoreLimit, showCount, sortBy } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Refinement List Settings', 'instantsearch-for-wp' ) } initialOpen>
					<TextControl
						label={ __( 'Attribute', 'instantsearch-for-wp' ) }
						value={ attribute }
						onChange={ ( val ) => setAttributes( { attribute: val } ) }
						help={ __( 'The index attribute to filter by (e.g. taxonomies.category, author_name).', 'instantsearch-for-wp' ) }
					/>
					<TextControl
						label={ __( 'Label', 'instantsearch-for-wp' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						placeholder={ attribute }
						help={ __( 'Displayed above the list. Defaults to the attribute name.', 'instantsearch-for-wp' ) }
					/>
					<RangeControl
						label={ __( 'Max items shown', 'instantsearch-for-wp' ) }
						value={ limit }
						onChange={ ( val ) => setAttributes( { limit: val } ) }
						min={ 1 }
						max={ 50 }
					/>
					<ToggleControl
						label={ __( 'Show "Show more" button', 'instantsearch-for-wp' ) }
						checked={ showMore }
						onChange={ ( val ) => setAttributes( { showMore: val } ) }
					/>
					{ showMore && (
						<RangeControl
							label={ __( 'Max items when expanded', 'instantsearch-for-wp' ) }
							value={ showMoreLimit }
							onChange={ ( val ) => setAttributes( { showMoreLimit: val } ) }
							min={ limit }
							max={ 200 }
						/>
					) }
					<ToggleControl
						label={ __( 'Show item count', 'instantsearch-for-wp' ) }
						checked={ showCount }
						onChange={ ( val ) => setAttributes( { showCount: val } ) }
					/>
					<SelectControl
						label={ __( 'Sort items by', 'instantsearch-for-wp' ) }
						value={ sortBy }
						options={ [
							{ label: __( 'Refined first, then by count', 'instantsearch-for-wp' ), value: 'isRefined,count:desc,name:asc' },
							{ label: __( 'Count (most first)', 'instantsearch-for-wp' ), value: 'count:desc' },
							{ label: __( 'Name (A–Z)', 'instantsearch-for-wp' ), value: 'name:asc' },
							{ label: __( 'Name (Z–A)', 'instantsearch-for-wp' ), value: 'name:desc' },
						] }
						onChange={ ( val ) => setAttributes( { sortBy: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...useBlockProps() }>
				<div className="isfwp-widget-preview">
					<div className="isfwp-widget-preview__label">
						{ label || attribute }
					</div>
					{ [ 'Option A (12)', 'Option B (8)', 'Option C (3)' ].map( ( item ) => (
						<div key={ item } className="isfwp-widget-preview__mock-check">
							{ item }
						</div>
					) ) }
				</div>
			</div>
		</>
	);
}
