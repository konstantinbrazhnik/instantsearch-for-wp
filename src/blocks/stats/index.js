import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

registerBlockType( metadata.name, {
	edit() {
		return (
			<div { ...useBlockProps() }>
				<div className="isfwp-widget-preview">
					<div className="isfwp-widget-preview__label">{ __( 'Stats', 'instantsearch-for-wp' ) }</div>
					<span style={ { fontSize: '0.875rem', color: '#718096' } }>
						{ __( '42 results found in 3ms', 'instantsearch-for-wp' ) }
					</span>
				</div>
			</div>
		);
	},
	save: () => null,
} );
