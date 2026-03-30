import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit( { attributes, setAttributes } ) {
	const { showImage, showExcerpt, customClass } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Hits Settings', 'instantsearch-for-wp' ) } initialOpen>
					<ToggleControl
						label={ __( 'Show featured image', 'instantsearch-for-wp' ) }
						checked={ showImage }
						onChange={ ( val ) => setAttributes( { showImage: val } ) }
					/>
					<ToggleControl
						label={ __( 'Show excerpt', 'instantsearch-for-wp' ) }
						checked={ showExcerpt }
						onChange={ ( val ) => setAttributes( { showExcerpt: val } ) }
					/>
					<TextControl
						label={ __( 'Custom CSS class', 'instantsearch-for-wp' ) }
						value={ customClass }
						onChange={ ( val ) => setAttributes( { customClass: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...useBlockProps() }>
				<div className="isfwp-widget-preview">
					<div className="isfwp-widget-preview__label">
						{ __( 'Search Results (Hits)', 'instantsearch-for-wp' ) }
					</div>
					{ [ 1, 2, 3 ].map( ( i ) => (
						<div key={ i } style={ { marginBottom: '0.5rem', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' } }>
							<div className="isfwp-widget-preview__mock-hit isfwp-widget-preview__mock-hit--medium" style={ { background: '#3182ce', height: '0.875rem', width: i === 2 ? '55%' : '75%', borderRadius: '2px', marginBottom: '0.375rem' } } />
							{ showExcerpt && (
								<>
									<div className="isfwp-widget-preview__mock-hit" style={ { height: '0.75rem', marginBottom: '0.25rem' } } />
									<div className="isfwp-widget-preview__mock-hit isfwp-widget-preview__mock-hit--short" />
								</>
							) }
						</div>
					) ) }
				</div>
			</div>
		</>
	);
}
