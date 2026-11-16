/**
 * Database Connection and ORM Configuration for NFT Holder Verification
 * 
 * This module provides database access for the verification system using Prisma.
 * It reuses the existing Prisma client instance from the main application.
 */

import { PrismaClient } from '@prisma/client';

// Extend the global namespace to include prisma
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Get or create a Prisma client instance
 * In development, this prevents multiple instances during hot reloading
 */
export const getVerificationDb = (): PrismaClient => {
  if (global.prisma) {
    return global.prisma;
  }

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
  }

  return prisma;
};

/**
 * Verification database client instance
 * Use this for all verification-related database operations
 */
export const verificationDb = getVerificationDb();

/**
 * Disconnect from the database
 * Call this when shutting down the application
 */
export const disconnectVerificationDb = async (): Promise<void> => {
  await verificationDb.$disconnect();
};

/**
 * Check database connection health
 * Returns true if the database is accessible
 */
export const checkVerificationDbHealth = async (): Promise<boolean> => {
  try {
    await verificationDb.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

/**
 * Initialize database connection and verify schema
 * Call this on application startup
 */
export const initializeVerificationDb = async (): Promise<void> => {
  try {
    // Test connection
    await verificationDb.$connect();
    console.log('✓ Verification database connected');

    // Verify that verification tables exist
    const tables = await verificationDb.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'verification_%'
      ORDER BY table_name
    `;

    const expectedTables = [
      'verification_chains',
      'verification_logs',
      'verification_managed_roles',
      'verification_nft_collections',
      'verification_nonces',
      'verification_role_rule_collections',
      'verification_role_rules',
      'verification_users',
      'verification_wallets',
    ];

    const existingTables = tables.map((t) => t.table_name);
    const missingTables = expectedTables.filter((t) => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.warn('⚠ Missing verification tables:', missingTables);
      console.warn('Please run the database migration from prisma/migrations/manual_nft_holder_verification/');
    } else {
      console.log('✓ All verification tables present');
    }
  } catch (error) {
    console.error('Failed to initialize verification database:', error);
    throw error;
  }
};

/**
 * Clean up expired verification nonces
 * Should be called periodically (e.g., every hour)
 */
export const cleanupExpiredNonces = async (): Promise<number> => {
  try {
    const result = await verificationDb.verificationNonce.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    
    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} expired verification nonces`);
    }
    
    return result.count;
  } catch (error) {
    console.error('Failed to cleanup expired nonces:', error);
    return 0;
  }
};

// Export Prisma types for convenience
export type {
  VerificationUser,
  VerificationWallet,
  VerificationChain,
  VerificationNFTCollection,
  VerificationRoleRule,
  VerificationRoleRuleCollection,
  VerificationManagedRole,
  VerificationNonce,
  VerificationLog,
} from '@prisma/client';

export { VerificationRuleType, VerificationRequirementType } from '@prisma/client';
