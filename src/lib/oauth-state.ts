/**
 * OAuth State Management
 * 
 * Manages OAuth state tokens for CSRF protection during Discord OAuth flow.
 * State tokens are one-time use and expire after a short period.
 */

import { randomBytes } from 'crypto';

interface StateToken {
  state: string;
  createdAt: Date;
  expiresAt: Date;
  consumed: boolean;
}

// In-memory state store (for development/testing)
// In production, use Redis or database
const stateTokens = new Map<string, StateToken>();

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a unique state token
 */
export function generateStateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Store a state token
 */
export function storeStateToken(state: string): void {
  const now = new Date();
  
  const stateToken: StateToken = {
    state,
    createdAt: now,
    expiresAt: new Date(now.getTime() + STATE_EXPIRY_MS),
    consumed: false,
  };
  
  stateTokens.set(state, stateToken);
  console.log('[OAuth State] Token stored:', state.substring(0, 20) + '...', 'Expires at:', stateToken.expiresAt.toISOString());
  console.log('[OAuth State] Total tokens in store:', stateTokens.size);
}

/**
 * Store a state token (alias for compatibility)
 */
export function storeState(state: string): void {
  storeStateToken(state);
}

/**
 * Validate and consume a state token (one-time use)
 */
export function validateAndConsumeState(state: string): boolean {
  console.log('[OAuth State] Validating state:', state.substring(0, 20) + '...');
  console.log('[OAuth State] Total tokens in store:', stateTokens.size);
  console.log('[OAuth State] All stored states:', Array.from(stateTokens.keys()).map(s => s.substring(0, 20) + '...'));
  
  const stateToken = stateTokens.get(state);
  
  if (!stateToken) {
    console.error('[OAuth State] Token not found in store');
    return false;
  }
  
  console.log('[OAuth State] Token found. Consumed:', stateToken.consumed, 'Expires at:', stateToken.expiresAt.toISOString());
  
  // Check if already consumed
  if (stateToken.consumed) {
    console.error('[OAuth State] Token already consumed');
    return false;
  }
  
  // Check if expired
  const now = new Date();
  if (now > stateToken.expiresAt) {
    console.error('[OAuth State] Token expired. Now:', now.toISOString(), 'Expires:', stateToken.expiresAt.toISOString());
    stateTokens.delete(state);
    return false;
  }
  
  // Mark as consumed
  stateToken.consumed = true;
  
  // Delete after consumption
  stateTokens.delete(state);
  
  console.log('[OAuth State] Token validated and consumed successfully');
  return true;
}

/**
 * Clean up expired state tokens
 */
export function cleanupExpiredStates(): void {
  const now = new Date();
  
  for (const [state, stateToken] of stateTokens.entries()) {
    if (now > stateToken.expiresAt || stateToken.consumed) {
      stateTokens.delete(state);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredStates, 5 * 60 * 1000);
}
