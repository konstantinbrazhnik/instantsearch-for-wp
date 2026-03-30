<?php
/**
 * Post Exclusion Class
 *
 * Manages per-index exclusion of posts from the search index.
 *
 * Provides:
 * - Meta box in the Classic Editor
 * - REST API endpoints for the Block Editor sidebar panel
 * - Post list table column showing exclusion status
 * - Bulk actions for excluding / including posts
 * - Automatic de-indexing via action-scheduler when exclusions change
 *
 * Post meta key: `_instantsearch_exclude`
 * Stored value : array of index slugs, or `['__all__']` to exclude from every index.
 * Empty array  : included in all indices (default).
 *
 * @package InstantSearchForWP
 * @since   1.0.0
 */

namespace InstantSearchForWP;

/**
 * PostExclusion class.
 */
class PostExclusion {

	/**
	 * Post meta key used to store exclusion data.
	 *
	 * @var string
	 */
	const META_KEY = '_instantsearch_exclude';

	/**
	 * Sentinel value meaning "exclude from every index".
	 *
	 * @var string
	 */
	const EXCLUDE_ALL = '__all__';

	/**
	 * action-scheduler hook for async de-indexing.
	 *
	 * @var string
	 */
	const DEINDEX_ACTION = 'instantsearch_deindex_post';

	/**
	 * Constructor – registers all WordPress hooks.
	 *
	 * @return void
	 */
	public function __construct() {
		// Register post meta.
		add_action( 'init', array( $this, 'register_meta' ) );

		// Classic Editor meta box.
		add_action( 'add_meta_boxes', array( $this, 'add_meta_box' ) );
		// Save handler runs before the Indexer (priority 5 < 10).
		add_action( 'save_post', array( $this, 'save_meta_box' ), 5, 2 );

		// Block Editor sidebar panel script.
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_block_editor_assets' ) );

		// REST API routes.
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );

		// Post list table columns and bulk actions (per post type, registered on admin_init).
		add_action( 'admin_init', array( $this, 'register_list_table_hooks' ) );

		// action-scheduler de-indexing handler.
		add_action( self::DEINDEX_ACTION, array( $this, 'process_deindex_action' ), 10, 2 );

		// Admin notice after bulk action.
		add_action( 'admin_notices', array( $this, 'bulk_action_admin_notice' ) );
	}

	// -------------------------------------------------------------------------
	// Meta registration
	// -------------------------------------------------------------------------

	/**
	 * Register the `_instantsearch_exclude` post meta key.
	 *
	 * @return void
	 */
	public function register_meta() {
		$applicable_post_types = $this->get_applicable_post_types();

		foreach ( $applicable_post_types as $post_type ) {
			register_post_meta(
				$post_type,
				self::META_KEY,
				array(
					'type'              => 'array',
					'description'       => 'Index slugs from which this post is excluded.',
					'single'            => true,
					'default'           => array(),
					'show_in_rest'      => array(
						'schema' => array(
							'type'  => 'array',
							'items' => array( 'type' => 'string' ),
						),
					),
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
					'sanitize_callback' => array( __CLASS__, 'sanitize_exclusions' ),
				)
			);
		}
	}

	// -------------------------------------------------------------------------
	// Classic Editor meta box
	// -------------------------------------------------------------------------

	/**
	 * Register meta boxes on all applicable post types.
	 *
	 * @return void
	 */
	public function add_meta_box() {
		$applicable_post_types = $this->get_applicable_post_types();

		foreach ( $applicable_post_types as $post_type ) {
			add_meta_box(
				'instantsearch_exclusion',
				__( 'Search Index', 'instantsearch-for-wp' ),
				array( $this, 'render_meta_box' ),
				$post_type,
				'side',
				'default'
			);
		}
	}

	/**
	 * Render the meta box HTML.
	 *
	 * @param \WP_Post $post Current post object.
	 * @return void
	 */
	public function render_meta_box( $post ) {
		wp_nonce_field( 'instantsearch_exclusion_nonce', 'instantsearch_exclusion_nonce' );

		$exclusions = self::get_exclusions( $post->ID );
		$indices    = self::get_indices( $post->post_type );

		if ( empty( $indices ) ) {
			echo '<p>' . esc_html__( 'No search indices are configured for this post type.', 'instantsearch-for-wp' ) . '</p>';
			return;
		}

		$exclude_all = in_array( self::EXCLUDE_ALL, $exclusions, true );
		?>
		<div class="instantsearch-exclusion-metabox">
			<p>
				<label>
					<input
						type="checkbox"
						name="instantsearch_exclude_all"
						value="1"
						<?php checked( $exclude_all ); ?>
					/>
					<strong><?php esc_html_e( 'Exclude from all indices', 'instantsearch-for-wp' ); ?></strong>
				</label>
			</p>
			<?php if ( count( $indices ) > 1 ) : ?>
				<hr />
				<p><em><?php esc_html_e( 'Or exclude from individual indices:', 'instantsearch-for-wp' ); ?></em></p>
				<?php foreach ( $indices as $index_data ) : ?>
					<p>
						<label>
							<input
								type="checkbox"
								name="instantsearch_exclude_indices[]"
								value="<?php echo esc_attr( $index_data['slug'] ); ?>"
								<?php checked( $exclude_all || in_array( $index_data['slug'], $exclusions, true ) ); ?>
								<?php disabled( $exclude_all ); ?>
							/>
							<?php echo esc_html( $index_data['label'] ); ?>
							<code style="font-size:10px;">(<?php echo esc_html( $index_data['slug'] ); ?>)</code>
						</label>
					</p>
				<?php endforeach; ?>
			<?php elseif ( 1 === count( $indices ) && ! $exclude_all ) : ?>
				<?php foreach ( $indices as $index_data ) : ?>
					<p>
						<label>
							<input
								type="checkbox"
								name="instantsearch_exclude_indices[]"
								value="<?php echo esc_attr( $index_data['slug'] ); ?>"
								<?php checked( in_array( $index_data['slug'], $exclusions, true ) ); ?>
							/>
							<?php
							printf(
								/* translators: %s: index name */
								esc_html__( 'Exclude from %s', 'instantsearch-for-wp' ),
								esc_html( $index_data['label'] )
							);
							?>
						</label>
					</p>
				<?php endforeach; ?>
			<?php endif; ?>
		</div>
		<?php
	}

	// -------------------------------------------------------------------------
	// Save handler
	// -------------------------------------------------------------------------

	/**
	 * Save exclusion meta when a post is saved.
	 *
	 * Fires on `save_post` at priority 5 (before the Indexer at priority 10)
	 * so that updated exclusion data is already in the database when the
	 * Indexer runs.
	 *
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post    Post object.
	 * @return void
	 */
	public function save_meta_box( $post_id, $post ) {
		// Verify nonce only when the meta box form was submitted (Classic Editor).
		if ( isset( $_POST['instantsearch_exclusion_nonce'] ) ) {
			if ( ! wp_verify_nonce( wp_unslash( $_POST['instantsearch_exclusion_nonce'] ), 'instantsearch_exclusion_nonce' ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
				return;
			}
		} elseif ( defined( 'REST_API_VERSION' ) || ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) ) {
			// Handled via REST API endpoint, or this is an autosave — skip.
			return;
		} else {
			// Not our form submission — skip.
			return;
		}

		// Permission check.
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$previous_exclusions = self::get_exclusions( $post_id );

		if ( ! empty( $_POST['instantsearch_exclude_all'] ) ) {
			$new_exclusions = array( self::EXCLUDE_ALL );
		} else {
			$raw = isset( $_POST['instantsearch_exclude_indices'] ) ? (array) $_POST['instantsearch_exclude_indices'] : array();
			// Sanitize: keep only valid index slugs.
			$valid_slugs    = wp_list_pluck( self::get_indices( $post->post_type ), 'slug' );
			$new_exclusions = array_values( array_intersect( array_map( 'sanitize_key', $raw ), $valid_slugs ) );
		}

		self::set_exclusions( $post_id, $new_exclusions );

		// Queue de-indexing for newly-excluded indices.
		$this->maybe_queue_deindex( $post_id, $previous_exclusions, $new_exclusions );
	}

	// -------------------------------------------------------------------------
	// Block Editor script
	// -------------------------------------------------------------------------

	/**
	 * Enqueue the Block Editor sidebar panel script.
	 *
	 * @return void
	 */
	public function enqueue_block_editor_assets() {
		global $post;

		if ( ! $post ) {
			return;
		}

		$applicable_post_types = $this->get_applicable_post_types();
		if ( ! in_array( $post->post_type, $applicable_post_types, true ) ) {
			return;
		}

		$script_path = INSTANTSEARCH_FOR_WP_PATH . '/build/post-exclusion.js';
		if ( ! file_exists( $script_path ) ) {
			return;
		}

		$asset_file = INSTANTSEARCH_FOR_WP_PATH . '/build/post-exclusion.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : array();

		wp_enqueue_script(
			'instantsearch-post-exclusion',
			INSTANTSEARCH_FOR_WP_URL . 'build/post-exclusion.js',
			$asset['dependencies'] ?? array( 'wp-plugins', 'wp-edit-post', 'wp-element', 'wp-components', 'wp-data', 'wp-i18n', 'wp-api-fetch' ),
			$asset['version'] ?? INSTANTSEARCH_FOR_WP_VERSION,
			true
		);

		wp_localize_script(
			'instantsearch-post-exclusion',
			'instantsearchExclusion',
			array(
				'apiUrl'  => rest_url( 'instantsearch-for-wp/v1/post-exclusions/' ),
				'nonce'   => wp_create_nonce( 'wp_rest' ),
				'postId'  => $post->ID,
			)
		);
	}

	// -------------------------------------------------------------------------
	// REST API endpoints
	// -------------------------------------------------------------------------

	/**
	 * Register REST API routes for post exclusions.
	 *
	 * GET  /instantsearch-for-wp/v1/post-exclusions/{post_id}
	 * POST /instantsearch-for-wp/v1/post-exclusions/{post_id}
	 *
	 * @return void
	 */
	public function register_rest_routes() {
		register_rest_route(
			'instantsearch-for-wp/v1',
			'/post-exclusions/(?P<post_id>\d+)',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'rest_get_exclusions' ),
					'permission_callback' => array( $this, 'rest_permission_check' ),
					'args'                => array(
						'post_id' => array(
							'required'          => true,
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						),
					),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'rest_update_exclusions' ),
					'permission_callback' => array( $this, 'rest_permission_check' ),
					'args'                => array(
						'post_id'    => array(
							'required'          => true,
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						),
						'exclusions' => array(
							'required'          => true,
							'type'              => 'array',
							'items'             => array( 'type' => 'string' ),
							'sanitize_callback' => array( __CLASS__, 'sanitize_exclusions' ),
						),
					),
				),
			)
		);
	}

	/**
	 * Permission callback for exclusion REST routes.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return bool|\WP_Error
	 */
	public function rest_permission_check( $request ) {
		$post_id = absint( $request->get_param( 'post_id' ) );
		if ( ! $post_id || ! get_post( $post_id ) ) {
			return new \WP_Error( 'rest_post_invalid_id', __( 'Invalid post ID.', 'instantsearch-for-wp' ), array( 'status' => 404 ) );
		}
		return current_user_can( 'edit_post', $post_id );
	}

	/**
	 * GET handler – return current exclusions and available indices.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function rest_get_exclusions( $request ) {
		$post_id = absint( $request->get_param( 'post_id' ) );
		$post    = get_post( $post_id );

		return rest_ensure_response(
			array(
				'exclusions' => self::get_exclusions( $post_id ),
				'indices'    => self::get_indices( $post->post_type ),
			)
		);
	}

	/**
	 * POST handler – update exclusions for a post.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function rest_update_exclusions( $request ) {
		$post_id    = absint( $request->get_param( 'post_id' ) );
		$post       = get_post( $post_id );
		$exclusions = (array) $request->get_param( 'exclusions' );

		$previous_exclusions = self::get_exclusions( $post_id );

		// Validate: allow only valid index slugs or the __all__ sentinel.
		$valid_slugs = array_merge(
			array( self::EXCLUDE_ALL ),
			wp_list_pluck( self::get_indices( $post->post_type ), 'slug' )
		);
		$exclusions  = array_values( array_intersect( $exclusions, $valid_slugs ) );

		self::set_exclusions( $post_id, $exclusions );

		// Queue de-indexing for newly-excluded indices.
		$this->maybe_queue_deindex( $post_id, $previous_exclusions, $exclusions );

		return rest_ensure_response(
			array(
				'exclusions' => self::get_exclusions( $post_id ),
				'indices'    => self::get_indices( $post->post_type ),
			)
		);
	}

	// -------------------------------------------------------------------------
	// Post list table column
	// -------------------------------------------------------------------------

	/**
	 * Register per-post-type hooks for the list table column.
	 *
	 * @return void
	 */
	public function register_list_table_hooks() {
		$applicable_post_types = $this->get_applicable_post_types();

		foreach ( $applicable_post_types as $post_type ) {
			add_filter( "manage_{$post_type}_posts_columns", array( $this, 'add_list_table_column' ) );
			add_action( "manage_{$post_type}_posts_custom_column", array( $this, 'render_list_table_column' ), 10, 2 );
			add_filter( "manage_edit-{$post_type}_sortable_columns", array( $this, 'register_sortable_column' ) );
			add_filter( "bulk_actions-edit-{$post_type}", array( $this, 'register_bulk_actions' ) );
			add_filter( "handle_bulk_actions-edit-{$post_type}", array( $this, 'handle_bulk_action' ), 10, 3 );
		}

		// Handle pre_get_posts for sortable column.
		add_action( 'pre_get_posts', array( $this, 'sort_by_exclusion' ) );
	}

	/**
	 * Add the "Search Index" column header.
	 *
	 * @param array $columns Existing columns.
	 * @return array
	 */
	public function add_list_table_column( $columns ) {
		$columns['instantsearch_exclusion'] = __( 'Search Index', 'instantsearch-for-wp' );
		return $columns;
	}

	/**
	 * Render the "Search Index" column cell.
	 *
	 * @param string $column  Column slug.
	 * @param int    $post_id Post ID.
	 * @return void
	 */
	public function render_list_table_column( $column, $post_id ) {
		if ( 'instantsearch_exclusion' !== $column ) {
			return;
		}

		$exclusions = self::get_exclusions( $post_id );

		if ( empty( $exclusions ) ) {
			echo '<span style="color:#46b450;" title="' . esc_attr__( 'Included in all indices', 'instantsearch-for-wp' ) . '">&#10003;</span>';
			return;
		}

		if ( in_array( self::EXCLUDE_ALL, $exclusions, true ) ) {
			echo '<span style="color:#dc3232;font-weight:bold;">' . esc_html__( 'Excluded', 'instantsearch-for-wp' ) . '</span>';
			return;
		}

		// Show which indices the post is excluded from.
		$post      = get_post( $post_id );
		$indices   = self::get_indices( $post->post_type );
		$labels    = array();

		foreach ( $indices as $index_data ) {
			if ( in_array( $index_data['slug'], $exclusions, true ) ) {
				$labels[] = esc_html( $index_data['label'] );
			}
		}

		if ( ! empty( $labels ) ) {
			// $labels values are already escaped via esc_html() on line 495.
			// wp_kses_post() is used here to ensure the final output is safe.
			$escaped_labels = implode( ', ', $labels );
			echo '<span style="color:#d63638;" title="' . esc_attr(
				sprintf(
					/* translators: %s: comma-separated index names */
					__( 'Excluded from: %s', 'instantsearch-for-wp' ),
					wp_strip_all_tags( $escaped_labels )
				)
			) . '">' . esc_html__( 'Excluded:', 'instantsearch-for-wp' ) . ' ' . $escaped_labels . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $escaped_labels is pre-escaped via esc_html()
		}
	}

	/**
	 * Register the column as sortable.
	 *
	 * @param array $sortable_columns Existing sortable columns.
	 * @return array
	 */
	public function register_sortable_column( $sortable_columns ) {
		$sortable_columns['instantsearch_exclusion'] = 'instantsearch_exclusion';
		return $sortable_columns;
	}

	/**
	 * Apply meta_query when sorting by exclusion status.
	 *
	 * @param \WP_Query $query The WP_Query object.
	 * @return void
	 */
	public function sort_by_exclusion( $query ) {
		if ( ! is_admin() || ! $query->is_main_query() ) {
			return;
		}

		if ( 'instantsearch_exclusion' !== $query->get( 'orderby' ) ) {
			return;
		}

		$query->set( 'meta_key', self::META_KEY );
		$query->set( 'orderby', 'meta_value' );
	}

	// -------------------------------------------------------------------------
	// Bulk actions
	// -------------------------------------------------------------------------

	/**
	 * Register bulk actions for applicable post types.
	 *
	 * @param array $actions Existing bulk actions.
	 * @return array
	 */
	public function register_bulk_actions( $actions ) {
		$actions['instantsearch_exclude_all']    = __( 'Exclude from search index', 'instantsearch-for-wp' );
		$actions['instantsearch_include_all']    = __( 'Include in search index', 'instantsearch-for-wp' );
		return $actions;
	}

	/**
	 * Process bulk action submissions via the `handle_bulk_actions-edit-{post_type}` filter.
	 *
	 * @param string $redirect_url URL to redirect to after processing.
	 * @param string $action       The current bulk action.
	 * @param array  $post_ids     Array of post IDs.
	 * @return string Redirect URL with results appended.
	 */
	public function handle_bulk_action( $redirect_url, $action, $post_ids ) {
		if ( ! in_array( $action, array( 'instantsearch_exclude_all', 'instantsearch_include_all' ), true ) ) {
			return $redirect_url;
		}

		$count = 0;

		foreach ( $post_ids as $post_id ) {
			$post_id = absint( $post_id );

			if ( ! current_user_can( 'edit_post', $post_id ) ) {
				continue;
			}

			$previous_exclusions = self::get_exclusions( $post_id );

			if ( 'instantsearch_exclude_all' === $action ) {
				$new_exclusions = array( self::EXCLUDE_ALL );
			} else {
				$new_exclusions = array();
			}

			self::set_exclusions( $post_id, $new_exclusions );
			$this->maybe_queue_deindex( $post_id, $previous_exclusions, $new_exclusions );
			++$count;
		}

		// Append result parameters to the redirect URL.
		return add_query_arg(
			array(
				'instantsearch_bulk_action' => rawurlencode( $action ),
				'instantsearch_bulk_count'  => $count,
			),
			$redirect_url
		);
	}

	/**
	 * Show admin notice after a bulk action.
	 *
	 * @return void
	 */
	public function bulk_action_admin_notice() {
		if ( ! isset( $_GET['instantsearch_bulk_action'] ) || ! isset( $_GET['instantsearch_bulk_count'] ) ) {
			return;
		}

		$action = sanitize_key( rawurldecode( $_GET['instantsearch_bulk_action'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$count  = absint( $_GET['instantsearch_bulk_count'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( 'instantsearch_exclude_all' === $action ) {
			$message = sprintf(
				/* translators: %d: number of posts */
				_n(
					'%d post excluded from all search indices. It will be removed from the search index shortly.',
					'%d posts excluded from all search indices. They will be removed from the search index shortly.',
					$count,
					'instantsearch-for-wp'
				),
				$count
			);
		} elseif ( 'instantsearch_include_all' === $action ) {
			$message = sprintf(
				/* translators: %d: number of posts */
				_n(
					'%d post search index exclusion removed.',
					'%d posts search index exclusions removed.',
					$count,
					'instantsearch-for-wp'
				),
				$count
			);
		} else {
			return;
		}

		echo '<div class="notice notice-success is-dismissible"><p>' . esc_html( $message ) . '</p></div>';
	}

	// -------------------------------------------------------------------------
	// De-indexing via action-scheduler
	// -------------------------------------------------------------------------

	/**
	 * Queue async de-indexing for indices that were newly excluded.
	 *
	 * @param int   $post_id             Post ID.
	 * @param array $previous_exclusions Previously stored exclusion slugs.
	 * @param array $new_exclusions      New exclusion slugs.
	 * @return void
	 */
	private function maybe_queue_deindex( $post_id, $previous_exclusions, $new_exclusions ) {
		if ( ! function_exists( 'as_enqueue_async_action' ) ) {
			return;
		}

		$post = get_post( $post_id );
		if ( ! $post ) {
			return;
		}

		$all_indices = self::get_indices( $post->post_type );
		$all_slugs   = wp_list_pluck( $all_indices, 'slug' );

		// Resolve the effective previous set of excluded slugs.
		if ( in_array( self::EXCLUDE_ALL, $previous_exclusions, true ) ) {
			$effective_previous = $all_slugs;
		} else {
			$effective_previous = $previous_exclusions;
		}

		// Resolve the effective new set of excluded slugs.
		if ( in_array( self::EXCLUDE_ALL, $new_exclusions, true ) ) {
			$effective_new = $all_slugs;
		} else {
			$effective_new = $new_exclusions;
		}

		// Newly excluded = in new but not in previous.
		$newly_excluded = array_diff( $effective_new, $effective_previous );

		foreach ( $newly_excluded as $slug ) {
			as_enqueue_async_action(
				self::DEINDEX_ACTION,
				array(
					'post_id'    => $post_id,
					'index_slug' => $slug,
				),
				'instantsearch-for-wp'
			);
		}
	}

	/**
	 * action-scheduler callback – delete a post from a specific index.
	 *
	 * @param int    $post_id    Post ID.
	 * @param string $index_slug Index slug (post_name of the isfwp_index CPT).
	 * @return void
	 */
	public function process_deindex_action( $post_id, $index_slug ) {
		$indexer = Indexer::get_instance();

		if ( empty( $indexer->provider ) ) {
			return;
		}

		// Find the index CPT post by slug.
		$index_posts = get_posts(
			array(
				'post_type'      => Index::$cpt_slug,
				'name'           => sanitize_title( $index_slug ),
				'posts_per_page' => 1,
				'post_status'    => 'publish',
			)
		);

		if ( empty( $index_posts ) ) {
			return;
		}

		$index = new Index( $index_posts[0]->ID );

		if ( empty( $index->name ) ) {
			return;
		}

		$indexer->provider->delete_posts( array( absint( $post_id ) ), $index );
	}

	// -------------------------------------------------------------------------
	// Static helper methods
	// -------------------------------------------------------------------------

	/**
	 * Return the array of index slugs this post is excluded from.
	 *
	 * @param int $post_id Post ID.
	 * @return array<string> Array of index slugs, possibly containing `__all__`.
	 */
	public static function get_exclusions( $post_id ) {
		$meta = get_post_meta( $post_id, self::META_KEY, true );

		if ( ! is_array( $meta ) ) {
			return array();
		}

		return $meta;
	}

	/**
	 * Persist exclusion data for a post.
	 *
	 * @param int   $post_id    Post ID.
	 * @param array $exclusions Array of index slugs (may contain `__all__`).
	 * @return void
	 */
	public static function set_exclusions( $post_id, $exclusions ) {
		$exclusions = self::sanitize_exclusions( $exclusions );

		if ( empty( $exclusions ) ) {
			delete_post_meta( $post_id, self::META_KEY );
		} else {
			update_post_meta( $post_id, self::META_KEY, $exclusions );
		}
	}

	/**
	 * Check whether a post is excluded from a given Index.
	 *
	 * @param int        $post_id Post ID.
	 * @param Index|null $index   Index object, or null to check "exclude all".
	 * @return bool
	 */
	public static function is_excluded( $post_id, $index = null ) {
		$exclusions = self::get_exclusions( $post_id );

		if ( empty( $exclusions ) ) {
			return false;
		}

		if ( in_array( self::EXCLUDE_ALL, $exclusions, true ) ) {
			return true;
		}

		if ( null !== $index && isset( $index->index_post ) ) {
			$slug = $index->index_post->post_name;
			if ( in_array( $slug, $exclusions, true ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Return an array of index data applicable to a given post type.
	 *
	 * Each item is:
	 *   [ 'slug' => string, 'label' => string, 'post_id' => int ]
	 *
	 * @param string|null $post_type Post type to filter by, or null for all.
	 * @return array<array{slug:string,label:string,post_id:int}>
	 */
	public static function get_indices( $post_type = null ) {
		$index_posts = get_posts(
			array(
				'post_type'      => Index::$cpt_slug,
				'posts_per_page' => -1,
				'post_status'    => 'publish',
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);

		$indices = array();

		foreach ( $index_posts as $index_post ) {
			$settings = json_decode( $index_post->post_content, true ) ?? array();

			// Filter by post type when provided.
			if ( null !== $post_type ) {
				$index_post_types = isset( $settings['post_types'] ) && is_array( $settings['post_types'] )
					? $settings['post_types']
					: array( 'post' );

				if ( ! in_array( $post_type, $index_post_types, true ) ) {
					continue;
				}
			}

			$indices[] = array(
				'slug'    => $index_post->post_name,
				'label'   => $index_post->post_title,
				'post_id' => $index_post->ID,
			);
		}

		return $indices;
	}

	/**
	 * Sanitize an exclusions array.
	 *
	 * Ensures each element is a safe string. Collapses to `[__all__]`
	 * when the sentinel is present alongside specific slugs.
	 *
	 * @param mixed $exclusions Raw value.
	 * @return array<string>
	 */
	public static function sanitize_exclusions( $exclusions ) {
		if ( ! is_array( $exclusions ) ) {
			return array();
		}

		$sanitized = array_values( array_unique( array_map( 'sanitize_key', $exclusions ) ) );

		// If __all__ is present, remove any specific slugs.
		if ( in_array( self::EXCLUDE_ALL, $sanitized, true ) ) {
			return array( self::EXCLUDE_ALL );
		}

		return $sanitized;
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	/**
	 * Collect all post types that have at least one configured index.
	 *
	 * @return array<string>
	 */
	private function get_applicable_post_types() {
		$index_posts = get_posts(
			array(
				'post_type'      => Index::$cpt_slug,
				'posts_per_page' => -1,
				'post_status'    => 'publish',
			)
		);

		$post_types = array();

		foreach ( $index_posts as $index_post ) {
			$settings   = json_decode( $index_post->post_content, true ) ?? array();
			$configured = isset( $settings['post_types'] ) && is_array( $settings['post_types'] )
				? $settings['post_types']
				: array( 'post' );

			$post_types = array_merge( $post_types, $configured );
		}

		// Fallback when no indices exist: use public post types.
		if ( empty( $post_types ) ) {
			$public     = get_post_types( array( 'public' => true ) );
			$post_types = array_diff( $public, Settings::get_ignored_post_types() );
		}

		return array_values( array_unique( $post_types ) );
	}
}
