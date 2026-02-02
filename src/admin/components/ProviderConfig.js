import { __ } from '@wordpress/i18n';
import { 
	Button,
    Card, 
    CardBody, 
    CardHeader,
	SelectControl
} from '@wordpress/components';
import AlgoliaConfig from './AlgoliaConfig';
import { useAdminContext } from './AdminContext';

const ProviderConfig = () => {
	
	const {
		loading,
		provider,
		setProvider,
		saveSettings
	} = useAdminContext();

	const renderProviderOptions = () => {
		switch (provider) {
			case 'algolia':
				// Return Algolia specific configuration component
				return <AlgoliaConfig />; // Placeholder for AlgoliaConfig component
			case 'typesense':
				// Return TypeSense specific configuration component
				return null; // Placeholder for TypeSenseConfig component
			default:
				return null;
		}
	};

	return (
		<>
			<CardHeader>
				<h2>{__('Choose a Provider', 'yoko-core')}</h2>
			</CardHeader>
			<CardBody>
				<SelectControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					help="Choose your provider of choice."
					label="Provider"
					onChange={setProvider}
					options={[
						{
							label: 'Select a Provider',
							value: ''
						},
						{
							label: 'Algolia',
							value: 'algolia'
						},
						{
							label: 'TypeSense (Coming Soon)',
							value: 'typesense',
							disabled: true
						}
					]}
					value={ provider }
				/>

				{ renderProviderOptions() }
				<br />
				<Button disabled={ loading } variant="primary" onClick={ () => saveSettings() } __next40pxDefaultSize>
					{ __('Save Provider', 'instantsearch-for-wp') }
				</Button>
			</CardBody>
		</>
	);
};

export default ProviderConfig;