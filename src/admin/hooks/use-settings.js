import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { store as noticesStore } from '@wordpress/notices';
import { useEffect, useState } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';

const useSettings = () => {

	const [ provider, setProvider ] = useState();
	const [ postTypes, setPostTypes ] = useState();
	const [loading, setLoading] = useState(true);

	const { 
		createErrorNotice,
		createSuccessNotice
	} = useDispatch( noticesStore );

	useEffect( () => {
		apiFetch( { path: '/wp/v2/settings' } ).then( ( settings ) => {
			console.log(settings);
			setProvider( settings.instantsearch_for_wp_settings?.provider || 'algolia' );
			setPostTypes( settings.instantsearch_for_wp_settings?.post_types || [] );
			setLoading(false);
		} );
	}, [] );

	const saveSettings = () => {
		setLoading(true);
		apiFetch( {
			path: '/wp/v2/settings',
			method: 'POST',
			data: {
				instantsearch_for_wp_settings: {
					provider,
					post_types: postTypes,
				},
			},
		} ).then( () => {
			createSuccessNotice(
				__( 'Settings saved.', 'instantsearch-for-wp' )
			);
		} ).catch( ( error ) => {
			createErrorNotice(
				__( 'Error saving settings: ', 'instantsearch-for-wp' ) + error.message,
				{ type: 'snackbar' }
			);
		} ).finally( () => {
			setLoading(false);
		} );
	};

	return {
		provider,
		setProvider,
		postTypes,
		setPostTypes,
		saveSettings
	};
};

export default useSettings;

