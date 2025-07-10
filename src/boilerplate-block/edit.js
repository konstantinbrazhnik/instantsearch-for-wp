/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { CheckboxControl, InspectorControls, PanelBody, TextControl, ToggleControl, useBlockProps } from '@wordpress/block-editor';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit() {
	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Boilerplate Block Settings', 'boilerplate-block')} initialOpen={true}>
					<p>{__('This is a boilerplate block. Customize it as needed.', 'boilerplate-block')}</p>
				</PanelBody>
				<PanelBody title={__('Additional Settings', 'boilerplate-block')} initialOpen={false}>
					<CheckboxControl
						label={__('Enable Feature X', 'boilerplate-block')}
						help={__('This feature does something useful.', 'boilerplate-block')}
						checked={false} // Replace with actual state management
						onChange={(value) => {
							// Handle the change event here
							console.log('Feature X enabled:', value);
						}}
					/>
					<TextControl
						label={__('Custom Text', 'boilerplate-block')}
						help={__('Enter some custom text for this block.', 'boilerplate-block')}
						value="" // Replace with actual state management
						onChange={(value) => {
							// Handle the change event here
							console.log('Custom text changed:', value);
						}}
					/>
					<ToggleControl
						label={__('Toggle Feature Y', 'boilerplate-block')}
						help={__('This toggles feature Y on or off.', 'boilerplate-block')}
						checked={false} // Replace with actual state management
						onChange={(value) => {
							// Handle the change event here
							console.log('Feature Y toggled:', value);
						}}
					/>
				</PanelBody>
				<PanelBody title={__('Instructions', 'boilerplate-block')} initialOpen={false}>
					<p>{__('You can use this block to add custom content. Modify the settings as needed.', 'boilerplate-block')}</p>
					<p>{__('For more information, refer to the block documentation.', 'boilerplate-block')}</p>
				</PanelBody>
			</InspectorControls>
			<p { ...useBlockProps() }>
				{ __(
					'Boilerplate Block – hello from the editor!',
					'boilerplate-block'
				) }
			</p>
		</>
	);
}
