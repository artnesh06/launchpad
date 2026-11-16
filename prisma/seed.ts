import { PrismaClient } from '@prisma/client';
import { SUPPORTED_CHAINS } from '../src/config/chains';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seed supported chains
  for (const [chainId, chainConfig] of Object.entries(SUPPORTED_CHAINS)) {
    const chainIdNum = parseInt(chainId);
    
    await prisma.chain.upsert({
      where: { chainId: chainIdNum },
      update: {
        name: chainConfig.name,
        network: chainConfig.network,
        rpcUrl: chainConfig.rpcUrl,
        blockExplorer: chainConfig.blockExplorer,
        nativeCurrencyName: chainConfig.nativeCurrency.name,
        nativeCurrencySymbol: chainConfig.nativeCurrency.symbol,
        nativeCurrencyDecimals: chainConfig.nativeCurrency.decimals,
        isTestnet: chainConfig.isTestnet,
        icon: chainConfig.icon
      },
      create: {
        chainId: chainIdNum,
        name: chainConfig.name,
        network: chainConfig.network,
        rpcUrl: chainConfig.rpcUrl,
        blockExplorer: chainConfig.blockExplorer,
        nativeCurrencyName: chainConfig.nativeCurrency.name,
        nativeCurrencySymbol: chainConfig.nativeCurrency.symbol,
        nativeCurrencyDecimals: chainConfig.nativeCurrency.decimals,
        isTestnet: chainConfig.isTestnet,
        icon: chainConfig.icon
      }
    });
    
    console.log(`✅ Seeded chain: ${chainConfig.name} (${chainIdNum})`);

    // Seed LaunchpadFactory for each chain if it has a factory address
    if (chainConfig.launchpadFactoryAddress) {
      await prisma.launchpadFactory.upsert({
        where: { contractAddress: chainConfig.launchpadFactoryAddress },
        update: {
          chainId: chainIdNum,
          version: '1.0.0',
          deployedChainId: chainIdNum,
          owner: chainConfig.launchpadFactoryAddress, // Placeholder
          treasury: chainConfig.launchpadFactoryAddress,
          creationFee: '1000000000000000', // 0.001 ETH in wei
          platformFeePercentage: 250, // 2.5%
          freeMintFee: '500000000000000', // 0.0005 ETH in wei
          totalLaunchpads: 0,
          isActive: true
        },
        create: {
          chainId: chainIdNum,
          contractAddress: chainConfig.launchpadFactoryAddress,
          version: '1.0.0',
          deployedChainId: chainIdNum,
          owner: chainConfig.launchpadFactoryAddress,
          treasury: chainConfig.launchpadFactoryAddress,
          creationFee: '1000000000000000',
          platformFeePercentage: 250,
          freeMintFee: '500000000000000',
          totalLaunchpads: 0,
          isActive: true
        }
      });
      
      console.log(`✅ Seeded factory for ${chainConfig.name}`);
    }
  }

  // Seed some sample admin users
  const adminAddresses = [
    '0x742d35cc6634C0532925a3b8D8c8e00C7538C8d6',
    '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
  ];

  for (const address of adminAddresses) {
    await prisma.adminUser.upsert({
      where: { address },
      update: {
        role: 'SUPER_ADMIN',
        isActive: true,
        lastActiveAt: new Date()
      },
      create: {
        address,
        role: 'SUPER_ADMIN',
        isActive: true,
        lastActiveAt: new Date()
      }
    });
    
    console.log(`✅ Seeded admin user: ${address}`);
  }

  // No dummy data - only seed chains, factories, and admin users

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });