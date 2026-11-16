/**
 * Discord OAuth Endpoints Tests
 * 
 * Tests for Discord OAuth authentication flow endpoints.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateSessionToken, createSession, validateSession } from '@/lib/verification-session';
import { storeState, validateAndConsumeState } from '@/lib/oauth-state';

describe('Discord OAuth Endpoints', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  describe('POST /api/auth/discord/initiate', () => {
    it('should return authorization URL and state token', async () => {
      // Skip if Discord credentials are not configured
      if (!process.env.DISCORD_CLIENT_ID) {
        console.warn('⚠️ DISCORD_CLIENT_ID not configured - skipping test');
        return;
      }

      const response = await fetch(`${baseUrl}/api/auth/discord/initiate`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('authUrl');
      expect(data).toHaveProperty('state');
      expect(data.authUrl).toContain('discord.com/oauth2/authorize');
      expect(data.state).toMatch(/^[a-f0-9]{64}$/); // 32 bytes hex = 64 chars
    });

    it('should fail if Discord credentials are not configured', async () => {
      // Temporarily unset credentials
      const originalClientId = process.env.DISCORD_CLIENT_ID;
      delete process.env.DISCORD_CLIENT_ID;

      const response = await fetch(`${baseUrl}/api/auth/discord/initiate`, {
        method: 'POST',
      });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.code).toBe('OAUTH_INITIATE_FAILED');

      // Restore credentials
      if (originalClientId) {
        process.env.DISCORD_CLIENT_ID = originalClientId;
      }
    });
  });

  describe('POST /api/auth/discord/callback', () => {
    it('should reject request with missing fields', async () => {
      const response = await fetch(`${baseUrl}/api/auth/discord/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should reject request with invalid state', async () => {
      const response = await fetch(`${baseUrl}/api/auth/discord/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'test_code',
          state: 'invalid_state',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.code).toBe('INVALID_STATE');
    });
  });

  describe('Session Management', () => {
    it('should generate unique session tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[a-f0-9]{64}$/);
      expect(token2).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should create and validate sessions', () => {
      const userId = 'test-user-id';
      const discordId = 'test-discord-id';
      const token = createSession(userId, discordId);

      const validation = validateSession(token);
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe(userId);
      expect(validation.discordId).toBe(discordId);
    });

    it('should reject invalid session tokens', () => {
      const validation = validateSession('invalid-token');
      expect(validation.valid).toBe(false);
      expect(validation.userId).toBeUndefined();
    });
  });

  describe('OAuth State Management', () => {
    it('should store and validate state tokens', () => {
      const state = 'test-state-token';
      storeState(state);

      const isValid = validateAndConsumeState(state);
      expect(isValid).toBe(true);
    });

    it('should consume state tokens (one-time use)', () => {
      const state = 'test-state-token-2';
      storeState(state);

      // First validation should succeed
      const isValid1 = validateAndConsumeState(state);
      expect(isValid1).toBe(true);

      // Second validation should fail (already consumed)
      const isValid2 = validateAndConsumeState(state);
      expect(isValid2).toBe(false);
    });

    it('should reject invalid state tokens', () => {
      const isValid = validateAndConsumeState('non-existent-state');
      expect(isValid).toBe(false);
    });
  });
});
