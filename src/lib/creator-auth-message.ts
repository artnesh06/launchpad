/**
 * Shared (client + server) definition of the wallet-signed message that lets a
 * collection's creator call creator-only write APIs without an admin session.
 */

export const CREATOR_AUTH_HEADERS = {
  address: 'x-creator-address',
  issuedAt: 'x-creator-issued-at',
  signature: 'x-creator-signature',
} as const;

/** Signatures older than this (or more than 60s in the future) are rejected. */
export const CREATOR_AUTH_MAX_AGE_MS = 10 * 60 * 1000;

export type CreatorAction =
  | 'launchpad:save'
  | 'launchpad:status'
  | 'collection:update'
  | 'collection:update-images'
  | 'whitelist:update'
  | 'whitelist:delete'
  | 'ipfs:upload';

/** Fixed target used for 'ipfs:upload' signatures (uploads happen before a contract exists). */
export const IPFS_UPLOAD_TARGET = 'ipfs';

/**
 * @param target contract address (0x...) or launchpad id the action applies to
 * @param issuedAt ISO-8601 timestamp
 */
export function buildCreatorAuthMessage(params: {
  action: CreatorAction;
  target: string;
  signer: string;
  issuedAt: string;
}): string {
  return [
    'Odds Launchpad - authorize creator action',
    `Action: ${params.action}`,
    `Target: ${params.target.toLowerCase()}`,
    `Signer: ${params.signer.toLowerCase()}`,
    `Issued At: ${params.issuedAt}`,
  ].join('\n');
}
