/**
 * Post Exclusion – Block Editor sidebar panel.
 *
 * Registers a PluginDocumentSettingPanel that lets content editors exclude
 * the current post from individual (or all) search indices without leaving
 * the Block Editor.
 *
 * Data is read from and written to the REST endpoint:
 *   GET  /wp-json/instantsearch-for-wp/v1/post-exclusions/{post_id}
 *   POST /wp-json/instantsearch-for-wp/v1/post-exclusions/{post_id}
 */

import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { CheckboxControl, Spinner, Notice } from '@wordpress/components';
import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

const PLUGIN_NAME = 'instantsearch-post-exclusion';

/**
 * The inner panel component.
 */
function PostExclusionPanel() {
    const { apiUrl, nonce, postId } = window.instantsearchExclusion || {};

    const [ isLoading, setIsLoading ]     = useState( true );
    const [ isSaving, setIsSaving ]       = useState( false );
    const [ error, setError ]             = useState( null );
    const [ exclusions, setExclusions ]   = useState( [] );
    const [ indices, setIndices ]         = useState( [] );
    const [ showExcerpt, setShowExcerpt ] = useState( false );

    // -------------------------------------------------------------------------
    // Fetch current state on mount
    // -------------------------------------------------------------------------
    useEffect( () => {
        if ( ! postId ) {
            setIsLoading( false );
            return;
        }

        apiFetch( {
            url: `${ apiUrl }${ postId }`,
            method: 'GET',
            headers: { 'X-WP-Nonce': nonce },
        } )
            .then( ( data ) => {
                setExclusions( data.exclusions || [] );
                setIndices( data.indices || [] );
                setShowExcerpt( !! data.show_excerpt );
                setIsLoading( false );
            } )
            .catch( ( err ) => {
                setError( err.message || __( 'Failed to load exclusion data.', 'instantsearch-for-wp' ) );
                setIsLoading( false );
            } );
    }, [ postId ] ); // eslint-disable-line react-hooks/exhaustive-deps

    // -------------------------------------------------------------------------
    // Persist changes
    // -------------------------------------------------------------------------
    const saveSettings = useCallback(
        ( { newExclusions = exclusions, newShowExcerpt = showExcerpt } ) => {
            setIsSaving( true );
            setError( null );

            apiFetch( {
                url: `${ apiUrl }${ postId }`,
                method: 'POST',
                headers: {
                    'X-WP-Nonce': nonce,
                    'Content-Type': 'application/json',
                },
                data: {
                    exclusions: newExclusions,
                    show_excerpt: newShowExcerpt,
                },
            } )
                .then( ( data ) => {
                    setExclusions( data.exclusions || [] );
                    setShowExcerpt( !! data.show_excerpt );
                    setIsSaving( false );
                } )
                .catch( ( err ) => {
                    setError( err.message || __( 'Failed to save exclusion data.', 'instantsearch-for-wp' ) );
                    setIsSaving( false );
                } );
        },
        [ apiUrl, nonce, postId, exclusions, showExcerpt ] // eslint-disable-line react-hooks/exhaustive-deps
    );

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    const excludeAll  = exclusions.includes( '__all__' );
    const allSlugs    = indices.map( ( i ) => i.slug );

    const toggleAll = ( checked ) => {
        saveSettings( { newExclusions: checked ? [ '__all__' ] : [] } );
    };

    const toggleIndex = ( slug, checked ) => {
        let next;
        if ( checked ) {
            next = [ ...new Set( [ ...exclusions.filter( s => s !== '__all__' ), slug ] ) ];
        } else {
            next = exclusions.filter( ( s ) => s !== slug && s !== '__all__' );
            // If __all__ was active, expand to all-minus-one.
            if ( excludeAll ) {
                next = allSlugs.filter( ( s ) => s !== slug );
            }
        }
        saveSettings( { newExclusions: next } );
    };

    const toggleShowExcerpt = ( checked ) => {
        saveSettings( { newShowExcerpt: checked } );
    };

    const isIndexExcluded = ( slug ) => excludeAll || exclusions.includes( slug );

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    if ( isLoading ) {
        return (
            <div style={ { padding: '8px' } }>
                <Spinner />
            </div>
        );
    }

    if ( ! indices.length ) {
        return (
            <p style={ { fontSize: '12px', color: '#757575' } }>
                { __( 'No search indices are configured for this post type.', 'instantsearch-for-wp' ) }
            </p>
        );
    }

    return (
        <div className="instantsearch-exclusion-panel">
            { error && (
                <Notice status="error" isDismissible={ false }>
                    { error }
                </Notice>
            ) }

            { isSaving && <Spinner /> }

            <CheckboxControl
                label={ <strong>{ __( 'Show excerpt in search results', 'instantsearch-for-wp' ) }</strong> }
                checked={ showExcerpt }
                onChange={ toggleShowExcerpt }
                disabled={ isSaving }
            />

            <hr style={ { margin: '8px 0' } } />

            <CheckboxControl
                label={ <strong>{ __( 'Exclude from all indices', 'instantsearch-for-wp' ) }</strong> }
                checked={ excludeAll }
                onChange={ toggleAll }
                disabled={ isSaving }
            />

            { indices.length > 1 && (
                <>
                    <hr style={ { margin: '8px 0' } } />
                    <p style={ { fontSize: '11px', color: '#757575', margin: '0 0 4px' } }>
                        { __( 'Or exclude from individual indices:', 'instantsearch-for-wp' ) }
                    </p>
                    { indices.map( ( index ) => (
                        <CheckboxControl
                            key={ index.slug }
                            label={ `${ index.label } (${ index.slug })` }
                            checked={ isIndexExcluded( index.slug ) }
                            onChange={ ( checked ) => toggleIndex( index.slug, checked ) }
                            disabled={ isSaving }
                        />
                    ) ) }
                </>
            ) }

            { indices.length === 1 && ! excludeAll && (
                <>
                    { indices.map( ( index ) => (
                        <CheckboxControl
                            key={ index.slug }
                            /* translators: %s: index name */
                            label={ sprintf( __( 'Exclude from %s', 'instantsearch-for-wp' ), index.label ) }
                            checked={ isIndexExcluded( index.slug ) }
                            onChange={ ( checked ) => toggleIndex( index.slug, checked ) }
                            disabled={ isSaving }
                        />
                    ) ) }
                </>
            ) }
        </div>
    );
}

// Only register when the global config is available (post editor only).
if ( window.instantsearchExclusion ) {
    registerPlugin( PLUGIN_NAME, {
        render: () => (
            <PluginDocumentSettingPanel
                name={ PLUGIN_NAME }
                title={ __( 'Search Index', 'instantsearch-for-wp' ) }
                className="instantsearch-exclusion-panel"
            >
                <PostExclusionPanel />
            </PluginDocumentSettingPanel>
        ),
    } );
}
