import { Button, __experimentalNumberControl as NumberControl, SelectControl, TextControl, ToggleControl } from "@wordpress/components";
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { useAdminContext } from "./AdminContext";

const indexName = (indexCptName) => `${window.instantsearchAdmin.indexPrefix}${indexCptName}`;

const SearchConfiguration = ({ index, indexCpt }) => {
	const {
		loading,
		saveSettings,
		setLoading,
		settings
	} = useAdminContext();
	
	const [useSearchSettings, setUseSearchSettings] = useState({
		algolia: settings?.algolia || {},
		use_as_sitesearch: settings?.use_as_sitesearch || false,
		sitesearch_settings: settings?.sitesearch_settings || {}
	});
	
	const saveSearchSettings = async () => {
		setLoading(true);
		await saveSettings(useSearchSettings);
		setLoading(false);
	}
	return (
		<>
			<h3>{__('Search Configuration', 'instantsearch-for-wp')}</h3>
			<ToggleControl
				label={__('Enable Instant Search for WP site search.', 'instantsearch-for-wp')}
				checked={useSearchSettings?.use_as_sitesearch}
				onChange={(value) => setUseSearchSettings((prev) => ({ ...prev, use_as_sitesearch: value ? true : false }))}
			/>
			{
				useSearchSettings?.use_as_sitesearch && (
					<>
						<p>{__('Instant Search is enabled. Your site search will now use Instant Search for WP.', 'instantsearch-for-wp')}</p>
						<h3>{__('Sidebar Settings', 'instantsearch-for-wp')}</h3>

						<h4>{__('Facet Display', 'instantsearch-for-wp')}</h4>
						<p>{__('Configure Site Search facets directly in the Algolia indext Facet Display screen.', 'instantsearch-for-wp')}</p>
						<Button variant="primary" href={`https://dashboard.algolia.com/apps/${settings.algolia.app_id}/explorer/configuration/${indexName(indexCpt?.slug)}/facet-display`} target="_blank" rel="noopener noreferrer">
							{__('Go to index Facet Display settings.', 'instantsearch-for-wp')}
						</Button>

						<h4>{__('Ranking', 'instantsearch-for-wp')}</h4>
						<p>{__('Configure Site Search ranking directly in the Algolia index Ranking screen.', 'instantsearch-for-wp')}</p>
						<Button variant="primary" href={`https://dashboard.algolia.com/apps/${settings.algolia.app_id}/explorer/configuration/${indexName(indexCpt?.slug)}/ranking-and-sorting`} target="_blank" rel="noopener noreferrer">
							{__('Go to index Ranking settings.', 'instantsearch-for-wp')}
						</Button>

						<h4>{__('Other Settings', 'instantsearch-for-wp')}</h4>
						<TextControl
							label={__('Search Input Placeholder Text', 'instantsearch-for-wp')}
							value={useSearchSettings?.sitesearch_settings?.placeholder_text || __('Search...', 'instantsearch-for-wp')}
							onChange={(value) => setUseSearchSettings((prev) => ({
								...prev,
								sitesearch_settings: {
									...prev.sitesearch_settings,
									placeholder_text: value,
								}
							}))}
						/>
						<NumberControl
							label={__('Snippet Length (in words)', 'instantsearch-for-wp')}
							value={useSearchSettings?.sitesearch_settings?.snippet_length || 50}
							onChange={(value) => setUseSearchSettings((prev) => ({
								...prev,
								sitesearch_settings: {
									...prev.sitesearch_settings,
									snippet_length: parseInt(value, 10),
								}
							}))}
						/>
						<SelectControl
							label={__('Sidebar Position', 'instantsearch-for-wp')}
							value={useSearchSettings?.sitesearch_settings?.sidebar_position || 'left'}
							options={[
								{ label: __('Left', 'instantsearch-for-wp'), value: 'left' },
								{ label: __('Right', 'instantsearch-for-wp'), value: 'right' },
							]}
							onChange={(value) => setUseSearchSettings((prev) => ({
								...prev,
								sitesearch_settings: {
									...prev.sitesearch_settings,
									sidebar_position: value,
								}
							}))}
						/>
						<ToggleControl
							help={__('Free Algolia accounts are required to show the Powered by Algolia badge. You can hide it if you have a paid account.', 'instantsearch-for-wp')}
							label={__('Hide Powered by Algolia Badge', 'instantsearch-for-wp')}
							checked={useSearchSettings?.algolia?.hide_algolia_badge || false}
							onChange={(value) => setUseSearchSettings((prev) => ({
								...prev,
								algolia: {
									...prev.algolia,
									hide_algolia_badge: value,
								}
							}))}
						/>

						{/* TODO: Add hits template field. */}

						{/* TODO: Finish Facet Overrides */}
						{/* <FacetOverrides index={index} /> */}
					</>
				)
			}
			<br /><br />
			<Button disabled={ loading } variant="primary" onClick={ () => saveSearchSettings() } __next40pxDefaultSize>
				{ loading ? __('Saving...', 'instantsearch-for-wp') : __('Save Search Settings', 'instantsearch-for-wp') }
			</Button>
		</>
	);
}

export default SearchConfiguration;