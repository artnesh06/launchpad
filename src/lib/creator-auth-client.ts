'use client';

import { getAccount, signMessage } from 'wagmi/actions';
import { getConfig } from '@/lib/rainbowkit-config';
import {
  buildCreatorAuthMessage,
  CREATOR_AUTH_HEADERS,
  type CreatorAction,
} from '@/lib/creator-auth-message';

/**
 * Asks the connected wallet to sign a short authorization message and returns
 * the headers expected by creator-only write APIs (see src/lib/creator-auth.ts).
 *
 * @param target contract address (0x...) or launchpad id the action applies to
 */
export async function getCreatorAuthHeaders(
  action: CreatorAction,
  target: string
): Promise<Record<string, string>> {
  const config = getConfig();
  const account = getAccount(config);
  if (!account.address) {
    throw new Error('Connect your wallet to authorize this action');
  }

  const issuedAt = new Date().toISOString();
  const message = buildCreatorAuthMessage({
    action,
    target,
    signer: account.address,
    issuedAt,
  });
  const signature = await signMessage(config, { account: account.address, message });

  return {
    [CREATOR_AUTH_HEADERS.address]: account.address,
    [CREATOR_AUTH_HEADERS.issuedAt]: issuedAt,
    [CREATOR_AUTH_HEADERS.signature]: signature,
  };
}

/**
 * Same as getCreatorAuthHeaders but never throws: if signing is unavailable or
 * rejected it returns {} so an admin session (cookie) can still authorize the call.
 */
export async function getCreatorAuthHeadersSafe(
  action: CreatorAction,
  target: string
): Promise<Record<string, string>> {
  try {
    return await getCreatorAuthHeaders(action, target);
  } catch (error) {
    console.warn('Creator signature not provided:', error);
    return {};
  }
}
