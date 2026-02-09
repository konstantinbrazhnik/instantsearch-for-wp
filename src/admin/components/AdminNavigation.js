import { __ } from '@wordpress/i18n';
import {
	MenuItemsChoice
} from '@wordpress/components';

const AdminNavigation = ({
	currentScreen,
	handleScreenChange
}) => {

	// Navigation items - order changes based on whether provider is selected
	const getNavigationItems = () => {
		return [
			{ value: 'index', label: __('Index', 'instantsearch-for-wp'), icon: 'update' },
			{ value: 'search', label: __('Search Configuration', 'instantsearch-for-wp'), icon: 'search' },
			{ value: 'provider', label: __('Provider Setup', 'instantsearch-for-wp'), icon: 'admin-settings' }
		];
	};

    const navigationItems = getNavigationItems();

    return (
		<MenuItemsChoice
			choices={navigationItems}
			onSelect={handleScreenChange}
			value={currentScreen}
		/>
    );
}

export default AdminNavigation;
