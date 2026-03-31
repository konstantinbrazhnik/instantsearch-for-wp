import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const { excludedAttributes } = attributes;
		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Current Refinements Settings', 'instantsearch-for-wp' ) } initialOpen>
						<TextControl
							label={ __( 'Excluded attributes', 'instantsearch-for-wp' ) }
							value={ excludedAttributes }
							onChange={ ( val ) => setAttributes( { excludedAttributes: val } ) }
							placeholder="query"
							help={ __( 'Comma-separated list of attributes to hide from chips.', 'instantsearch-for-wp' ) }
						/>
					</PanelBody>
				</InspectorControls>
				<div { ...useBlockProps() }>
					<div className="isfwp-widget-preview">
						<div className="isfwp-widget-preview__label">{ __( 'Current Refinements', 'instantsearch-for-wp' ) }</div>
						<div style={ { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } }>
							{ [ 'Category: News', 'Author: Admin' ].map( ( chip ) => (
								<span key={ chip } style={ { padding: '0.2rem 0.6rem', background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '9999px', fontSize: '0.8125rem' } }>
									{ chip } ✕
								</span>
							) ) }
						</div>
					</div>
				</div>
			</>
		);
	},
	save: () => null,
} );
