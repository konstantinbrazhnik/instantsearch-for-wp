/**
 * Frontend initialization for InstantSearch block instances.
 *
 * Finds all .isfwp-block-instance containers on the page and initializes
 * a separate instantsearch() instance for each one, wiring up any child
 * widget containers found within.
 */

import instantsearch from 'instantsearch.js';
import { algoliasearch } from 'algoliasearch';
import { history as historyRouter } from 'instantsearch.js/es/lib/routers';
import { singleIndex } from 'instantsearch.js/es/lib/stateMappings';
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

const BLOCK_VISIBILITY_HIDE_CLASS_PREFIX = 'block-visibility-hide-';

function parseRouteParamValue( value ) {
	if ( ! value ) {
		return value;
	}

	if ( ( value.startsWith( '{' ) && value.endsWith( '}' ) ) || ( value.startsWith( '[' ) && value.endsWith( ']' ) ) ) {
		try {
			return JSON.parse( value );
		} catch ( e ) {
			return value;
		}
	}

	return value;
}

function serializeRouteState( routeState ) {
	const params = new URLSearchParams();

	if ( ! routeState || typeof routeState !== 'object' ) {
		return params;
	}

	Object.entries( routeState ).forEach( ( [ key, value ] ) => {
		if ( value === undefined || value === null || value === '' ) {
			return;
		}

		if ( Array.isArray( value ) ) {
			value.forEach( ( item ) => {
				if ( item !== undefined && item !== null && item !== '' ) {
					params.append( key, String( item ) );
				}
			} );
			return;
		}

		if ( typeof value === 'object' ) {
			params.set( key, JSON.stringify( value ) );
			return;
		}

		params.set( key, String( value ) );
	} );

	return params;
}

function parseRouteStateFromHash( hash ) {
	const rawHash = typeof hash === 'string' ? hash : '';
	const normalizedHash = rawHash.startsWith( '#' ) ? rawHash.slice( 1 ) : rawHash;
	const hashPath = normalizedHash.startsWith( '/' ) ? normalizedHash.slice( 1 ) : normalizedHash;

	if ( ! hashPath ) {
		return {};
	}

	const params = new URLSearchParams( hashPath );
	const routeState = {};
	const keys = Array.from( new Set( Array.from( params.keys() ) ) );

	keys.forEach( ( key ) => {
		const values = params.getAll( key ).filter( ( value ) => value !== '' );
		if ( values.length === 0 ) {
			return;
		}

		routeState[ key ] = values.length === 1
			? parseRouteParamValue( values[ 0 ] )
			: values.map( ( value ) => parseRouteParamValue( value ) );
	} );

	return routeState;
}

function createHashRouter() {
	return historyRouter( {
		writeDelay: 400,
		createURL( { routeState, location } ) {
			const baseUrl = `${ location.pathname }${ location.search }`;
			const params = serializeRouteState( routeState );
			const hashPath = params.toString();

			return hashPath ? `${ baseUrl }#/${ hashPath }` : baseUrl;
		},
		parseURL( { location } ) {
			return parseRouteStateFromHash( location.hash );
		},
	} );
}

function isHiddenByBlockVisibility( element ) {
	if ( ! element || ! element.classList || typeof window === 'undefined' || ! document.body ) {
		return false;
	}

	const visibilityClasses = Array.from( element.classList ).filter( ( className ) =>
		className.startsWith( BLOCK_VISIBILITY_HIDE_CLASS_PREFIX )
	);

	if ( visibilityClasses.length === 0 ) {
		return false;
	}

	// Block Visibility uses CSS media queries for screen-size controls.
	// Probe those classes on a temporary element to determine current visibility.
	const probe = document.createElement( 'div' );
	probe.className = visibilityClasses.join( ' ' );
	probe.style.position = 'absolute';
	probe.style.visibility = 'hidden';
	probe.style.pointerEvents = 'none';
	document.body.appendChild( probe );

	const isHidden = window.getComputedStyle( probe ).display === 'none';
	probe.remove();

	return isHidden;
}

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

	configure( container, config ) {
		if ( ! config || typeof config !== 'object' || Array.isArray( config ) ) {
			return null;
		}

		if ( Object.keys( config ).length === 0 ) {
			return null;
		}

		return configure( config );
	},

	hitsPerPage( container, config ) {
		const optionLabelSuffix = config.appendLabelToOptions && config.label
			? config.label.charAt( 0 ).toLowerCase() + config.label.slice( 1 )
			: '';

		const items = Array.isArray( config.items )
			? config.items.filter( ( item ) => Number.isFinite( Number( item?.value ) ) && Number( item.value ) > 0 ).map( ( item ) => {
				const baseLabel = item.label || String( item.value );

				return {
					label: optionLabelSuffix ? `${ baseLabel } ${ optionLabelSuffix }` : baseLabel,
					value: Number( item.value ),
					default: item.default === true,
				};
			} )
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
	if ( isHiddenByBlockVisibility( container ) ) {
		return;
	}

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

	const searchOptions = {
		indexName: config.indexName,
		searchClient,
		future: { preserveSharedStateOnUnmount: true },
	};

	if ( config.enableRouting !== false ) {
		searchOptions.routing = {
			router: createHashRouter(),
			stateMapping: singleIndex( config.indexName ),
		};
	}

	const search = instantsearch( searchOptions );

	// Allow a child hits widget to override hitsPerPage at the widget level.
	let hitsPerPage = config.hitsPerPage || 20;
	container.querySelectorAll( '[data-isfwp-widget="hits"]' ).forEach( ( el ) => {
		if ( isHiddenByBlockVisibility( el ) ) {
			return;
		}

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
		if ( isHiddenByBlockVisibility( el ) ) {
			return;
		}

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
