import { __ } from '@wordpress/i18n';
import { 
	Button,
    Card, 
    CardBody
} from '@wordpress/components';

const AdminNavigation = ({
	handleScreenChange
}) => {

	// Navigation items - order changes based on whether provider is selected
	const getNavigationItems = () => {
		return [
			{ id: 'dashboard', label: __('Dashboard', 'yoko-core'), icon: 'admin-network' },
			{ id: 'indexing', label: __('Indexing', 'yoko-core'), icon: 'update' },
			{ id: 'analytics', label: __('Analytics (Coming Soon)', 'yoko-core'), icon: 'chart-area', disabled: true },
			{ id: 'provider', label: __('Provider Setup', 'yoko-core'), icon: 'admin-settings' }
		];
	};

    const navigationItems = getNavigationItems();

    return (
        <ul className="instantsearch-admin__navigation">
			<Card>
				<CardBody>
					{navigationItems.map((item) => (
						<li key={item.id}>
							<Button onClick={() => handleScreenChange(item.id)}>{item.label}</Button>
						</li>
					))}
				</CardBody>
			</Card>
		</ul>
    );
}

export default AdminNavigation;
