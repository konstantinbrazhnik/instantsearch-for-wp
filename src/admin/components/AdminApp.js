import apiFetch from '@wordpress/api-fetch';
import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { 
    Card, 
    CardBody, 
    CardHeader, 
    Navigation, 
    NavigationMenu, 
    NavigationItem,
    Panel,
    PanelBody,
	SelectControl
} from '@wordpress/components';
import ProviderConfig from './ProviderConfig';
import { Notices } from './Notices';
import useSettings from '../hooks/use-settings';

const AdminApp = () => {
    const [activeScreen, setActiveScreen] = useState('provider');

	const {
		provider
	} = useSettings();

    // Hash-based routing
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substr(1);
            // Only allow navigation to certain screens if provider is selected
            const allowedScreens = ['provider', 'credentials', 'post-types', 'indexing', 'analytics'];
                
            if (hash && allowedScreens.includes(hash)) {
                setActiveScreen(hash);
            } else if (!provider) {
                setActiveScreen('provider');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Check hash on initial load

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [provider]);

    const handleProviderSelected = (provider) => {
        setSelectedProvider(provider);
    };

    const handleScreenChange = (screen) => {
        // Prevent navigation if provider not selected (except to provider screen)
        if (!selectedProvider && screen !== 'provider') {
            return;
        }
        setActiveScreen(screen);
        window.location.hash = screen;
    };

    const renderScreen = () => {
        switch (activeScreen) {
            case 'provider':
				return (<ProviderConfig onProviderSelected={handleProviderSelected} />);
            case 'credentials':
            case 'post-types':
            case 'indexing':
            case 'analytics':
            default:
                return (
                    <Card>
                        <CardHeader>
                            <h2>{__('Instant Search for WordPress', 'yoko-core')}</h2>
                        </CardHeader>
                        <CardBody>
							<p>{__('This section is under construction. Please check back later.', 'yoko-core')}</p>
                        </CardBody>
                    </Card>
                );
        }
    };

    // Navigation items - order changes based on whether provider is selected
    const getNavigationItems = () => {
        return [
			{ id: 'indexing', label: __('Indexing', 'yoko-core'), icon: 'update' },
			{ id: 'credentials', label: __('Server Credentials', 'yoko-core'), icon: 'admin-network' },
			{ id: 'post-types', label: __('Post Types', 'yoko-core'), icon: 'admin-post' },
			{ id: 'analytics', label: __('Analytics (Coming Soon)', 'yoko-core'), icon: 'chart-area', disabled: true },
			{ id: 'provider', label: __('Provider Setup', 'yoko-core'), icon: 'admin-settings' }
		];
    };

    const navigationItems = getNavigationItems();

    return (
        <div id="instantsearch-admin">
			
			<Notices />
            
            <div className="instantsearch-admin__content">
                {renderScreen()}
            </div>
        </div>
    );
};

export default AdminApp;

