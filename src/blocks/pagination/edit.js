import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit( { attributes, setAttributes } ) {
	const { padding } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Pagination Settings', 'instantsearch-for-wp' ) } initialOpen>
					<RangeControl
						label={ __( 'Page number padding', 'instantsearch-for-wp' ) }
						value={ padding }
						onChange={ ( val ) => setAttributes( { padding: val } ) }
						min={ 1 }
						max={ 10 }
						help={ __( 'How many page numbers to show on each side of the current page.', 'instantsearch-for-wp' ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...useBlockProps() }>
				<div className="isfwp-widget-preview">
					<div className="isfwp-widget-preview__label">{ __( 'Pagination', 'instantsearch-for-wp' ) }</div>
					<div className="isfwp-widget-preview__mock-page">
						{ [ '«', '1', '2', '3', '4', '5', '»' ].map( ( p ) => (
							<span key={ p } style={ p === '2' ? { background: '#3182ce', color: '#fff', borderColor: '#3182ce' } : {} }>{ p }</span>
						) ) }
					</div>
				</div>
			</div>
		</>
	);
}
