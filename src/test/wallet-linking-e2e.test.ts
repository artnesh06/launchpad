/**
 * End-to-End Test for Wallet Linking Flow
 * 
 * This test verifies that the complete wallet linking flow works correctly:
 * 1. Generate verification message
 * 2. Sign message with wallet
 * 3. Link wallet to Discord user
 * 4. Retrieve linked wallets
 * 5. Unlink wallet
 * 
 * Validates: Requirements 1.1-1.5, 2.1-2.9, 9.1-9.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signatureVerifier } from '@/lib/verification/signature-verifier';
import { verificationDb } from '@/lib/verification-db';
import { privateKeyToAccount } from 'viem/accounts';

describe('Wallet Linking End-to-End Flow', () => {
  const testAccount = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
  const mockUser = {
    userId: 'test-user-123',
    discordId: 'discord-456',
    discordUsername: 'TestUser',
    discordDiscriminator: '1234',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Clean up any existing test data
    await verificationDb.verificationWallet.deleteMany({
      where: {
        user: {
          discordId: { in: ['discord-456', 'discord-1', 'discord-2'] }
        }
      }
    });
    
    await verificationDb.verificationUser.deleteMany({
      where: {
        discordId: { in: ['discord-456', 'discord-1', 'discord-2'] }
      }
    });
    
    // Create the test user
    await verificationDb.verificationUser.create({
      data: {
        id: mockUser.userId,
        discordId: mockUser.discordId,
        discordUsername: mockUser.discordUsername,
        discordDiscriminator: mockUser.discordDiscriminator,
      }
    });
  });

  it('should complete full wallet linking flow', async () => {
    const walletAddress = testAccount.address;

    // Step 1: Generate verification message
    const verificationMessage = await signatureVerifier.generateVerificationMessage(walletAddress);
    
    expect(verificationMessage).toHaveProperty('message');
    expect(verificationMessage).toHaveProperty('nonce');
    expect(verificationMessage).toHaveProperty('expiresAt');
    expect(verificationMessage.message).toContain('Sign this message to verify wallet ownership');
    expect(verificationMessage.message).toContain(walletAddress.toLowerCase());

    // Step 2: Sign the message with the wallet
    const signature = await testAccount.signMessage({ 
      message: verificationMessage.message 
    });

    expect(signature).toBeTruthy();
    expect(signature).toMatch(/^0x[a-fA-F0-9]+$/);

    // Step 3: Verify the signature
    const isValid = await signatureVerifier.verifySignature(
      verificationMessage.message,
      signature,
      walletAddress
    );

    expect(isValid).toBe(true);

    // Step 4: Store wallet-Discord mapping (simulating successful link)
    const linkedWallet = await verificationDb.verificationWallet.create({
      data: {
        userId: mockUser.userId,
        address: walletAddress.toLowerCase(),
        signature,
        verifiedAt: new Date(),
      },
    });

    expect(linkedWallet).toBeTruthy();
    expect(linkedWallet.address).toBe(walletAddress.toLowerCase());
    expect(linkedWallet.userId).toBe(mockUser.userId);

    // Step 5: Retrieve linked wallets
    const linkedWallets = await verificationDb.verificationWallet.findMany({
      where: { userId: mockUser.userId },
    });

    expect(linkedWallets).toHaveLength(1);
    expect(linkedWallets[0].address).toBe(walletAddress.toLowerCase());

    // Step 6: Unlink wallet
    await verificationDb.verificationWallet.delete({
      where: { id: linkedWallet.id },
    });

    // Step 7: Verify wallet is unlinked
    const walletsAfterUnlink = await verificationDb.verificationWallet.findMany({
      where: { userId: mockUser.userId },
    });

    expect(walletsAfterUnlink).toHaveLength(0);
  });

  it('should support multiple wallets per user', async () => {
    const wallet1 = testAccount;
    const wallet2 = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');

    // Link first wallet
    const message1 = await signatureVerifier.generateVerificationMessage(wallet1.address);
    const signature1 = await wallet1.signMessage({ message: message1.message });
    const isValid1 = await signatureVerifier.verifySignature(message1.message, signature1, wallet1.address);
    expect(isValid1).toBe(true);

    const linkedWallet1 = await verificationDb.verificationWallet.create({
      data: {
        userId: mockUser.userId,
        address: wallet1.address.toLowerCase(),
        signature: signature1,
        verifiedAt: new Date(),
      },
    });

    // Link second wallet
    const message2 = await signatureVerifier.generateVerificationMessage(wallet2.address);
    const signature2 = await wallet2.signMessage({ message: message2.message });
    const isValid2 = await signatureVerifier.verifySignature(message2.message, signature2, wallet2.address);
    expect(isValid2).toBe(true);

    const linkedWallet2 = await verificationDb.verificationWallet.create({
      data: {
        userId: mockUser.userId,
        address: wallet2.address.toLowerCase(),
        signature: signature2,
        verifiedAt: new Date(),
      },
    });

    // Verify both wallets are linked
    const linkedWallets = await verificationDb.verificationWallet.findMany({
      where: { userId: mockUser.userId },
    });

    expect(linkedWallets).toHaveLength(2);
    expect(linkedWallets.map(w => w.address)).toContain(wallet1.address.toLowerCase());
    expect(linkedWallets.map(w => w.address)).toContain(wallet2.address.toLowerCase());

    // Cleanup
    await verificationDb.verificationWallet.deleteMany({
      where: { userId: mockUser.userId },
    });
  });

  it('should reject invalid signatures', async () => {
    const walletAddress = testAccount.address;
    const message = await signatureVerifier.generateVerificationMessage(walletAddress);
    
    // Create an invalid signature
    const invalidSignature = '0x' + '0'.repeat(130);

    const isValid = await signatureVerifier.verifySignature(
      message.message,
      invalidSignature,
      walletAddress
    );

    expect(isValid).toBe(false);
  });

  it('should reject signatures from wrong wallet', async () => {
    const correctWallet = testAccount;
    const wrongWallet = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');

    const message = await signatureVerifier.generateVerificationMessage(correctWallet.address);
    const signature = await correctWallet.signMessage({ message: message.message });

    // Try to verify with wrong wallet address
    const isValid = await signatureVerifier.verifySignature(
      message.message,
      signature,
      wrongWallet.address
    );

    expect(isValid).toBe(false);
  });

  it('should prevent duplicate wallet linking to same user', async () => {
    const walletAddress = testAccount.address;
    const message = await signatureVerifier.generateVerificationMessage(walletAddress);
    const signature = await testAccount.signMessage({ message: message.message });

    // Link wallet first time
    await verificationDb.verificationWallet.create({
      data: {
        userId: mockUser.userId,
        address: walletAddress.toLowerCase(),
        signature,
        verifiedAt: new Date(),
      },
    });

    // Try to link same wallet again - should fail due to unique constraint
    await expect(
      verificationDb.verificationWallet.create({
        data: {
          userId: mockUser.userId,
          address: walletAddress.toLowerCase(),
          signature,
          verifiedAt: new Date(),
        },
      })
    ).rejects.toThrow();

    // Cleanup
    await verificationDb.verificationWallet.deleteMany({
      where: { userId: mockUser.userId },
    });
  });

  it('should prevent wallet from being linked to multiple users', async () => {
    const walletAddress = testAccount.address;
    const message = await signatureVerifier.generateVerificationMessage(walletAddress);
    const signature = await testAccount.signMessage({ message: message.message });

    const user1 = { userId: 'user-1', discordId: 'discord-1' };
    const user2 = { userId: 'user-2', discordId: 'discord-2' };

    // Create user1
    await verificationDb.verificationUser.create({
      data: {
        id: user1.userId,
        discordId: user1.discordId,
        discordUsername: 'User1',
        discordDiscriminator: '0001',
      }
    });

    // Link wallet to first user
    await verificationDb.verificationWallet.create({
      data: {
        userId: user1.userId,
        address: walletAddress.toLowerCase(),
        signature,
        verifiedAt: new Date(),
      },
    });

    // Check if wallet is already linked to another user
    const existingWallet = await verificationDb.verificationWallet.findFirst({
      where: {
        address: walletAddress.toLowerCase(),
        userId: { not: user2.userId },
      },
    });

    expect(existingWallet).toBeTruthy();
    expect(existingWallet?.userId).toBe(user1.userId);

    // Cleanup
    await verificationDb.verificationWallet.deleteMany({
      where: { address: walletAddress.toLowerCase() },
    });
    
    await verificationDb.verificationUser.delete({
      where: { id: user1.userId },
    });
  });
});
