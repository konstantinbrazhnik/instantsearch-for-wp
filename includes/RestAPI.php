<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName
/**
 * Rest API Class
 *
 * This class handles the REST API endpoints for the InstantSearch for WP plugin.
 *
 * Endpoints:
 * - /instantsearch/v1/available-indexing-parameters : Fetches available post types, taxonomies, and custom fields for indexing.
 * - /instantsearch/v1/run-indexer : Triggers the indexing process with specified parameters.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP;

/**
 * Class RestAPI
 *
 * Handles REST API routes and callbacks.
 */
class RestAPI {

	/**
	 * Current upstream Ask AI HTTP status code.
	 *
	 * @var int
	 */
	private int $ask_ai_upstream_status_code = 0;

	/**
	 * Buffered upstream Ask AI error response body.
	 *
	 * @var string
	 */
	private string $ask_ai_upstream_error_body = '';

	/**
	 * Number of upstream bytes streamed to the client.
	 *
	 * @var int
	 */
	private int $ask_ai_upstream_streamed_bytes = 0;

	/**
	 * Whether the upstream response included meaningful SSE content.
	 *
	 * @var bool
	 */
	private bool $ask_ai_upstream_has_meaningful_data = false;

	/**
	 * Constructor to register REST API routes.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register REST API routes.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {

		/** Register route to get InstantSearch for WP Settings */
		register_rest_route(
			'instantsearch-for-wp/v1',
			'/settings',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_settings' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		/** Register route to get available indexing parameters */
		register_rest_route(
			'instantsearch-for-wp/v1',
			'/available-indexing-parameters',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_available_indexing_parameters' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		/** Register route to run indexer. */
		register_rest_route(
			'wp/v2',
			'/' . Index::$cpt_slug . '/(?P<index_id>\d+)/run-indexer',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'run_indexer' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
				'args'                => array(
					'batch_size' => array(
						'required' => false,
						'type'     => 'integer',
						'default'  => 100,
					),
					'offset' => array(
						'required' => false,
						'type'     => 'integer',
						'default'  => 0,
					),
				),
			)
		);

		/** Register public route to proxy Ask AI chat requests. */
		register_rest_route(
			'instantsearch-for-wp/v1',
			'/ask-ai',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'proxy_ask_ai_chat' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'messages' => array(
						'required'          => true,
						'type'              => 'array',
						'validate_callback' => array( $this, 'validate_ask_ai_messages' ),
					),
					'searchParameters' => array(
						'required' => false,
						'type'     => 'object',
					),
				),
			)
		);
	}

	/**
	 * Get InstantSearch for WP settings.
	 *
	 * @since 1.0.0
	 *
	 * @return \WP_REST_Response The plugin settings.
	 */
	public function get_settings() {
		$settings = get_option( 'instantsearch_for_wp_settings', Settings::get_default_settings() );
		return rest_ensure_response( $settings );
	}

	/**
	 * Get available indexing parameters.
	 *
	 * @since 1.0.0
	 *
	 * @return \WP_REST_Response List of available indexing parameters.
	 */
	public function get_available_indexing_parameters() {
		$post_types    = $this->get_available_post_types();
		$taxonomies    = $this->get_available_taxonomies();
		$custom_fields = $this->get_available_custom_fields();

		return rest_ensure_response(
			array(
				'post_types'    => $post_types,
				'taxonomies'    => $taxonomies,
				'custom_fields' => $custom_fields,
			)
		);
	}

	/**
	 * Get available post types for indexing.
	 *
	 * @since 1.0.0
	 *
	 * @return array List of available post types.
	 */
	public function get_available_post_types() {
		$post_types = get_post_types(
			array(
				'public' => true,
			),
			'objects'
		);

		$attachment_type = get_post_type_object( 'attachment' );
		if ( $attachment_type ) {
			$post_types['attachment'] = $attachment_type;
		}

		$excluded_post_types = Settings::get_ignored_post_types();

		// Format post types as associative array.
		$formatted_post_types = array();
		foreach ( $post_types as $post_type ) {
			if ( in_array( $post_type->name, $excluded_post_types, true ) ) {
				continue;
			}
			$formatted_post_types[ $post_type->name ] = $post_type->label;
		}

		// Filter out any post types that should not be indexed.
		$formatted_post_types = apply_filters( 'instantsearch_for_wp_available_post_types', $formatted_post_types );

		return $formatted_post_types;
	}

	/**
	 * Get available taxonomies for indexing.
	 *
	 * @since 1.0.0
	 *
	 * @return array List of available taxonomies.
	 */
	public function get_available_taxonomies() {
		$taxonomies = get_taxonomies(
			array(
				'public' => true,
			),
			'objects'
		);

		$formatted_taxonomies = array();
		foreach ( $taxonomies as $taxonomy ) {
			$formatted_taxonomies[ $taxonomy->name ] = $taxonomy->label;
		}

		$formatted_taxonomies = apply_filters( 'instantsearch_for_wp_available_taxonomies', $formatted_taxonomies );

		return $formatted_taxonomies;
	}

	/**
	 * Get available custom fields for indexing.
	 *
	 * @since 1.0.0
	 *
	 * @return array List of available custom fields.
	 */
	public function get_available_custom_fields() {

		// Get distinct meta keys from the database.
		global $wpdb;
		$meta_keys = $wpdb->get_col( "SELECT DISTINCT meta_key FROM {$wpdb->postmeta} WHERE meta_key NOT LIKE '\_%'" );

		$custom_fields = apply_filters( 'instantsearch_for_wp_available_custom_fields', $meta_keys );

		return $custom_fields;
	}

	/**
	 * Run the indexer for a specific index.
	 *
	 * @since 1.0.0
	 *
	 * @param \WP_REST_Request $request The REST request.
	 * @return \WP_REST_Response The indexing result.
	 */
	public function run_indexer( $request ) {
		$index_id   = $request->get_param( 'index_id' );
		$batch_size = $request->get_param( 'batch_size' );
		$offset     = $request->get_param( 'offset' );
		$indexer    = Indexer::get_instance();

		$index = new Index( $index_id );
		if ( ! $index->index_post ) {
			return rest_ensure_response(
				array(
					'error' => __( 'Invalid index ID.', 'instantsearch-for-wp' ),
				)
			);
		}

		if ( $offset === 0 ) {
			// Clear the index before starting indexing.
			$indexer->provider->clear_index( $index->name );
		}

		$post_query = $index->get_posts_query( $batch_size, $offset );
		$post_ids   = $post_query->posts;

		try {
			$response = $indexer->index_or_delete_posts( $post_ids, array(), $index );
			$total    = (int) $post_query->found_posts;
			$percent  = 100;

			if ( $total > 0 ) {
				$percent = ( ( $offset + count( $post_ids ) ) / $total ) * 100;
			}

			return rest_ensure_response(
				array(
					'indexed_post_ids' => $post_ids,
					'total_posts'      => $total,
					'complete_percent' => $percent,
					'response'         => $response,
				)
			);
		} catch ( \Throwable $th ) {
			return rest_ensure_response(
				array(
					'error' => $th->getMessage(),
				)
			);
		}
	}

	/**
	 * Validate Ask AI messages payload.
	 *
	 * @param mixed            $value   Route arg value.
	 * @param \WP_REST_Request $request Request instance.
	 * @param string           $param   Parameter name.
	 * @return bool
	 */
	public function validate_ask_ai_messages( $value, $request, $param ) {
		if ( ! is_array( $value ) || empty( $value ) ) {
			return false;
		}

		foreach ( $value as $message ) {
			if ( ! is_array( $message ) ) {
				return false;
			}

			if ( empty( $message['role'] ) || ! in_array( $message['role'], array( 'user', 'assistant' ), true ) ) {
				return false;
			}

			if ( empty( $message['content'] ) || ! is_string( $message['content'] ) ) {
				return false;
			}

			if ( empty( $message['id'] ) || ! is_string( $message['id'] ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Proxy Ask AI chat request to Algolia.
	 *
	 * @param \WP_REST_Request $request Request instance.
	 * @return \WP_REST_Response|\WP_Error|void
	 */
	public function proxy_ask_ai_chat( $request ) {
		$config = $this->get_ask_ai_proxy_config();

		if ( is_wp_error( $config ) ) {
			return $config;
		}

		$body = $request->get_json_params();

		if ( ! is_array( $body ) || empty( $body['id'] ) || empty( $body['messages'] ) ) {
			return new \WP_Error(
				'instantsearch_for_wp_ask_ai_bad_request',
				__( 'Missing required Ask AI payload.', 'instantsearch-for-wp' ),
				array( 'status' => 400 )
			);
		}

		$origin     = $this->get_request_origin( $request );
		$referer    = $this->get_request_referer( $request );
		$token_data = $this->get_ask_ai_hmac_tokens( $config['assistant_id'], $origin, $referer );

		if ( is_wp_error( $token_data ) ) {
			return $token_data;
		}

		$payload = array(
			'id'       => sanitize_text_field( (string) $body['id'] ),
			'messages' => $this->normalize_ask_ai_messages( $body['messages'] ),
		);

		if ( ! empty( $body['searchParameters'] ) && is_array( $body['searchParameters'] ) ) {
			$payload['searchParameters'] = $this->normalize_search_parameters( $body['searchParameters'] );
		}

		$this->stream_ask_ai_chat_request( $config, $token_data, $payload, $origin, $referer );

		exit;
	}

	/**
	 * Get Ask AI proxy configuration from plugin settings/constants.
	 *
	 * @return array|\WP_Error
	 */
	private function get_ask_ai_proxy_config() {
		$settings = Settings::get_settings();

		if ( empty( $settings['provider'] ) || 'algolia' !== $settings['provider'] ) {
			return new \WP_Error(
				'instantsearch_for_wp_ask_ai_provider_not_supported',
				__( 'Ask AI proxy is only available when Algolia is selected as provider.', 'instantsearch-for-wp' ),
				array( 'status' => 403 )
			);
		}

		$algolia = isset( $settings['algolia'] ) && is_array( $settings['algolia'] ) ? $settings['algolia'] : array();

		if ( empty( $algolia['ai_summaries_enabled'] ) ) {
			return new \WP_Error(
				'instantsearch_for_wp_ask_ai_disabled',
				__( 'Ask AI summaries are disabled.', 'instantsearch-for-wp' ),
				array( 'status' => 403 )
			);
		}

		$app_id = ! empty( $algolia['app_id'] ) ? $algolia['app_id'] : '';
		if ( defined( 'ALGOLIA_APP_ID' ) ) {
			$app_id = ALGOLIA_APP_ID;
		}

		$search_api_key = ! empty( $algolia['search_only_api_key'] ) ? $algolia['search_only_api_key'] : '';
		if ( defined( 'ALGOLIA_SEARCH_ONLY_API_KEY' ) ) {
			$search_api_key = ALGOLIA_SEARCH_ONLY_API_KEY;
		}

		$admin_api_key = ! empty( $algolia['admin_api_key'] ) ? $algolia['admin_api_key'] : '';
		if ( defined( 'ALGOLIA_API_KEY' ) ) {
			$admin_api_key = ALGOLIA_API_KEY;
		}

		$assistant_id = ! empty( $algolia['ask_ai_agent_id'] ) ? sanitize_text_field( (string) $algolia['ask_ai_agent_id'] ) : '';

		if ( ! $search_api_key ) {
			$search_api_key = $admin_api_key;
		}

		if ( ! $app_id || ! $search_api_key || ! $assistant_id ) {
			return new \WP_Error(
				'instantsearch_for_wp_ask_ai_missing_config',
				__( 'Ask AI proxy is missing required Algolia configuration.', 'instantsearch-for-wp' ),
				array( 'status' => 500 )
			);
		}

		$index_name = '';
		if ( ! empty( $settings['use_as_sitesearch'] ) ) {
			$index_name = Settings::get_index_name( $settings['use_as_sitesearch'] );
		}

		if ( ! $index_name ) {
			$index_name = Settings::get_index_name();
		}

		return array(
			'app_id'       => $app_id,
			'api_key'      => $search_api_key,
			'admin_api_key' => $admin_api_key,
			'index_name'   => $index_name,
			'assistant_id' => $assistant_id,
		);
	}

	/**
	 * Normalize Ask AI messages payload.
	 *
	 * @param array $messages Raw messages payload.
	 * @return array
	 */
	private function normalize_ask_ai_messages( array $messages ) {
		$normalized = array();

		foreach ( $messages as $message ) {
			$item = array(
				'role'    => sanitize_text_field( (string) $message['role'] ),
				'content' => wp_kses_post( (string) $message['content'] ),
				'id'      => sanitize_text_field( (string) $message['id'] ),
			);

			if ( ! empty( $message['createdAt'] ) && is_string( $message['createdAt'] ) ) {
				$item['createdAt'] = sanitize_text_field( $message['createdAt'] );
			}

			if ( ! empty( $message['parts'] ) && is_array( $message['parts'] ) ) {
				$item['parts'] = $message['parts'];
			}

			$normalized[] = $item;
		}

		return $normalized;
	}

	/**
	 * Keep only supported search parameter keys.
	 *
	 * @param array $search_parameters Raw search parameters.
	 * @return array
	 */
	private function normalize_search_parameters( array $search_parameters ) {
		$allowed_keys = array(
			'facetFilters',
			'filters',
			'attributesToRetrieve',
			'restrictSearchableAttributes',
			'distinct',
		);

		$normalized = array();

		foreach ( $allowed_keys as $key ) {
			if ( isset( $search_parameters[ $key ] ) ) {
				$normalized[ $key ] = $search_parameters[ $key ];
			}
		}

		return $normalized;
	}

	/**
	 * Get the request origin for Ask AI token validation.
	 *
	 * @param \WP_REST_Request $request Request instance.
	 * @return string
	 */
	private function get_request_origin( $request ) {
		$origin = $request->get_header( 'origin' );

		if ( $origin ) {
			return esc_url_raw( $origin );
		}

		$referer = $this->get_request_referer( $request );
		$parts   = wp_parse_url( $referer );

		if ( empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			return home_url();
		}

		$origin = $parts['scheme'] . '://' . $parts['host'];

		if ( ! empty( $parts['port'] ) ) {
			$origin .= ':' . $parts['port'];
		}

		return $origin;
	}

	/**
	 * Get referer for Ask AI token validation.
	 *
	 * @param \WP_REST_Request $request Request instance.
	 * @return string
	 */
	private function get_request_referer( $request ) {
		$referer = $request->get_header( 'referer' );

		if ( ! $referer ) {
			$referer = wp_get_referer();
		}

		if ( ! $referer ) {
			$referer = home_url( '/' );
		}

		return esc_url_raw( $referer );
	}

	/**
	 * Get Ask AI HMAC token.
	 *
	 * @param string $assistant_id Ask AI assistant id.
	 * @param string $origin Site origin.
	 * @param string $referer Request referer.
	 * @return array|\WP_Error
	 */
	private function get_ask_ai_hmac_tokens( $assistant_id, $origin, $referer ) {
		$token_variants = array(
			array(
				'label'   => 'origin',
				'headers' => array(
					'X-Algolia-Assistant-Id' => $assistant_id,
					'Origin'                 => $origin,
				),
			),
		);

		if ( ! empty( $referer ) ) {
			$token_variants[] = array(
				'label'   => 'origin+referer',
				'headers' => array(
					'X-Algolia-Assistant-Id' => $assistant_id,
					'Origin'                 => $origin,
					'Referer'                => $referer,
				),
			);
		}

		$tokens       = array();
		$token_values = array();
		$last_error   = null;

		foreach ( $token_variants as $variant ) {
			$response = wp_remote_post(
				'https://askai.algolia.com/chat/token',
				array(
					'timeout' => 15,
					'headers' => $variant['headers'],
				)
			);

			if ( is_wp_error( $response ) ) {
				$last_error = new \WP_Error(
					'instantsearch_for_wp_ask_ai_token_request_failed',
					$response->get_error_message(),
					array( 'status' => 502 )
				);
				continue;
			}

			$status = wp_remote_retrieve_response_code( $response );
			$body   = json_decode( wp_remote_retrieve_body( $response ), true );

			if ( 200 !== $status || empty( $body['success'] ) || empty( $body['token'] ) ) {
				$last_error = new \WP_Error(
					'instantsearch_for_wp_ask_ai_token_invalid',
					! empty( $body['message'] ) ? $body['message'] : __( 'Could not fetch Ask AI token.', 'instantsearch-for-wp' ),
					array( 'status' => 502 )
				);
				continue;
			}

			$token = (string) $body['token'];

			if ( isset( $token_values[ $token ] ) ) {
				continue;
			}

			$token_values[ $token ] = true;
			$tokens[]               = array(
				'label' => $variant['label'],
				'token' => $token,
			);
		}

		if ( empty( $tokens ) ) {
			return $last_error ? $last_error : new \WP_Error(
				'instantsearch_for_wp_ask_ai_token_invalid',
				__( 'Could not fetch Ask AI token.', 'instantsearch-for-wp' ),
				array( 'status' => 502 )
			);
		}

		return $tokens;
	}

	/**
	 * Stream Ask AI chat response back to browser.
	 *
	 * @param array  $config Proxy config.
	 * @param array  $token_data Ask AI token variants.
	 * @param array  $payload Chat payload.
	 * @param string $origin Browser origin.
	 * @param string $referer Browser referer.
	 * @return void
	 */
	private function stream_ask_ai_chat_request( array $config, array $token_data, array $payload, $origin, $referer ) {
		$this->ask_ai_upstream_status_code = 0;
		$this->ask_ai_upstream_error_body  = '';
		$this->ask_ai_upstream_streamed_bytes = 0;
		$this->ask_ai_upstream_has_meaningful_data = false;

		if ( ! function_exists( 'curl_init' ) ) {
			status_header( 500 );
			header( 'Content-Type: application/json; charset=utf-8' );
			echo wp_json_encode(
				array(
					'success' => false,
					'message' => __( 'cURL is required for Ask AI proxy streaming.', 'instantsearch-for-wp' ),
				)
			);
			return;
		}

		ignore_user_abort( true );
		@set_time_limit( 0 );
		@ini_set( 'zlib.output_compression', '0' );
		@ini_set( 'output_buffering', 'off' );

		while ( ob_get_level() > 0 ) {
			ob_end_clean();
		}

		nocache_headers();
		status_header( 200 );

		header( 'Content-Type: text/event-stream; charset=utf-8' );
		header( 'Cache-Control: no-cache, no-store, must-revalidate' );
		header( 'Pragma: no-cache' );
		header( 'Expires: 0' );
		header( 'X-Accel-Buffering: no' );
		header( 'Connection: keep-alive' );

		// Send an initial SSE prelude so the browser starts consuming the stream immediately.
		echo ':' . str_repeat( ' ', 2048 ) . "\n\n";
		$this->flush_stream_output();

		$api_key_variants = array();
		if ( ! empty( $config['api_key'] ) ) {
			$api_key_variants[] = array(
				'label' => 'search',
				'key'   => $config['api_key'],
			);
		}
		if ( ! empty( $config['admin_api_key'] ) && $config['admin_api_key'] !== $config['api_key'] ) {
			$api_key_variants[] = array(
				'label' => 'admin',
				'key'   => $config['admin_api_key'],
			);
		}

		$chat_header_variants = array(
			array(
				'label'   => 'default',
				'headers' => array(),
			),
			array(
				'label'   => 'with-origin',
				'headers' => array(
					'Origin: ' . $origin,
					'Referer: ' . $referer,
				),
			),
		);

		$auth_variants = array(
			array(
				'label'  => 'raw',
				'format' => '%s',
			),
			array(
				'label'  => 'token-prefix',
				'format' => 'TOKEN %s',
			),
		);

		$last_error_message = __( 'Ask AI upstream returned no stream data.', 'instantsearch-for-wp' );

		foreach ( $token_data as $token_variant ) {
			foreach ( $api_key_variants as $api_key_variant ) {
				foreach ( $auth_variants as $auth_variant ) {
					foreach ( $chat_header_variants as $chat_header_variant ) {
						$this->ask_ai_upstream_status_code   = 0;
						$this->ask_ai_upstream_error_body    = '';
						$this->ask_ai_upstream_streamed_bytes = 0;
						$this->ask_ai_upstream_has_meaningful_data = false;

						$headers = array_merge(
							array(
								'Content-Type: application/json',
								'Accept: text/event-stream',
								'X-Algolia-Application-Id: ' . $config['app_id'],
								'X-Algolia-API-Key: ' . $api_key_variant['key'],
								'X-Algolia-Index-Name: ' . $config['index_name'],
								'X-Algolia-Assistant-Id: ' . $config['assistant_id'],
								'X-AI-SDK-Version: v4',
								'Authorization: ' . sprintf( $auth_variant['format'], $token_variant['token'] ),
							),
							$chat_header_variant['headers']
						);

						$curl = curl_init( 'https://askai.algolia.com/chat' );

						curl_setopt( $curl, CURLOPT_POST, true );
						curl_setopt( $curl, CURLOPT_HTTPHEADER, $headers );
						curl_setopt( $curl, CURLOPT_POSTFIELDS, wp_json_encode( $payload ) );
						curl_setopt( $curl, CURLOPT_FOLLOWLOCATION, true );
						curl_setopt( $curl, CURLOPT_HEADER, false );
						curl_setopt( $curl, CURLOPT_RETURNTRANSFER, false );
						curl_setopt( $curl, CURLOPT_TIMEOUT, 0 );
						curl_setopt( $curl, CURLOPT_CONNECTTIMEOUT, 15 );
						curl_setopt( $curl, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1 );
						curl_setopt( $curl, CURLOPT_BUFFERSIZE, 1024 );
						curl_setopt( $curl, CURLOPT_HEADERFUNCTION, array( $this, 'capture_ask_ai_response_headers' ) );
						curl_setopt( $curl, CURLOPT_WRITEFUNCTION, array( $this, 'stream_ask_ai_chunk_callback' ) );

						$result    = curl_exec( $curl );
						$http_code = (int) curl_getinfo( $curl, CURLINFO_RESPONSE_CODE );

						if ( $http_code > 0 ) {
							$this->ask_ai_upstream_status_code = $http_code;
						}

						if ( curl_errno( $curl ) ) {
							$last_error_message = curl_error( $curl );
							curl_close( $curl );
							continue;
						}

						if ( false !== $result && $http_code < 400 && $this->ask_ai_upstream_has_meaningful_data ) {
							curl_close( $curl );
							return;
						}

						$attempt_label = sprintf(
							'token=%s key=%s auth=%s chat=%s',
							$token_variant['label'],
							$api_key_variant['label'],
							$auth_variant['label'],
							$chat_header_variant['label']
						);

						$last_error_message = sprintf( __( 'Ask AI upstream returned HTTP %1$d during %2$s.', 'instantsearch-for-wp' ), $http_code, $attempt_label );

						if ( '' !== trim( $this->ask_ai_upstream_error_body ) ) {
							$last_error_message .= ' ' . trim( $this->ask_ai_upstream_error_body );
						} elseif ( 0 === $this->ask_ai_upstream_streamed_bytes && $http_code < 400 ) {
							$last_error_message .= ' ' . __( 'Ask AI upstream returned no stream data.', 'instantsearch-for-wp' );
						}

						curl_close( $curl );
					}
				}
			}
		}

		echo "event: error\n";
		echo 'data: ' . wp_json_encode(
			array(
				'success' => false,
				'message' => $last_error_message,
			)
		) . "\n\n";
		$this->flush_stream_output();
	}

	/**
	 * cURL callback for Ask AI stream chunks.
	 *
	 * @param resource $curl cURL handle.
	 * @param string   $chunk Stream chunk.
	 * @return int
	 */
	public function stream_ask_ai_chunk_callback( $curl, $chunk ) {
		if ( $this->ask_ai_upstream_status_code >= 400 ) {
			$this->ask_ai_upstream_error_body .= $chunk;
			return strlen( $chunk );
		}

		$this->ask_ai_upstream_streamed_bytes += strlen( $chunk );

		if ( preg_match( '/(^|\n)(event|data):/i', $chunk ) || '' !== trim( preg_replace( '/^:\s?.*$/m', '', $chunk ) ) ) {
			$this->ask_ai_upstream_has_meaningful_data = true;
		}

		echo $chunk;
		$this->flush_stream_output();

		return strlen( $chunk );
	}

	/**
	 * Capture upstream Ask AI response headers.
	 *
	 * @param resource $curl cURL handle.
	 * @param string   $header One response header line.
	 * @return int
	 */
	public function capture_ask_ai_response_headers( $curl, $header ) {
		if ( preg_match( '/^HTTP\/\S+\s+(\d{3})/i', trim( $header ), $matches ) ) {
			$this->ask_ai_upstream_status_code = (int) $matches[1];
			$this->ask_ai_upstream_error_body  = '';
		}

		return strlen( $header );
	}

	/**
	 * Flush output buffers for SSE streaming.
	 *
	 * @return void
	 */
	private function flush_stream_output() {
		@ob_flush();
		@flush();
	}
}
