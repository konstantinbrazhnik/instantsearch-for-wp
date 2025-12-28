import { __ } from "@wordpress/i18n";
import { TextControl } from "@wordpress/components";

import { useAdminContext } from "./AdminContext";

const AlgoliaConfig = () => {
	const {
		algoliaConfig,
		setAlgoliaConfig
	} = useAdminContext();

	return <div className="algolia-config instantsearch-provider-config">
		<p>{ __('Algolia specific configuration options will go here.', 'yoko-core') }</p>
		<TextControl
			__next40pxDefaultSize
			label={ __('Application ID', 'yoko-core') }
			help={ __('Enter your Algolia Application ID.', 'yoko-core') }
			onChange={ ( value ) => setAlgoliaConfig( { ...algoliaConfig, app_id: value } ) }
			value={algoliaConfig?.app_id || '' }
		/>
		<TextControl
			__next40pxDefaultSize
			label={ __('Search-Only API Key', 'yoko-core') }
			help={ __('Enter your Algolia Search-Only API Key.', 'yoko-core') }
			onChange={ ( value ) => setAlgoliaConfig( { ...algoliaConfig, search_only_api_key: value } ) }
			value={algoliaConfig?.search_only_api_key || '' }
		/>
		<TextControl
			__next40pxDefaultSize
			label={ __('Admin API Key', 'yoko-core') }
			help={ __('Enter your Algolia Admin API Key.', 'yoko-core') }
			onChange={ ( value ) => setAlgoliaConfig( { ...algoliaConfig, admin_api_key: value } ) }
			value={algoliaConfig?.admin_api_key || '' }
		/>
	</div>;
}
export default AlgoliaConfig;
