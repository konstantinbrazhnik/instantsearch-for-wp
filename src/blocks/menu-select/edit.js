import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, RangeControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit( { attributes, setAttributes } ) {
	const { attribute, label, hideWhenEmpty, limit, sortBy } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Menu Select Settings', 'instantsearch-for-wp' ) } initialOpen>
					<TextControl
						label={ __( 'Attribute', 'instantsearch-for-wp' ) }
						value={ attribute }
						onChange={ ( val ) => setAttributes( { attribute: val } ) }
						help={ __( 'The index attribute to filter by (e.g. taxonomies.category, post_type).', 'instantsearch-for-wp' ) }
					/>
					<TextControl
						label={ __( 'Label', 'instantsearch-for-wp' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						placeholder={ attribute }
						help={ __( 'Used as the panel heading. Defaults to the attribute name.', 'instantsearch-for-wp' ) }
					/>
					<ToggleControl
						label={ __( 'Hide panel if no facet values are available', 'instantsearch-for-wp' ) }
						checked={ hideWhenEmpty }
						onChange={ ( val ) => setAttributes( { hideWhenEmpty: val } ) }
					/>
					<RangeControl
						label={ __( 'Max options shown', 'instantsearch-for-wp' ) }
						value={ limit }
						onChange={ ( val ) => setAttributes( { limit: val } ) }
						min={ 1 }
						max={ 50 }
					/>
					<TextControl
						label={ __( 'Sort by', 'instantsearch-for-wp' ) }
						value={ ( sortBy || [] ).join( ', ' ) }
						onChange={ ( val ) =>
							setAttributes( {
								sortBy: val
									.split( ',' )
									.map( ( s ) => s.trim() )
									.filter( Boolean ),
							} )
						}
						help={ __( 'Comma-separated sort criteria (e.g. name:asc, count:desc).', 'instantsearch-for-wp' ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...useBlockProps() }>
				<div className="isfwp-widget-preview">
					<div className="isfwp-widget-preview__label">
						{ label || attribute }
					</div>
					<div className="isfwp-widget-preview__mock-select">
						<select disabled style={ { width: '100%', padding: '4px 8px' } }>
							<option>{ __( 'All', 'instantsearch-for-wp' ) }</option>
							<option>Option A</option>
							<option>Option B</option>
							<option>Option C</option>
						</select>
					</div>
				</div>
			</div>
		</>
	);
}
