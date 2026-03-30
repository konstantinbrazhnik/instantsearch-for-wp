// @ts-check
const { execSync } = require('node:child_process');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const COMPOSE_FILE = path.join(REPO_ROOT, 'dev/docker-compose.yml');

/**
 * Execute WP-CLI inside the e2e Docker environment.
 *
 * @param {string[]} args WP-CLI args (without the leading "wp").
 * @returns {string}
 */
function runWpCli(args) {
  const escapedArgs = args.map(escapeShellArg).join(' ');
  const command =
    `cd ${escapeShellArg(REPO_ROOT)} && ` +
    `docker compose -f ${escapeShellArg(COMPOSE_FILE)} run --rm wpcli ${escapedArgs}`;

  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Ensure a deterministic e2e PDF attachment exists and return IDs used in tests.
 *
 * This helper intentionally avoids creating/updating index CPT posts because
 * saving an index can trigger provider-side operations.
 *
 * @returns {{ attachmentId: number, indexCount: number }}
 */
function ensurePdfAttachmentScenario() {
  const result = runWpCli([
    'eval',
    [
      '$attachment_id = wp_insert_post(',
      '  array(',
      "    'post_type'      => 'attachment',",
      "    'post_status'    => 'inherit',",
      "    'post_title'     => 'E2E PDF Attachment',",
      "    'post_mime_type' => 'application/pdf',",
      '  )',
      ');',
      "$index_count = (int) wp_count_posts( 'isfwp_index' )->publish;",
      "echo wp_json_encode( array( 'attachment_id' => (int) $attachment_id, 'index_count' => $index_count ) );",
    ].join(' '),
  ]);

  const parsed = JSON.parse(result);

  return {
    attachmentId: Number(parsed.attachment_id),
    indexCount: Number(parsed.index_count),
  };
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeShellArg(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

module.exports = {
  runWpCli,
  ensurePdfAttachmentScenario,
};
