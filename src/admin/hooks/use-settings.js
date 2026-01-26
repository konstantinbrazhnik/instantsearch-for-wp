import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { store as noticesStore } from '@wordpress/notices';
import { useEffect, useState } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';

const useSettings = () => {

	const [settings, setSettings] = useState({});
	const [ provider, setProvider ] = useState();
	const [ algoliaConfig, setAlgoliaConfig ] = useState({});
	const [availableIndexingParameters, setAvailableIndexingParameters ] = useState({});
	
	const [initialLoading, setInitialLoading] = useState(true);
	const [loading, setLoading] = useState(false);

	const { 
		createErrorNotice,
		createSuccessNotice
	} = useDispatch( noticesStore );

	useEffect( () => {
		apiFetch( { path: '/instantsearch-for-wp/v1/settings' } ).then( ( settings ) => {
			console.log(settings);
			setProvider( settings?.provider || 'algolia' );
			setAlgoliaConfig( settings?.algolia || {} );
			setSettings(settings || {});
			setInitialLoading(false);
		} );
	}, [] );

	const saveSettings = (newSettings = {}) => {
		setLoading(true);
		const instantsearch_for_wp_settings = {
			provider,
			algolia: algoliaConfig,
			...newSettings
		};
		apiFetch( {
			path: '/wp/v2/settings',
			method: 'POST',
			data: {
				instantsearch_for_wp_settings
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

	const getAvailableIndexingParameters = () => {
		if ( Object.keys(availableIndexingParameters).length > 0 ) {
			return availableIndexingParameters;
		}
		return apiFetch( { path: '/instantsearch-for-wp/v1/available-indexing-parameters' } ).then( ( response ) => {
			setAvailableIndexingParameters( response || {} );
			return response || {};
		} ).catch( ( error ) => {
			createErrorNotice(
				__( 'Error fetching available post types: ', 'instantsearch-for-wp' ) + error.message,
				{ type: 'snackbar' }
			);
		} );
	}

	return {
		algoliaConfig,
		getAvailableIndexingParameters,
		setAlgoliaConfig,
		initialLoading,
		loading,
		setLoading,
		provider,
		setProvider,
		settings,
		saveSettings
	};
};

export default useSettings;

