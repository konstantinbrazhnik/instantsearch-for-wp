<?php
/**
 * PDF Text Extractor Class
 *
 * Extracts and caches text content from PDF attachment files.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP;

use Smalot\PdfParser\Parser;

/**
 * Extract and cache text for PDF attachments.
 */
class PDFTextExtractor {

	/**
	 * Singleton instance.
	 *
	 * @var PDFTextExtractor|null
	 */
	private static ?PDFTextExtractor $instance = null;

	/**
	 * Parsed text cache key.
	 *
	 * @var string
	 */
	private string $text_meta_key = '_instantsearch_pdf_text';

	/**
	 * File fingerprint cache key.
	 *
	 * @var string
	 */
	private string $fingerprint_meta_key = '_instantsearch_pdf_fingerprint';

	/**
	 * Get singleton instance.
	 *
	 * @return PDFTextExtractor
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Get extracted text for a PDF attachment.
	 *
	 * @param int $attachment_id Attachment post ID.
	 * @return string
	 */
	public function get_attachment_text( $attachment_id ) {
		$attachment_id = (int) $attachment_id;
		if ( $attachment_id <= 0 || ! $this->is_pdf_attachment( $attachment_id ) ) {
			return '';
		}

		$file_path = get_attached_file( $attachment_id );
		if ( ! is_string( $file_path ) || '' === $file_path || ! file_exists( $file_path ) || ! is_readable( $file_path ) ) {
			return '';
		}

		$fingerprint = $this->build_file_fingerprint( $file_path );
		$cached_text = get_post_meta( $attachment_id, $this->text_meta_key, true );
		$cached_fingerprint = get_post_meta( $attachment_id, $this->fingerprint_meta_key, true );

		if ( is_string( $cached_text ) && $cached_fingerprint === $fingerprint ) {
			return $cached_text;
		}

		$max_file_size = (int) apply_filters( 'instantsearch_pdf_max_file_size_bytes', 25 * 1024 * 1024, $attachment_id );
		$file_size     = @filesize( $file_path );

		if ( $max_file_size > 0 && false !== $file_size && $file_size > $max_file_size ) {
			update_post_meta( $attachment_id, $this->text_meta_key, '' );
			update_post_meta( $attachment_id, $this->fingerprint_meta_key, $fingerprint );
			return '';
		}

		$text = $this->parse_pdf_file( $file_path );
		update_post_meta( $attachment_id, $this->text_meta_key, $text );
		update_post_meta( $attachment_id, $this->fingerprint_meta_key, $fingerprint );

		return $text;
	}

	/**
	 * Parse and normalize text from a PDF file.
	 *
	 * @param string $file_path Absolute path to PDF file.
	 * @return string
	 */
	private function parse_pdf_file( $file_path ) {
		$parser = new Parser();

		try {
			$pdf  = $parser->parseFile( $file_path );
			$text = $pdf->getText();
		} catch ( \Throwable $th ) {
			error_log( $th->getMessage() );
			return '';
		}

		if ( ! is_string( $text ) || '' === $text ) {
			return '';
		}

		$text = preg_replace( '/\s+/u', ' ', $text );
		$text = is_string( $text ) ? trim( $text ) : '';

		return $text;
	}

	/**
	 * Check if an attachment is a PDF.
	 *
	 * @param int $attachment_id Attachment post ID.
	 * @return bool
	 */
	private function is_pdf_attachment( $attachment_id ) {
		return 'attachment' === get_post_type( $attachment_id )
			&& 'application/pdf' === get_post_mime_type( $attachment_id );
	}

	/**
	 * Build fingerprint used to invalidate cached extraction.
	 *
	 * @param string $file_path Absolute path to file.
	 * @return string
	 */
	private function build_file_fingerprint( $file_path ) {
		$mtime = @filemtime( $file_path );
		$size  = @filesize( $file_path );

		return sprintf( '%s:%s', (string) $mtime, (string) $size );
	}
}
