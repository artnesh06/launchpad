/**
 * SignatureVerifier Service
 * 
 * Verifies cryptographic signatures to prove wallet ownership using EIP-191 standard.
 * Implements nonce-based verification to prevent replay attacks.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.6
 */

import { randomBytes } from 'crypto';
import { verifyMessage } from 'viem';
import { verificationDb } from '../verification-db';
import type { VerificationMessage } from '@/types/verification';
import { SignatureVerificationError } from '@/types/verification';
import { Logger } from '../logger';

/**
 * SignatureVerifier Service
 * 
 * Provides methods for generating verification messages and verifying signatures
 * to prove wallet ownership.
 */
export class SignatureVerifier {
  private readonly NONCE_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes
  private logger: Logger;

  constructor() {
    this.logger = new Logger('SignatureVerifier');
  }

  /**
   * Generate a unique verification message for wallet signature
   * 
   * Creates a message with a unique nonce and timestamp to prevent replay attacks.
   * The nonce is stored in the database with an expiration time.
   * 
   * @param walletAddress - The wallet address to generate a message for
   * @returns VerificationMessage with message text, nonce, and expiration
   * 
   * Requirements: 9.1, 9.6
   */
  async generateVerificationMessage(walletAddress: string): Promise<VerificationMessage> {
    try {
      // Normalize wallet address to lowercase
      const normalizedAddress = walletAddress.toLowerCase();

      // Generate unique nonce (timestamp + random string)
      const timestamp = Date.now();
      const randomPart = randomBytes(16).toString('hex');
      const nonce = `${timestamp}-${randomPart}`;

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + this.NONCE_EXPIRATION_MS);

      // Create verification message following EIP-191 format
      const message = `Sign this message to verify wallet ownership:\n\nNonce: ${nonce}\nTimestamp: ${new Date(timestamp).toISOString()}\nAddress: ${normalizedAddress}`;

      // Store nonce in database
      await verificationDb.verificationNonce.create({
        data: {
          nonce,
          walletAddress: normalizedAddress,
          message,
          expiresAt,
        },
      });

      return {
        message,
        nonce,
        expiresAt,
      };
    } catch (error) {
      this.logger.logDatabaseOperationFailure(
        'createVerificationNonce',
        error as Error,
        { walletAddress }
      );
      throw new SignatureVerificationError(
        'Failed to generate verification message',
        { walletAddress, error }
      );
    }
  }

  /**
   * Verify a cryptographic signature matches the expected wallet address
   * 
   * Uses EIP-191 personal_sign standard to recover the signer address from the signature
   * and compares it to the expected address. Also validates the nonce to prevent replay attacks.
   * 
   * @param message - The original message that was signed
   * @param signature - The signature to verify (hex string)
   * @param expectedAddress - The wallet address that should have signed the message
   * @returns true if signature is valid and matches expected address, false otherwise
   * 
   * Requirements: 9.3, 9.6
   */
  async verifySignature(
    message: string,
    signature: string,
    expectedAddress: string
  ): Promise<boolean> {
    try {
      // Normalize addresses to lowercase for comparison
      const normalizedExpectedAddress = expectedAddress.toLowerCase();

      // Extract nonce from message
      const nonceMatch = message.match(/Nonce: ([^\n]+)/);
      if (!nonceMatch) {
        this.logger.logSignatureVerificationFailure(
          expectedAddress,
          'Invalid message format: nonce not found',
          { message }
        );
        return false;
      }
      const nonce = nonceMatch[1];

      // Validate nonce exists and hasn't expired
      const nonceRecord = await verificationDb.verificationNonce.findUnique({
        where: { nonce },
      });

      if (!nonceRecord) {
        this.logger.logSignatureVerificationFailure(
          expectedAddress,
          'Nonce not found in database',
          { nonce, message }
        );
        return false;
      }

      if (nonceRecord.expiresAt < new Date()) {
        this.logger.logSignatureVerificationFailure(
          expectedAddress,
          'Nonce has expired',
          { nonce, expiresAt: nonceRecord.expiresAt.toISOString() }
        );
        // Clean up expired nonce
        await verificationDb.verificationNonce.delete({
          where: { nonce },
        });
        return false;
      }

      // Verify the message matches the stored message
      if (nonceRecord.message !== message) {
        this.logger.logSignatureVerificationFailure(
          expectedAddress,
          'Message does not match stored message',
          { nonce }
        );
        return false;
      }

      // Verify the wallet address matches the nonce record
      if (nonceRecord.walletAddress !== normalizedExpectedAddress) {
        this.logger.logSignatureVerificationFailure(
          expectedAddress,
          'Wallet address does not match nonce record',
          { 
            nonce,
            expectedAddress: normalizedExpectedAddress,
            nonceAddress: nonceRecord.walletAddress
          }
        );
        return false;
      }

      // Verify the signature using viem's verifyMessage (EIP-191)
      const isValid = await verifyMessage({
        address: normalizedExpectedAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        this.logger.logSignatureVerificationFailure(
          expectedAddress,
          'Signature cryptographic verification failed',
          { nonce, signatureLength: signature.length }
        );
        return false;
      }

      // Delete the nonce after successful verification (one-time use)
      await verificationDb.verificationNonce.delete({
        where: { nonce },
      });

      return true;
    } catch (error) {
      this.logger.logSignatureVerificationFailure(
        expectedAddress,
        'Unexpected error during signature verification',
        { 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      );
      return false;
    }
  }

  /**
   * Clean up expired nonces from the database
   * 
   * Should be called periodically to remove expired nonces and prevent database bloat.
   * 
   * @returns Number of expired nonces deleted
   */
  async cleanupExpiredNonces(): Promise<number> {
    try {
      const result = await verificationDb.verificationNonce.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        this.logger.info('Cleaned up expired verification nonces', {
          count: result.count
        });
      }

      return result.count;
    } catch (error) {
      this.logger.logDatabaseOperationFailure(
        'cleanupExpiredNonces',
        error as Error
      );
      return 0;
    }
  }
}

/**
 * Singleton instance of SignatureVerifier
 */
export const signatureVerifier = new SignatureVerifier();
