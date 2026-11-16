/**
 * Unit tests for wallet linking API endpoints
 * 
 * Tests the wallet linking flow including:
 * - Verification message generation
 * - Wallet linking with signature verification
 * - Fetching linked wallets
 * - Unlinking wallets
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST as verificationMessagePost } from '../verification-message/route';
import { POST as linkPost } from '../link/route';
import { GET as linkedGet } from '../linked/route';
import { DELETE as unlinkDelete } from '../[walletId]/route';
import { signatureVerifier } from '@/lib/verification/signature-verifier';
import { requireAuth } from '@/lib/verification-session';
import { verificationDb } from '@/lib/verification-db';
import { NextRequest } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';

// Mock dependencies
vi.mock('@/lib/verification/signature-verifier', () => ({
  signatureVerifier: {
    generateVerificationMessage: vi.fn(),
    verifySignature: vi.fn(),
  },
}));

vi.mock('@/lib/verification-session', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/verification-db', () => ({
  verificationDb: {
    verificationWallet: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Wallet Linking API Endpoints', () => {
  const testAccount = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
  const mockUser = {
    userId: 'user-123',
    discordId: 'discord-456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/wallets/verification-message', () => {
    it('should generate a verification message for a valid wallet address', async () => {
      const walletAddress = testAccount.address;
      const mockMessage = {
        message: `Sign this message to verify wallet ownership:\n\nNonce: 123-abc\nTimestamp: 2024-01-01T00:00:00.000Z\nAddress: ${walletAddress.toLowerCase()}`,
        nonce: '123-abc',
        expiresAt: new Date('2024-01-01T00:15:00.000Z'),
      };

      vi.mocked(signatureVerifier.generateVerificationMessage).mockResolvedValue(mockMessage);

      const request = new NextRequest('http://localhost:3000/api/wallets/verification-message', {
        method: 'POST',
        body: JSON.stringify({ walletAddress }),
      });

      const response = await verificationMessagePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('nonce');
      expect(data).toHaveProperty('expiresAt');
      expect(data.nonce).toBe('123-abc');
      expect(signatureVerifier.generateVerificationMessage).toHaveBeenCalledWith(walletAddress);
    });

    it('should return 400 for missing wallet address', async () => {
      const request = new NextRequest('http://localhost:3000/api/wallets/verification-message', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await verificationMessagePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for invalid wallet address format', async () => {
      const request = new NextRequest('http://localhost:3000/api/wallets/verification-message', {
        method: 'POST',
        body: JSON.stringify({ walletAddress: 'invalid-address' }),
      });

      const response = await verificationMessagePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_WALLET_ADDRESS');
    });
  });

  describe('POST /api/wallets/link', () => {
    it('should link a wallet with valid signature', async () => {
      const walletAddress = testAccount.address;
      const message = `Sign this message to verify wallet ownership:\n\nNonce: 123-abc\nTimestamp: 2024-01-01T00:00:00.000Z\nAddress: ${walletAddress.toLowerCase()}`;
      const signature = await testAccount.signMessage({ message });

      vi.mocked(requireAuth).mockResolvedValue(mockUser);
      vi.mocked(signatureVerifier.verifySignature).mockResolvedValue(true);
      vi.mocked(verificationDb.verificationWallet.findUnique).mockResolvedValue(null);
      vi.mocked(verificationDb.verificationWallet.findFirst).mockResolvedValue(null);
      vi.mocked(verificationDb.verificationWallet.create).mockResolvedValue({
        id: 'wallet-123',
        userId: mockUser.userId,
        address: walletAddress.toLowerCase(),
        signature,
        verifiedAt: new Date(),
        createdAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/wallets/link', {
        method: 'POST',
        body: JSON.stringify({ walletAddress, signature, message }),
      });

      const response = await linkPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.walletId).toBe('wallet-123');
      expect(signatureVerifier.verifySignature).toHaveBeenCalledWith(message, signature, walletAddress);
    });

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized - Please authenticate with Discord'));

      const request = new NextRequest('http://localhost:3000/api/wallets/link', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: testAccount.address,
          signature: '0x123',
          message: 'test',
        }),
      });

      const response = await linkPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for invalid signature', async () => {
      const walletAddress = testAccount.address;
      const message = 'test message';
      const signature = '0xinvalid';

      vi.mocked(requireAuth).mockResolvedValue(mockUser);
      vi.mocked(signatureVerifier.verifySignature).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/wallets/link', {
        method: 'POST',
        body: JSON.stringify({ walletAddress, signature, message }),
      });

      const response = await linkPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should return 400 if wallet already linked to user', async () => {
      const walletAddress = testAccount.address;

      vi.mocked(requireAuth).mockResolvedValue(mockUser);
      vi.mocked(signatureVerifier.verifySignature).mockResolvedValue(true);
      vi.mocked(verificationDb.verificationWallet.findUnique).mockResolvedValue({
        id: 'wallet-123',
        userId: mockUser.userId,
        address: walletAddress.toLowerCase(),
        signature: '0x123',
        verifiedAt: new Date(),
        createdAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/wallets/link', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress,
          signature: '0x123',
          message: 'test',
        }),
      });

      const response = await linkPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('WALLET_ALREADY_LINKED');
    });

    it('should return 400 if wallet linked to another user', async () => {
      const walletAddress = testAccount.address;

      vi.mocked(requireAuth).mockResolvedValue(mockUser);
      vi.mocked(signatureVerifier.verifySignature).mockResolvedValue(true);
      vi.mocked(verificationDb.verificationWallet.findUnique).mockResolvedValue(null);
      vi.mocked(verificationDb.verificationWallet.findFirst).mockResolvedValue({
        id: 'wallet-456',
        userId: 'other-user',
        address: walletAddress.toLowerCase(),
        signature: '0x123',
        verifiedAt: new Date(),
        createdAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/wallets/link', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress,
          signature: '0x123',
          message: 'test',
        }),
      });

      const response = await linkPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('WALLET_LINKED_TO_OTHER_USER');
    });
  });

  describe('GET /api/wallets/linked', () => {
    it('should return all linked wallets for authenticated user', async () => {
      const mockWallets = [
        {
          id: 'wallet-1',
          userId: mockUser.userId,
          address: '0x1234567890123456789012345678901234567890',
          signature: '0xsig1',
          verifiedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'wallet-2',
          userId: mockUser.userId,
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          signature: '0xsig2',
          verifiedAt: new Date('2024-01-02'),
          createdAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(requireAuth).mockResolvedValue(mockUser);
      vi.mocked(verificationDb.verificationWallet.findMany).mockResolvedValue(mockWallets);

      const request = new NextRequest('http://localhost:3000/api/wallets/linked', {
        method: 'GET',
      });

      const response = await linkedGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.wallets).toHaveLength(2);
      expect(data.wallets[0].id).toBe('wallet-1');
      expect(data.wallets[1].id).toBe('wallet-2');
    });

    it('should return empty array if no wallets linked', async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser);
      vi.mocked(verificationDb.verificationWallet.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/wallets/linked', {
        method: 'GET',
      });

      const response = await linkedGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.wallets).toHaveLength(0);
    });

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized - Please authenticate with Discord'));

      const request = new NextRequest('http://localhost:3000/api/wallets/linked', {
        method: 'GET',
      });

      const response = await linkedGet(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('DELETE /api/wallets/:walletId', () => {
    it('should unlink a wallet owned by authenticated user', async () => {
      const walletId = 'wallet-123';

      vi.mocked(requireAuth).mockResolvedValue(mockUser);
      vi.mocked(verificationDb.verificationWallet.findUnique).mockResolvedValue({
        id: walletId,
        userId: mockUser.userId,
        address: '0x1234567890123456789012345678901234567890',
        signature: '0xsig',
        verifiedAt: new Date(),
        createdAt: new Date(),
      });
      vi.mocked(verificationDb.verificationWallet.delete).mockResolvedValue({
        id: walletId,
        userId: mockUser.userId,
        address: '0x1234567890123456789012345678901234567890',
        signature: '0xsig',
        verifiedAt: new Date(),
        createdAt: new Date(),
      });

      const request = new NextRequest(`http://localhost:3000/api/wallets/${walletId}`, {
        method: 'DELETE',
      });

      const response = await unlinkDelete(request, { params: Promise.resolve({ walletId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(verificationDb.verificationWallet.delete).toHaveBeenCalledWith({
        where: { id: walletId },
      });
    });

    it('should return 404 if wallet not found', async () => {
      const walletId = 'nonexistent';

      vi.mocked(requireAuth).mockResolvedValue(mockUser);
      vi.mocked(verificationDb.verificationWallet.findUnique).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/wallets/${walletId}`, {
        method: 'DELETE',
      });

      const response = await unlinkDelete(request, { params: Promise.resolve({ walletId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('WALLET_NOT_FOUND');
    });

    it('should return 403 if wallet belongs to another user', async () => {
      const walletId = 'wallet-123';

      vi.mocked(requireAuth).mockResolvedValue(mockUser);
      vi.mocked(verificationDb.verificationWallet.findUnique).mockResolvedValue({
        id: walletId,
        userId: 'other-user',
        address: '0x1234567890123456789012345678901234567890',
        signature: '0xsig',
        verifiedAt: new Date(),
        createdAt: new Date(),
      });

      const request = new NextRequest(`http://localhost:3000/api/wallets/${walletId}`, {
        method: 'DELETE',
      });

      const response = await unlinkDelete(request, { params: Promise.resolve({ walletId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized - Please authenticate with Discord'));

      const request = new NextRequest('http://localhost:3000/api/wallets/wallet-123', {
        method: 'DELETE',
      });

      const response = await unlinkDelete(request, { params: Promise.resolve({ walletId: 'wallet-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });
});
