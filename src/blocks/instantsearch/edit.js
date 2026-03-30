import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	RangeControl,
	SelectControl,
	Notice,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const ALLOWED_BLOCKS = [
	'instantsearch-for-wp/search-box',
	'instantsearch-for-wp/hits',
	'instantsearch-for-wp/refinement-list',
	'instantsearch-for-wp/pagination',
	'instantsearch-for-wp/stats',
	'instantsearch-for-wp/sort-by',
	'instantsearch-for-wp/current-refinements',
	'instantsearch-for-wp/clear-refinements',
	'core/columns',
	'core/column',
	'core/group',
];

const DEFAULT_TEMPLATE = [
	[ 'instantsearch-for-wp/search-box', { metadata: { name: 'Search Box' } } ],
	[ 'instantsearch-for-wp/stats', { metadata: { name: 'Result Count' } } ],
	[ 'instantsearch-for-wp/hits', { metadata: { name: 'Search Results' } } ],
	[ 'instantsearch-for-wp/pagination', { metadata: { name: 'Pagination' } } ],
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		indexName,
		useGlobalCredentials,
		customAppId,
		customApiKey,
		hitsPerPage,
		distinct,
		instanceId,
		metadata: blockMetadata = {},
	} = attributes;

	// Assign a stable instanceId from clientId on first render.
	useEffect( () => {
		if ( ! instanceId ) {
			setAttributes( { instanceId: clientId } );
		}
	}, [ clientId, instanceId, setAttributes ] );

	// Fetch available indexes via REST API.
	const indexes = useSelect( ( select ) => {
		const { getEntityRecords } = select( 'core' );
		return getEntityRecords( 'postType', 'isfwp_index', { per_page: 100, status: 'publish' } ) || [];
	}, [] );

	const indexOptions = [
		{ label: __( '— Use plugin default —', 'instantsearch-for-wp' ), value: '' },
		...indexes.map( ( idx ) => ( {
			label: idx.title?.rendered || idx.slug,
			value: idx.slug,
		} ) ),
	];

	// Check if child blocks include at least a search-box and hits.
	const innerBlocks = useSelect(
		( select ) => select( 'core/block-editor' ).getBlock( clientId )?.innerBlocks || [],
		[ clientId ]
	);

	const blockNames = innerBlocks.flatMap( ( b ) =>
		b.name === 'core/columns' || b.name === 'core/column' || b.name === 'core/group'
			? b.innerBlocks?.map( ( ib ) => ib.name ) || []
			: [ b.name ]
	);

	const hasSearchBox = blockNames.includes( 'instantsearch-for-wp/search-box' );
	const hasHits = blockNames.includes( 'instantsearch-for-wp/hits' );

	const blockProps = useBlockProps( {
		className: 'isfwp-block-instance',
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Index', 'instantsearch-for-wp' ) } initialOpen>
					<SelectControl
						label={ __( 'Index', 'instantsearch-for-wp' ) }
						value={ indexName }
						options={ indexOptions }
						onChange={ ( val ) => setAttributes( { indexName: val } ) }
						help={ __( 'Select which index to search, or leave empty to use the plugin default.', 'instantsearch-for-wp' ) }
					/>
					{ ! indexName && (
						<TextControl
							label={ __( 'Manual index name', 'instantsearch-for-wp' ) }
							value={ indexName }
							onChange={ ( val ) => setAttributes( { indexName: val } ) }
							placeholder={ __( 'e.g. my-site_posts', 'instantsearch-for-wp' ) }
						/>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Credentials', 'instantsearch-for-wp' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Use global plugin credentials', 'instantsearch-for-wp' ) }
						checked={ useGlobalCredentials }
						onChange={ ( val ) => setAttributes( { useGlobalCredentials: val } ) }
					/>
					{ ! useGlobalCredentials && (
						<>
							<TextControl
								label={ __( 'App ID', 'instantsearch-for-wp' ) }
								value={ customAppId }
								onChange={ ( val ) => setAttributes( { customAppId: val } ) }
							/>
							<TextControl
								label={ __( 'Search-Only API Key', 'instantsearch-for-wp' ) }
								value={ customApiKey }
								onChange={ ( val ) => setAttributes( { customApiKey: val } ) }
								type="password"
							/>
						</>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Search Parameters', 'instantsearch-for-wp' ) } initialOpen={ false }>
					<RangeControl
						label={ __( 'Hits per page', 'instantsearch-for-wp' ) }
						value={ hitsPerPage }
						onChange={ ( val ) => setAttributes( { hitsPerPage: val } ) }
						min={ 1 }
						max={ 100 }
					/>
					<ToggleControl
						label={ __( 'Distinct (deduplicate results)', 'instantsearch-for-wp' ) }
						checked={ distinct }
						onChange={ ( val ) => setAttributes( { distinct: val } ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Block Label', 'instantsearch-for-wp' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Label (shown in List View)', 'instantsearch-for-wp' ) }
						value={ blockMetadata.name ?? '' }
						onChange={ ( name ) =>
							setAttributes( { metadata: { ...blockMetadata, name } } )
						}
						placeholder={ __( 'e.g. Homepage Search', 'instantsearch-for-wp' ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ ( ! hasSearchBox || ! hasHits ) && (
					<Notice
						status="warning"
						isDismissible={ false }
						className="isfwp-block-notice"
					>
						{ __( 'Add at least a Search Box and a Hits block inside this container.', 'instantsearch-for-wp' ) }
					</Notice>
				) }

				<div className="isfwp-block-instance__header">
					<span className="isfwp-block-instance__label">
						{ __( 'InstantSearch', 'instantsearch-for-wp' ) }
						{ indexName ? `: ${ indexName }` : '' }
					</span>
				</div>

				<InnerBlocks
					allowedBlocks={ ALLOWED_BLOCKS }
					template={ DEFAULT_TEMPLATE }
					templateLock={ false }
				/>
			</div>
		</>
	);
}
