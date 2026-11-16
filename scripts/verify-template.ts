/**
 * Script to verify OddsLaunchpad template approval status
 * Usage: npx ts-node scripts/verify-template.ts
 */

import { ContractService } from '../src/lib/contract-service';
import { getChainConfig } from '../src/config/chains';

async function main() {
  const chainId = 11155111; // Sepolia
  const chain = getChainConfig(chainId);

  if (!chain) {
    console.error(`❌ Chain ${chainId} not configured`);
    process.exit(1);
  }

  console.log('🔍 Verifying OddsLaunchpad Template');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Chain: ${chain.name}`);
  console.log(`Factory: ${chain.launchpadFactoryAddress}`);
  console.log(`Template: ${chain.oddsTemplateAddress}`);
  console.log('');

  if (!chain.oddsTemplateAddress) {
    console.error('❌ Template address not configured for this chain');
    process.exit(1);
  }

  try {
    const service = new ContractService();

    // Check if template is approved
    console.log('⏳ Checking template approval status...');
    const isApproved = await service.isTemplateApproved(
      chainId,
      chain.oddsTemplateAddress
    );

    if (isApproved) {
      console.log('✅ Template is APPROVED');
      console.log('');
      console.log('You can now deploy collections using this template!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Open Creator Studio: http://localhost:3000/create/add');
      console.log('2. Fill in collection details');
      console.log('3. Submit to deploy via MasterContractFactory');
    } else {
      console.log('❌ Template is NOT APPROVED');
      console.log('');
      console.log('To approve the template, run:');
      console.log('npx hardhat run scripts/approve-template-sepolia.js --network sepolia');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Explorer Links:');
    console.log(`Factory: ${chain.blockExplorer}/address/${chain.launchpadFactoryAddress}`);
    console.log(`Template: ${chain.blockExplorer}/address/${chain.oddsTemplateAddress}`);

  } catch (error) {
    console.error('❌ Error verifying template:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
