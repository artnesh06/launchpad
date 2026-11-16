/**
 * Verification Database Setup Verification Script
 * 
 * This script verifies that the NFT holder verification database tables
 * are properly set up and accessible.
 * 
 * Usage:
 *   npx ts-node scripts/verify-verification-db.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TableInfo {
  table_name: string;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

async function verifyDatabase() {
  console.log('🔍 Verifying NFT Holder Verification Database Setup...\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('   ✓ Database connection successful\n');

    // Check for verification tables
    console.log('2. Checking for verification tables...');
    const tables = await prisma.$queryRaw<TableInfo[]>`
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
      console.log('   ✗ Missing tables:');
      missingTables.forEach((table) => console.log(`     - ${table}`));
      console.log('\n   Please run the migration from:');
      console.log('   prisma/migrations/manual_nft_holder_verification/migration.sql\n');
      process.exit(1);
    }

    console.log('   ✓ All verification tables present:');
    existingTables.forEach((table) => console.log(`     - ${table}`));
    console.log();

    // Check enum types
    console.log('3. Checking enum types...');
    const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
      SELECT typname 
      FROM pg_type 
      WHERE typname IN ('VerificationRuleType', 'VerificationRequirementType')
    `;

    const enumNames = enums.map((e) => e.typname);
    const expectedEnums = ['VerificationRuleType', 'VerificationRequirementType'];
    const missingEnums = expectedEnums.filter((e) => !enumNames.includes(e));

    if (missingEnums.length > 0) {
      console.log('   ✗ Missing enum types:');
      missingEnums.forEach((enumType) => console.log(`     - ${enumType}`));
      console.log();
      process.exit(1);
    }

    console.log('   ✓ All enum types present:');
    enumNames.forEach((enumType) => console.log(`     - ${enumType}`));
    console.log();

    // Check indexes
    console.log('4. Checking indexes...');
    const indexes = await prisma.$queryRaw<Array<{ indexname: string; tablename: string }>>`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename LIKE 'verification_%'
      ORDER BY tablename, indexname
    `;

    console.log(`   ✓ Found ${indexes.length} indexes on verification tables`);
    console.log();

    // Test basic CRUD operations
    console.log('5. Testing basic CRUD operations...');

    // Test creating a chain
    const testChain = await prisma.verificationChain.create({
      data: {
        name: 'Test Chain',
        networkId: 'test-' + Date.now(),
        rpcEndpoint: 'https://test.rpc.endpoint',
        explorerUrl: 'https://test.explorer',
      },
    });
    console.log('   ✓ Created test chain');

    // Test reading the chain
    const foundChain = await prisma.verificationChain.findUnique({
      where: { id: testChain.id },
    });
    if (!foundChain) {
      throw new Error('Failed to read created chain');
    }
    console.log('   ✓ Read test chain');

    // Test updating the chain
    await prisma.verificationChain.update({
      where: { id: testChain.id },
      data: { name: 'Updated Test Chain' },
    });
    console.log('   ✓ Updated test chain');

    // Test deleting the chain
    await prisma.verificationChain.delete({
      where: { id: testChain.id },
    });
    console.log('   ✓ Deleted test chain');
    console.log();

    // Test foreign key relationships
    console.log('6. Testing foreign key relationships...');

    // Create a chain and collection
    const chain = await prisma.verificationChain.create({
      data: {
        name: 'Ethereum',
        networkId: 'eth-test-' + Date.now(),
        rpcEndpoint: 'https://eth.rpc',
      },
    });

    const collection = await prisma.verificationNFTCollection.create({
      data: {
        name: 'Test Collection',
        contractAddress: '0x' + '0'.repeat(40),
        chainId: chain.id,
      },
    });
    console.log('   ✓ Created chain and collection with foreign key');

    // Test cascade delete prevention (RESTRICT)
    try {
      await prisma.verificationChain.delete({
        where: { id: chain.id },
      });
      console.log('   ✗ Chain deletion should have been prevented');
      process.exit(1);
    } catch (error) {
      console.log('   ✓ Foreign key RESTRICT working correctly');
    }

    // Cleanup
    await prisma.verificationNFTCollection.delete({
      where: { id: collection.id },
    });
    await prisma.verificationChain.delete({
      where: { id: chain.id },
    });
    console.log('   ✓ Cleaned up test data');
    console.log();

    // Test user and wallet cascade
    console.log('7. Testing cascade delete...');

    const user = await prisma.verificationUser.create({
      data: {
        discordId: 'test-' + Date.now(),
        discordUsername: 'testuser',
        discordDiscriminator: '0001',
      },
    });

    const wallet = await prisma.verificationWallet.create({
      data: {
        userId: user.id,
        address: '0x' + '1'.repeat(40),
        signature: '0xtest',
        verifiedAt: new Date(),
      },
    });

    // Delete user should cascade to wallet
    await prisma.verificationUser.delete({
      where: { id: user.id },
    });

    const walletExists = await prisma.verificationWallet.findUnique({
      where: { id: wallet.id },
    });

    if (walletExists) {
      console.log('   ✗ Wallet should have been deleted with user');
      process.exit(1);
    }

    console.log('   ✓ CASCADE delete working correctly');
    console.log();

    // Summary
    console.log('✅ All verification checks passed!');
    console.log('\nDatabase is ready for NFT Holder Verification system.');
    console.log('\nNext steps:');
    console.log('  1. Configure Discord bot credentials in .env');
    console.log('  2. Set up blockchain RPC endpoints');
    console.log('  3. Run the verification service');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
