import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit( { attributes, setAttributes } ) {
	const { placeholder, debounce, autofocus, showSubmit, showReset } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Search Box Settings', 'instantsearch-for-wp' ) } initialOpen>
					<TextControl
						label={ __( 'Placeholder text', 'instantsearch-for-wp' ) }
						value={ placeholder }
						onChange={ ( val ) => setAttributes( { placeholder: val } ) }
					/>
					<TextControl
						label={ __( 'Debounce (ms)', 'instantsearch-for-wp' ) }
						type="number"
						help={ __( 'Set to 0 to disable search-as-you-type and only search when the user presses Enter.', 'instantsearch-for-wp' ) }
						value={ debounce ?? 0 }
						onChange={ ( val ) => {
							const parsed = Number.parseInt( val, 10 );
							setAttributes( {
								debounce: Number.isNaN( parsed ) ? 0 : Math.max( 0, parsed ),
							} );
						} }
						min={ 0 }
						step={ 50 }
					/>
					<ToggleControl
						label={ __( 'Auto-focus on load', 'instantsearch-for-wp' ) }
						checked={ autofocus }
						onChange={ ( val ) => setAttributes( { autofocus: val } ) }
					/>
					<ToggleControl
						label={ __( 'Show submit button', 'instantsearch-for-wp' ) }
						checked={ showSubmit }
						onChange={ ( val ) => setAttributes( { showSubmit: val } ) }
					/>
					<ToggleControl
						label={ __( 'Show reset button', 'instantsearch-for-wp' ) }
						checked={ showReset }
						onChange={ ( val ) => setAttributes( { showReset: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...useBlockProps() }>
				<div className="isfwp-widget-preview">
					<div className="isfwp-widget-preview__label">
						{ __( 'Search Box', 'instantsearch-for-wp' ) }
					</div>
					<div className="isfwp-widget-preview__mock-input">
						🔍 { placeholder }
					</div>
				</div>
			</div>
		</>
	);
}
