/**
 * Frontend initialization for InstantSearch block instances.
 *
 * Finds all .isfwp-block-instance containers on the page and initializes
 * a separate instantsearch() instance for each one, wiring up any child
 * widget containers found within.
 */

import instantsearch from 'instantsearch.js';
import { algoliasearch } from 'algoliasearch';
import {
	searchBox,
	hits,
	refinementList,
	menuSelect,
	pagination,
	stats,
	sortBy,
	currentRefinements,
	clearRefinements,
	configure,
} from 'instantsearch.js/es/widgets';

/**
 * Widget factory map: data-isfwp-widget value → widget factory function.
 */
const WIDGET_FACTORIES = {
	searchBox( container, config ) {
		return searchBox( {
			container,
			placeholder: config.placeholder || 'Search…',
			autofocus: config.autofocus || false,
			showSubmit: config.showSubmit !== false,
			showReset: config.showReset !== false,
		} );
	},

	hits( container, config ) {
		// When a custom Mustache template string is provided, pass it directly —
		// InstantSearch.js natively renders string templates via Hogan/Mustache.
		const templates = config.hitTemplate
			? {
				item: config.hitTemplate,
				empty( results, { html } ) {
					return html`
						<div class="isfwp-hits-empty">
							No results for <strong>${ results.query }</strong>.
						</div>
					`;
				},
			}
			: {
				item( hit, { html, components } ) {
					const image = config.showImage && hit.image
						? html`<img src="${ hit.image }" alt="${ hit.title }" class="isfwp-hit-image" />`
						: '';
					return html`
						<article class="isfwp-hit" itemscope itemtype="https://schema.org/Article">
							${ image }
							<h3 class="isfwp-hit__title">
								<a href="${ hit.url }" itemprop="url">
									${ components.Highlight( { hit, attribute: 'title' } ) }
								</a>
							</h3>
							<p class="isfwp-hit__excerpt">
								${ components.Snippet( { hit, attribute: 'content' } ) }
							</p>
						</article>
					`;
				},
				empty( results, { html } ) {
					return html`
						<div class="isfwp-hits-empty">
							No results for <strong>${ results.query }</strong>.
						</div>
					`;
				},
			};

		return hits( { container, templates } );
	},

	refinementList( container, config ) {
		return refinementList( {
			container,
			attribute: config.attribute || 'post_type',
			limit: config.limit || 10,
			showMore: config.showMore || false,
			showMoreLimit: config.showMoreLimit || 20,
			showCount: config.showCount !== false,
			sortBy: config.sortBy || [ 'isRefined', 'count:desc', 'name:asc' ],
		} );
	},

	menuSelect( container, config ) {
		return menuSelect( {
			container,
			attribute: config.attribute || 'post_type',
			limit: config.limit || 10,
			sortBy: config.sortBy || [ 'name:asc', 'count:desc' ],
		} );
	},

	pagination( container, config ) {
		return pagination( {
			container,
			totalPages: config.totalPages,
			padding: config.padding || 3,
		} );
	},

	stats( container ) {
		return stats( { container } );
	},

	sortBy( container, config ) {
		return sortBy( {
			container,
			items: config.items || [],
		} );
	},

	currentRefinements( container, config ) {
		return currentRefinements( {
			container,
			excludedAttributes: config.excludedAttributes || [],
		} );
	},

	clearRefinements( container, config ) {
		return clearRefinements( {
			container,
			includedAttributes: config.includedAttributes,
			templates: {
				resetLabel: config.buttonLabel || 'Clear refinements',
			},
		} );
	},
};

/**
 * Initialize a single InstantSearch instance for one container element.
 *
 * @param {HTMLElement} container The .isfwp-block-instance element.
 */
function initInstance( container ) {
	const configEl = container.querySelector( '.isfwp-block-config' );
	if ( ! configEl ) return;

	let config;
	try {
		config = JSON.parse( configEl.textContent );
	} catch ( e ) {
		// eslint-disable-next-line no-console
		console.error( '[InstantSearch for WP] Failed to parse block config', e );
		return;
	}

	if ( ! config.appId || ! config.apiKey || ! config.indexName ) {
		// eslint-disable-next-line no-console
		console.warn(
			'[InstantSearch for WP] Missing appId, apiKey, or indexName for block instance:',
			config.instanceId
		);
		return;
	}

	const searchClient = algoliasearch( config.appId, config.apiKey );

	const search = instantsearch( {
		indexName: config.indexName,
		searchClient,
		future: { preserveSharedStateOnUnmount: true },
	} );

	// Allow a child hits widget to override hitsPerPage at the widget level.
	let hitsPerPage = config.hitsPerPage || 20;
	container.querySelectorAll( '[data-isfwp-widget="hits"]' ).forEach( ( el ) => {
		if ( el.dataset.isfwpConfig ) {
			try {
				const hitsConfig = JSON.parse( el.dataset.isfwpConfig );
				if ( hitsConfig.hitsPerPage ) {
					hitsPerPage = hitsConfig.hitsPerPage;
				}
			} catch ( e ) {
				// ignore
			}
		}
	} );

	// Build configure params from block config.
	const configureParams = {
		hitsPerPage,
		distinct: config.distinct !== undefined ? config.distinct : false,
		analytics: config.analytics !== false,
		clickAnalytics: config.clickAnalytics || false,
		highlightPreTag: config.highlightPreTag || '<mark>',
		highlightPostTag: config.highlightPostTag || '</mark>',
		attributesToSnippet: config.snippetAttributes?.length
			? config.snippetAttributes
			: [ 'content:50' ],
		snippetEllipsisText: '…',
	};

	if ( config.filters ) {
		configureParams.filters = config.filters;
	}
	if ( config.attributesToRetrieve?.length ) {
		configureParams.attributesToRetrieve = config.attributesToRetrieve;
	}
	if ( config.restrictSearchableAttributes?.length ) {
		configureParams.restrictSearchableAttributes = config.restrictSearchableAttributes;
	}

	// Base configure widget.
	const widgets = [
		configure( configureParams ),
	];

	// Discover and mount child widget containers.
	container.querySelectorAll( '[data-isfwp-widget]' ).forEach( ( el ) => {
		const widgetType = el.dataset.isfwpWidget;
		const factory = WIDGET_FACTORIES[ widgetType ];

		if ( ! factory ) return;

		let widgetConfig = {};
		if ( el.dataset.isfwpConfig ) {
			try {
				widgetConfig = JSON.parse( el.dataset.isfwpConfig );
			} catch ( e ) {
				// fall through with empty config
			}
		}

		widgets.push( factory( el, widgetConfig ) );
	} );

	search.addWidgets( widgets );
	search.start();

	// Expose on the element for external access.
	container._isfwpSearch = search;
}

document.addEventListener( 'DOMContentLoaded', () => {
	document.querySelectorAll( '.isfwp-block-instance' ).forEach( initInstance );
} );
