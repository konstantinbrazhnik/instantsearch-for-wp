import { __ } from '@wordpress/i18n';
import { 
	Button,
    Card, 
    CardBody, 
    CardHeader,
	SelectControl
} from '@wordpress/components';
import useSettings from '../hooks/use-settings';

const ProviderConfig = () => {
	
	const {
		provider,
		setProvider,
		saveSettings
	} = useSettings();

	return (
		<Card>
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
							disabled: true,
							label: 'Select a Provider',
							value: ''
						},
						{
							label: 'Algolia',
							value: 'algolia'
						},
						{
							label: 'TypeSense (Coming Soon)',
							value: 'typesense'
						}
					]}
					value={ provider }
				/>
				<Button variant="primary" onClick={ saveSettings } __next40pxDefaultSize>
					{ __('Save Provider', 'yoko-core') }
				</Button>
			</CardBody>
		</Card>
	);
};

export default ProviderConfig;