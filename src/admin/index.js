import './admin.scss';
import domReady from '@wordpress/dom-ready';
import { render } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import AdminApp from './components/AdminApp';
import { AdminProvider } from './components/AdminContext';

// Import styles
// import './admin.scss';

// Render the admin app when the DOM is ready
domReady(() => {
    const adminAppElement = document.getElementById('instantsearch-admin-app');
    if (adminAppElement) {
        render(<AdminProvider><AdminApp /></AdminProvider>, adminAppElement);
    }
});

