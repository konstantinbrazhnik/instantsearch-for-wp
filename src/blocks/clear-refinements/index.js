import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const { buttonLabel, includedAttributes } = attributes;
		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Clear Refinements Settings', 'instantsearch-for-wp' ) } initialOpen>
						<TextControl
							label={ __( 'Button label', 'instantsearch-for-wp' ) }
							value={ buttonLabel }
							onChange={ ( val ) => setAttributes( { buttonLabel: val } ) }
						/>
						<TextControl
							label={ __( 'Limit to attributes (optional)', 'instantsearch-for-wp' ) }
							value={ includedAttributes }
							onChange={ ( val ) => setAttributes( { includedAttributes: val } ) }
							placeholder="category, brand"
							help={ __( 'Comma-separated. Leave empty to clear all refinements.', 'instantsearch-for-wp' ) }
						/>
					</PanelBody>
				</InspectorControls>
				<div { ...useBlockProps() }>
					<div className="isfwp-widget-preview">
						<div className="isfwp-widget-preview__label">{ __( 'Clear Refinements', 'instantsearch-for-wp' ) }</div>
						<button
							disabled
							style={ { padding: '0.375rem 0.75rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'default', fontSize: '0.875rem' } }
						>
							{ buttonLabel }
						</button>
					</div>
				</div>
			</>
		);
	},
	save: () => null,
} );
