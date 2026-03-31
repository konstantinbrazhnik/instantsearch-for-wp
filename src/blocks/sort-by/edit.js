import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, Button, TextControl, __experimentalVStack as VStack } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit( { attributes, setAttributes } ) {
	const { items } = attributes;

	function updateItem( index, field, value ) {
		const next = items.map( ( item, i ) =>
			i === index ? { ...item, [ field ]: value } : item
		);
		setAttributes( { items: next } );
	}

	function addItem() {
		setAttributes( { items: [ ...items, { label: '', value: '' } ] } );
	}

	function removeItem( index ) {
		setAttributes( { items: items.filter( ( _, i ) => i !== index ) } );
	}

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Sort By Settings', 'instantsearch-for-wp' ) } initialOpen>
					<p style={ { fontSize: '0.8125rem', color: '#718096', marginTop: 0 } }>
						{ __( 'Add an entry for each sort option. The value should be the replica index name.', 'instantsearch-for-wp' ) }
					</p>
					{ items.map( ( item, i ) => (
						<VStack key={ i } style={ { marginBottom: '1rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px' } }>
							<TextControl
								label={ __( 'Label', 'instantsearch-for-wp' ) }
								value={ item.label }
								onChange={ ( val ) => updateItem( i, 'label', val ) }
								placeholder={ __( 'e.g. Newest first', 'instantsearch-for-wp' ) }
							/>
							<TextControl
								label={ __( 'Index name', 'instantsearch-for-wp' ) }
								value={ item.value }
								onChange={ ( val ) => updateItem( i, 'value', val ) }
								placeholder={ __( 'e.g. my-index_date_desc', 'instantsearch-for-wp' ) }
							/>
							<Button
								variant="tertiary"
								isDestructive
								onClick={ () => removeItem( i ) }
								style={ { justifyContent: 'flex-start' } }
							>
								{ __( 'Remove', 'instantsearch-for-wp' ) }
							</Button>
						</VStack>
					) ) }
					<Button variant="secondary" onClick={ addItem }>
						{ __( '+ Add sort option', 'instantsearch-for-wp' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<div { ...useBlockProps() }>
				<div className="isfwp-widget-preview">
					<div className="isfwp-widget-preview__label">{ __( 'Sort By', 'instantsearch-for-wp' ) }</div>
					<select style={ { padding: '0.375rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.875rem', background: '#fff', width: '100%' } } disabled>
						{ items.length > 0
							? items.map( ( item, i ) => <option key={ i }>{ item.label || item.value }</option> )
							: <option>{ __( '— Configure sort options —', 'instantsearch-for-wp' ) }</option>
						}
					</select>
				</div>
			</div>
		</>
	);
}
