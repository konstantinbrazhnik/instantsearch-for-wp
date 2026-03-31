/**
 * Frontend initialization for InstantSearch block instances.
 *
 * Finds all .isfwp-block-instance containers on the page and initializes
 * a separate instantsearch() instance for each one, wiring up any child
 * widget containers found within.
 */

import instantsearch from 'instantsearch.js';
import { algoliasearch } from 'algoliasearch';
import { applyFilters } from '@wordpress/hooks';
import {
	searchBox,
	hits,
	panel,
	refinementList,
	menuSelect,
	hitsPerPage,
	pagination,
	stats,
	sortBy,
	currentRefinements,
	clearRefinements,
	configure,
} from 'instantsearch.js/es/widgets';

function withFacetPanel( widgetFactory, container, config, widgetOptions ) {
	const label = config.label || config.attribute || '';
	const hideWhenEmpty = config.hideWhenEmpty !== false;

	return panel( {
		templates: {
			header: label,
		},
		hidden( options ) {
			return hideWhenEmpty && Array.isArray( options.items ) && options.items.length === 0;
		},
	} )( widgetFactory )( {
		container,
		...widgetOptions,
	} );
}

/**
 * Widget factory map: data-isfwp-widget value → widget factory function.
 */
const WIDGET_FACTORIES = {
	searchBox( container, config ) {
		const debounce = Number.isFinite( Number( config.debounce ) )
			? Math.max( 0, Number( config.debounce ) )
			: 0;
		const searchBoxConfig = {
			container,
			placeholder: config.placeholder || 'Search…',
			autofocus: config.autofocus || false,
			showSubmit: config.showSubmit !== false,
			showReset: config.showReset !== false,
			searchAsYouType: debounce > 0,
		};

		if ( debounce > 0 ) {
			let debounceTimer;

			searchBoxConfig.queryHook = ( query, search ) => {
				window.clearTimeout( debounceTimer );
				debounceTimer = window.setTimeout( () => search( query ), debounce );
			};
		}

		return searchBox( {
			...searchBoxConfig,
		} );
	},

	hits( container, config ) {
		const instanceId = container.closest( '.isfwp-block-instance' )?.dataset.isfwpInstance || '';

		// Allow themes or companion plugins to augment each hit before templates render.
		// Global hook: isfwp.blockHit
		// Instance hook: isfwp.blockHit.{instanceId}
		const transformItems = ( items, { results } ) => items.map( ( hit, index ) => {
			const filterContext = {
				config,
				container,
				index,
				instanceId,
				results,
			};

			let transformedHit = applyFilters(
				'isfwp.blockHit',
				hit,
				filterContext
			);

			if ( instanceId ) {
				transformedHit = applyFilters(
					`isfwp.blockHit.${ instanceId }`,
					transformedHit,
					filterContext
				);
			}

			return transformedHit;
		} );

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

		return hits( { container, templates, transformItems } );
	},

	refinementList( container, config ) {
		return withFacetPanel( refinementList, container, config, {
			attribute: config.attribute || 'post_type',
			limit: config.limit || 10,
			showMore: config.showMore || false,
			showMoreLimit: config.showMoreLimit || 20,
			showCount: config.showCount !== false,
			sortBy: config.sortBy || [ 'isRefined', 'count:desc', 'name:asc' ],
		} );
	},

	menuSelect( container, config ) {
		return withFacetPanel( menuSelect, container, config, {
			attribute: config.attribute || 'post_type',
			limit: config.limit || 10,
			sortBy: config.sortBy || [ 'name:asc', 'count:desc' ],
		} );
	},

	hitsPerPage( container, config ) {
		const items = Array.isArray( config.items )
			? config.items.filter( ( item ) => Number.isFinite( Number( item?.value ) ) && Number( item.value ) > 0 ).map( ( item ) => ( {
				label: item.label || String( item.value ),
				value: Number( item.value ),
				default: item.default === true,
			} ) )
			: [];

		if ( items.length === 0 ) {
			return null;
		}

		return hitsPerPage( {
			container,
			items,
		} );
	},

	pagination( container, config ) {
		const widgetConfig = {
			container,
			padding: config.padding || 3,
		};

		if ( Number.isFinite( Number( config.totalPages ) ) ) {
			widgetConfig.totalPages = Number( config.totalPages );
		}

		return pagination( widgetConfig );
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
		const excludedAttributes = Array.isArray( config.excludedAttributes )
			? config.excludedAttributes
			: [];

		return currentRefinements( {
			container,
			excludedAttributes,
		} );
	},

	clearRefinements( container, config ) {
		const widgetConfig = {
			container,
			templates: {
				resetLabel: config.buttonLabel || 'Clear refinements',
			},
		};

		if ( Array.isArray( config.includedAttributes ) ) {
			widgetConfig.includedAttributes = config.includedAttributes;
		}

		return clearRefinements( {
			...widgetConfig,
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

		const widget = factory( el, widgetConfig );
		if ( widget ) {
			widgets.push( widget );
		}
	} );

	search.addWidgets( widgets );
	search.start();

	// Expose on the element for external access.
	container._isfwpSearch = search;
}

document.addEventListener( 'DOMContentLoaded', () => {
	document.querySelectorAll( '.isfwp-block-instance' ).forEach( initInstance );
} );
