/**
 * Unit tests for SignatureVerifier service
 * 
 * Tests signature generation and verification functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SignatureVerifier } from '../signature-verifier';
import { verificationDb } from '../../verification-db';
import { privateKeyToAccount } from 'viem/accounts';

// Mock the verification database
vi.mock('../../verification-db', () => ({
  verificationDb: {
    verificationNonce: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('SignatureVerifier', () => {
  let signatureVerifier: SignatureVerifier;
  let testAccount: ReturnType<typeof privateKeyToAccount>;

  beforeEach(() => {
    signatureVerifier = new SignatureVerifier();
    vi.clearAllMocks();

    // Create a test account for signing
    testAccount = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateVerificationMessage', () => {
    it('should generate a verification message with nonce and timestamp', async () => {
      const walletAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

      // Mock database create
      vi.mocked(verificationDb.verificationNonce.create).mockResolvedValue({
        nonce: 'test-nonce',
        walletAddress: walletAddress.toLowerCase(),
        message: 'test message',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await signatureVerifier.generateVerificationMessage(walletAddress);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('expiresAt');
      expect(result.message).toContain('Sign this message to verify wallet ownership');
      expect(result.message).toContain('Nonce:');
      expect(result.message).toContain('Timestamp:');
      expect(result.message).toContain(walletAddress.toLowerCase());
    });

    it('should normalize wallet address to lowercase', async () => {
      const walletAddress = '0xF39FD6E51AAD88F6F4CE6AB8827279CFFFB92266';

      vi.mocked(verificationDb.verificationNonce.create).mockResolvedValue({
        nonce: 'test-nonce',
        walletAddress: walletAddress.toLowerCase(),
        message: 'test message',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await signatureVerifier.generateVerificationMessage(walletAddress);

      expect(verificationDb.verificationNonce.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            walletAddress: walletAddress.toLowerCase(),
          }),
        })
      );
    });

    it('should store nonce in database with expiration', async () => {
      const walletAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

      vi.mocked(verificationDb.verificationNonce.create).mockResolvedValue({
        nonce: 'test-nonce',
        walletAddress: walletAddress.toLowerCase(),
        message: 'test message',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      await signatureVerifier.generateVerificationMessage(walletAddress);

      expect(verificationDb.verificationNonce.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nonce: expect.any(String),
            walletAddress: walletAddress.toLowerCase(),
            message: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        })
      );
    });

    it('should generate unique nonces for multiple calls', async () => {
      const walletAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const nonces: string[] = [];

      vi.mocked(verificationDb.verificationNonce.create).mockImplementation(async (args) => {
        nonces.push(args.data.nonce);
        return {
          nonce: args.data.nonce,
          walletAddress: args.data.walletAddress,
          message: args.data.message,
          expiresAt: args.data.expiresAt,
          createdAt: new Date(),
        };
      });

      await signatureVerifier.generateVerificationMessage(walletAddress);
      await signatureVerifier.generateVerificationMessage(walletAddress);
      await signatureVerifier.generateVerificationMessage(walletAddress);

      expect(nonces.length).toBe(3);
      expect(new Set(nonces).size).toBe(3); // All nonces should be unique
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', async () => {
      const walletAddress = testAccount.address;
      const message = `Sign this message to verify wallet ownership:\n\nNonce: 123-abc\nTimestamp: 2024-01-01T00:00:00.000Z\nAddress: ${walletAddress.toLowerCase()}`;

      // Sign the message
      const signature = await testAccount.signMessage({ message });

      // Mock database lookup
      vi.mocked(verificationDb.verificationNonce.findUnique).mockResolvedValue({
        nonce: '123-abc',
        walletAddress: walletAddress.toLowerCase(),
        message,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        createdAt: new Date(),
      });

      vi.mocked(verificationDb.verificationNonce.delete).mockResolvedValue({
        nonce: '123-abc',
        walletAddress: walletAddress.toLowerCase(),
        message,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await signatureVerifier.verifySignature(message, signature, walletAddress);

      expect(result).toBe(true);
      expect(verificationDb.verificationNonce.delete).toHaveBeenCalledWith({
        where: { nonce: '123-abc' },
      });
    });

    it('should reject signature with invalid nonce', async () => {
      const walletAddress = testAccount.address;
      const message = `Sign this message to verify wallet ownership:\n\nNonce: invalid-nonce\nTimestamp: 2024-01-01T00:00:00.000Z\nAddress: ${walletAddress.toLowerCase()}`;

      const signature = await testAccount.signMessage({ message });

      // Mock database lookup - nonce not found
      vi.mocked(verificationDb.verificationNonce.findUnique).mockResolvedValue(null);

      const result = await signatureVerifier.verifySignature(message, signature, walletAddress);

      expect(result).toBe(false);
      expect(verificationDb.verificationNonce.delete).not.toHaveBeenCalled();
    });

    it('should reject signature with expired nonce', async () => {
      const walletAddress = testAccount.address;
      const message = `Sign this message to verify wallet ownership:\n\nNonce: 123-abc\nTimestamp: 2024-01-01T00:00:00.000Z\nAddress: ${walletAddress.toLowerCase()}`;

      const signature = await testAccount.signMessage({ message });

      // Mock database lookup - expired nonce
      vi.mocked(verificationDb.verificationNonce.findUnique).mockResolvedValue({
        nonce: '123-abc',
        walletAddress: walletAddress.toLowerCase(),
        message,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        createdAt: new Date(),
      });

      vi.mocked(verificationDb.verificationNonce.delete).mockResolvedValue({
        nonce: '123-abc',
        walletAddress: walletAddress.toLowerCase(),
        message,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await signatureVerifier.verifySignature(message, signature, walletAddress);

      expect(result).toBe(false);
      // Should delete expired nonce
      expect(verificationDb.verificationNonce.delete).toHaveBeenCalledWith({
        where: { nonce: '123-abc' },
      });
    });

    it('should reject signature with mismatched message', async () => {
      const walletAddress = testAccount.address;
      const originalMessage = `Sign this message to verify wallet ownership:\n\nNonce: 123-abc\nTimestamp: 2024-01-01T00:00:00.000Z\nAddress: ${walletAddress.toLowerCase()}`;
      const tamperedMessage = `Sign this message to verify wallet ownership:\n\nNonce: 123-abc\nTimestamp: 2024-01-01T00:00:00.000Z\nAddress: 0x0000000000000000000000000000000000000000`;

      const signature = await testAccount.signMessage({ message: originalMessage });

      // Mock database lookup with original message
      vi.mocked(verificationDb.verificationNonce.findUnique).mockResolvedValue({
        nonce: '123-abc',
        walletAddress: walletAddress.toLowerCase(),
        message: originalMessage,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      });

      // Try to verify with tampered message
      const result = await signatureVerifier.verifySignature(tamperedMessage, signature, walletAddress);

      expect(result).toBe(false);
      expect(verificationDb.verificationNonce.delete).not.toHaveBeenCalled();
    });

    it('should reject signature from wrong wallet', async () => {
      const correctWallet = testAccount.address;
      const wrongWallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const message = `Sign this message to verify wallet ownership:\n\nNonce: 123-abc\nTimestamp: 2024-01-01T00:00:00.000Z\nAddress: ${correctWallet.toLowerCase()}`;

      const signature = await testAccount.signMessage({ message });

      // Mock database lookup
      vi.mocked(verificationDb.verificationNonce.findUnique).mockResolvedValue({
        nonce: '123-abc',
        walletAddress: correctWallet.toLowerCase(),
        message,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      });

      // Try to verify with wrong wallet address
      const result = await signatureVerifier.verifySignature(message, signature, wrongWallet);

      expect(result).toBe(false);
      expect(verificationDb.verificationNonce.delete).not.toHaveBeenCalled();
    });

    it('should handle message without nonce format', async () => {
      const walletAddress = testAccount.address;
      const invalidMessage = 'This message has no nonce';
      const signature = await testAccount.signMessage({ message: invalidMessage });

      const result = await signatureVerifier.verifySignature(invalidMessage, signature, walletAddress);

      expect(result).toBe(false);
      expect(verificationDb.verificationNonce.findUnique).not.toHaveBeenCalled();
    });

    it('should normalize wallet addresses for comparison', async () => {
      const walletAddress = testAccount.address;
      const upperCaseAddress = walletAddress.toUpperCase();
      const message = `Sign this message to verify wallet ownership:\n\nNonce: 123-abc\nTimestamp: 2024-01-01T00:00:00.000Z\nAddress: ${walletAddress.toLowerCase()}`;

      const signature = await testAccount.signMessage({ message });

      vi.mocked(verificationDb.verificationNonce.findUnique).mockResolvedValue({
        nonce: '123-abc',
        walletAddress: walletAddress.toLowerCase(),
        message,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      });

      vi.mocked(verificationDb.verificationNonce.delete).mockResolvedValue({
        nonce: '123-abc',
        walletAddress: walletAddress.toLowerCase(),
        message,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      // Verify with uppercase address
      const result = await signatureVerifier.verifySignature(message, signature, upperCaseAddress);

      expect(result).toBe(true);
    });
  });

  describe('cleanupExpiredNonces', () => {
    it('should delete expired nonces', async () => {
      vi.mocked(verificationDb.verificationNonce.deleteMany).mockResolvedValue({
        count: 5,
      });

      const result = await signatureVerifier.cleanupExpiredNonces();

      expect(result).toBe(5);
      expect(verificationDb.verificationNonce.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should return 0 when no expired nonces exist', async () => {
      vi.mocked(verificationDb.verificationNonce.deleteMany).mockResolvedValue({
        count: 0,
      });

      const result = await signatureVerifier.cleanupExpiredNonces();

      expect(result).toBe(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(verificationDb.verificationNonce.deleteMany).mockRejectedValue(
        new Error('Database error')
      );

      const result = await signatureVerifier.cleanupExpiredNonces();

      expect(result).toBe(0);
    });
  });
});
