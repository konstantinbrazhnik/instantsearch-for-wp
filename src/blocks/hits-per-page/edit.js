import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	Button,
	TextControl,
	ToggleControl,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit( { attributes, setAttributes } ) {
	const { label, appendLabelToOptions = false, items = [] } = attributes;

	const optionLabelSuffix = appendLabelToOptions && label
		? label.charAt( 0 ).toLowerCase() + label.slice( 1 )
		: '';

	function updateItem( index, field, value ) {
		const next = items.map( ( item, itemIndex ) => {
			if ( itemIndex !== index ) {
				return item;
			}

			if ( field === 'default' && value ) {
				return { ...item, default: true };
			}

			return { ...item, [ field ]: value };
		} ).map( ( item, itemIndex ) => {
			if ( field === 'default' && value && itemIndex !== index ) {
				return { ...item, default: false };
			}

			return item;
		} );

		setAttributes( { items: next } );
	}

	function addItem() {
		setAttributes( {
			items: [ ...items, { label: '', value: 10, default: items.length === 0 } ],
		} );
	}

	function removeItem( index ) {
		const next = items.filter( ( _, itemIndex ) => itemIndex !== index );
		if ( next.length > 0 && ! next.some( ( item ) => item.default ) ) {
			next[ 0 ] = { ...next[ 0 ], default: true };
		}

		setAttributes( { items: next } );
	}

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Hits Per Page Settings', 'instantsearch-for-wp' ) } initialOpen>
					<TextControl
						label={ __( 'Label', 'instantsearch-for-wp' ) }
						value={ label }
						onChange={ ( value ) => setAttributes( { label: value } ) }
						help={ __( 'Used above the select, or appended to option labels when enabled below.', 'instantsearch-for-wp' ) }
					/>
					<ToggleControl
						label={ __( 'Append label to option labels', 'instantsearch-for-wp' ) }
						checked={ appendLabelToOptions }
						onChange={ ( value ) => setAttributes( { appendLabelToOptions: value } ) }
						help={ __( 'When enabled, hides the standalone label and renders options like "10 results per page".', 'instantsearch-for-wp' ) }
					/>
					{ items.map( ( item, index ) => (
						<VStack key={ index } style={ { marginBottom: '1rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px' } }>
							<TextControl
								label={ __( 'Option label', 'instantsearch-for-wp' ) }
								value={ item.label }
								onChange={ ( value ) => updateItem( index, 'label', value ) }
								placeholder={ __( 'e.g. 10 results', 'instantsearch-for-wp' ) }
							/>
							<TextControl
								label={ __( 'Hits per page', 'instantsearch-for-wp' ) }
								type="number"
								value={ item.value }
								onChange={ ( value ) => {
									const parsed = Number.parseInt( value, 10 );
									updateItem( index, 'value', Number.isNaN( parsed ) ? 10 : Math.max( 1, parsed ) );
								} }
								min={ 1 }
							/>
							<ToggleControl
								label={ __( 'Default option', 'instantsearch-for-wp' ) }
								checked={ item.default === true }
								onChange={ ( value ) => updateItem( index, 'default', value ) }
							/>
							<Button
								variant="tertiary"
								isDestructive
								onClick={ () => removeItem( index ) }
								style={ { justifyContent: 'flex-start' } }
							>
								{ __( 'Remove', 'instantsearch-for-wp' ) }
							</Button>
						</VStack>
					) ) }
					<Button variant="secondary" onClick={ addItem }>
						{ __( '+ Add page-size option', 'instantsearch-for-wp' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<div { ...useBlockProps() }>
				<div className="isfwp-widget-preview">
					{ ! appendLabelToOptions && (
						<div className="isfwp-widget-preview__label">{ label || __( 'Hits Per Page', 'instantsearch-for-wp' ) }</div>
					) }
					<select style={ { padding: '0.375rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.875rem', background: '#fff', width: '100%' } } disabled>
						{ items.length > 0
							? items.map( ( item, index ) => {
								const baseLabel = item.label || item.value;
								const previewLabel = optionLabelSuffix ? `${ baseLabel } ${ optionLabelSuffix }` : baseLabel;
								return <option key={ index }>{ previewLabel }</option>;
							} )
							: <option>{ __( '— Configure page sizes —', 'instantsearch-for-wp' ) }</option>
						}
					</select>
				</div>
			</div>
		</>
	);
}