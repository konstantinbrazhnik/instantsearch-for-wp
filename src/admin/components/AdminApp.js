import apiFetch from '@wordpress/api-fetch';
import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
    Card, 
    CardBody, 
    CardHeader,
	Spinner
} from '@wordpress/components';
import ProviderConfig from './ProviderConfig';
import { Notices } from './Notices';
import AdminNavigation from './AdminNavigation';
import { useAdminContext } from './AdminContext';

const AdminApp = () => {
    const [activeScreen, setActiveScreen] = useState('provider');

	const {
		loading,
		provider
	} = useAdminContext();

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

    const handleScreenChange = (screen) => {
        // Prevent navigation if provider not selected (except to provider screen)
        if (!provider && screen !== 'provider') {
            return;
        }
        setActiveScreen(screen);
        window.location.hash = screen;
    };

    const renderScreen = () => {
        switch (activeScreen) {
            case 'provider':
				return (<ProviderConfig />);
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

    return (
        <div id="instantsearch-admin">
			
			<Notices />
			
			<div className="instantsearch-admin__page">
				<AdminNavigation handleScreenChange={handleScreenChange} />
				<div className="instantsearch-admin__content">
					{loading ? <Spinner /> : renderScreen()}
				</div>
			</div>
        </div>
    );
};

export default AdminApp;
