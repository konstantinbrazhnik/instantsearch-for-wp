import { Button, __experimentalHStack as HStack, FormTokenField, ProgressBar } from "@wordpress/components";
import { useEffect, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { store as noticesStore } from '@wordpress/notices';
import { useDispatch } from '@wordpress/data';
import apiFetch from "@wordpress/api-fetch";

import { useAdminContext } from "./AdminContext";
import SearchConfiguration from "./SearchConfiguration";

const IndexOptions = ({ index, indexId }) => {
	const { loading, setLoading, getAvailableIndexingParameters } = useAdminContext();
	
	const [_index, setIndex] = useState(index);
	const [indexCpt, setIndexCpt] = useState(null);
	const [availableParamenters, setAvailableParameters] = useState({});
	
	const [indexing, setIndexing] = useState(false);
	const [indexingProgress, setIndexingProgress] = useState(0);
	const [indexedTotalPosts, setIndexedTotalPosts] = useState(null);
	const [indexPostsIndexed, setIndexPostsIndexed] = useState(0);

	const { 
		createErrorNotice,
		createSuccessNotice
	} = useDispatch( noticesStore );

	useEffect(() => {
		async function fetchPostTypes() {
			const [types, indexCpts] = await Promise.all([
				getAvailableIndexingParameters(),
				apiFetch( { path: `/wp/v2/isfwp_index${indexId ? `/${indexId}` : ''}?context=edit` } )
			]);
			setAvailableParameters(types || {});

			const _indexCpt = indexCpts.id ? indexCpts : indexCpts.shift();
			setIndexCpt(() => _indexCpt);
			setIndex(_indexCpt.content?.raw ? JSON.parse(_indexCpt.content.raw) : {} );
		}
		fetchPostTypes();
	}, []);

	const handleSave = async () => {
		setLoading(true);
		const newPost = await apiFetch( {
			path: `/wp/v2/isfwp_index${indexCpt?.id ? `/${indexCpt.id}` : ''}`,
			method: 'POST',
			data: {
				title: indexCpt?.title?.rendered || __('Search', 'instantsearch-for-wp'),
				slug: indexCpt?.slug || 'search',
				content: JSON.stringify(_index),
				status: 'publish',
			},
		} );
		setIndexCpt(newPost);
		createSuccessNotice(
			__( 'Index saved successfully.', 'instantsearch-for-wp' )
		);
		setLoading(false);
	};

	const handleIndexAll = async () => {
		setIndexing(true);
		try {
			let completed = 0,
				offset = 0;

			while (completed < 100) {
				let {indexed_post_ids, total_posts, complete_percent, error} = await apiFetch( {
					path: '/wp/v2/isfwp_index/' + indexCpt.id + '/run-indexer',
					method: 'POST',
					data: {
						batch_size: 100,
						offset,
					},
				} );

				if (error) {
					throw new Error(error);
				}

				completed = complete_percent;
				setIndexingProgress(completed);
				setIndexedTotalPosts(total_posts);
				setIndexPostsIndexed((prev) => prev + indexed_post_ids.length);
				offset += indexed_post_ids.length;
			}

			createSuccessNotice(
				__( 'Indexing completed successfully.', 'instantsearch-for-wp' )
			);
		} catch (error) {
			console.error('Error during indexing:', error);
			createErrorNotice(
				__( 'Error during indexing: ', 'instantsearch-for-wp' ) + error.message,
				{ type: 'snackbar' }
			);
		}
		setIndexPostsIndexed(0);
		setIndexingProgress(0);
		setIndexedTotalPosts(null);
		setIndexing(false);
	};

	return (
		<>
			<h3>{__('INDEX', 'instantsearch-for-wp')}: {indexCpt?.title?.rendered || __('Search', 'instantsearch-for-wp')}</h3>
			<FormTokenField
				__experimentalExpandOnFocus
				__experimentalValidateInput={(token) => availableParamenters?.post_types[token] ? true : false}
				__next40pxDefaultSize
				__experimentalRenderItem={({item}) => {
					return availableParamenters?.post_types[item]
						? <>{availableParamenters.post_types[item]} ({item})</>
						: item;
				}}
				label={__('Post Types', 'instantsearch-for-wp')}
				onChange={(value) => {
					setIndex((idx) => ({...idx, post_types: value}));
				}}
				suggestions={availableParamenters?.post_types ? Object.keys(availableParamenters.post_types) : []}
				value={_index?.post_types || []}
			/>
			<FormTokenField
				__experimentalExpandOnFocus
				__experimentalValidateInput={(token) => availableParamenters?.taxonomies[token] ? true : false}
				__next40pxDefaultSize
				__experimentalRenderItem={({item}) => {
					return availableParamenters?.taxonomies[item]
						? <>{availableParamenters.taxonomies[item]} ({item})</>
						: item;
				}}
				label={__('Taxonomies', 'instantsearch-for-wp')}
				onChange={(value) => {
					setIndex((idx) => ({...idx, taxonomies: value}));
				}}
				suggestions={availableParamenters?.taxonomies ? Object.keys(availableParamenters.taxonomies) : []}
				value={_index?.taxonomies || []}
			/>
			<br />
			<Button disabled={ loading } variant="primary" onClick={ handleSave } __next40pxDefaultSize>
				{ __('Save Index', 'instantsearch-for-wp') }
			</Button>
			
			<h4>{__( 'Reindex', 'instantsearch-for-wp' )}</h4>
			<p>{__('Reindex all posts to update the search index. Do not close this page until the indexing is finished.', 'instantsearch-for-wp')}</p>
			<HStack gap={ 2 } style={{ justifyContent: 'flex-start' }}>
				<Button disabled={ indexing || loading } variant="primary" onClick={ handleIndexAll } __next40pxDefaultSize>
					{ indexing ? __('Indexing...', 'instantsearch-for-wp') : __('Index All Posts', 'instantsearch-for-wp') }
				</Button>
				{indexing && <ProgressBar value={indexingProgress} style={{ flex: 1, width: '100%' }} />}
				{indexing && indexedTotalPosts !== null && (<p>{__('Indexed Posts:', 'instantsearch-for-wp')}{indexPostsIndexed} / {indexedTotalPosts}</p>)}
			</HStack>

			{
				indexCpt?.id && (
					<>
						<br />
						<hr />
						<SearchConfiguration index={_index} indexCpt={indexCpt} />
					</>
				)
			}
		</>
	);
};

export default IndexOptions;