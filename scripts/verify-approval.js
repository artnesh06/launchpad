/**
 * Verify template approval on MegaETH Timothy
 */

const { ethers } = require('ethers');
require('dotenv').config();

const MasterContractFactoryABI = require('./abi/OddsLaunchpadFactory.json');

const CONFIG = {
  rpcUrl: 'https://timothy.megaeth.com/rpc',
  factoryAddress: '0xC4488DB515E6FBAbB5de3a593FF65075afD17b53',
  templateAddress: '0x8214c3755126f11Ad093BD491C3d3974A7244415',
  expectedHash: '0x7a84dbc2c13bf7540148fffe5eae7b15b25720f11c2a19004bb2def4a49e61d7'
};

async function verify() {
  console.log('🔍 Verifying Template Approval');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Factory:', CONFIG.factoryAddress);
  console.log('Template:', CONFIG.templateAddress);
  console.log('');

  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const factory = new ethers.Contract(
    CONFIG.factoryAddress,
    MasterContractFactoryABI,
    provider
  );

  try {
    const isApproved = await factory.getTemplateApproved(CONFIG.templateAddress);
    console.log('✅ Template approved:', isApproved);

    if (isApproved) {
      const hash = await factory.getTemplateBytecodeHash(CONFIG.templateAddress);
      console.log('');
      console.log('Approved hash:', hash);
      console.log('Expected hash:', CONFIG.expectedHash);
      console.log('');
      
      if (hash.toLowerCase() === CONFIG.expectedHash.toLowerCase()) {
        console.log('✅ Hash matches! Template is ready to use.');
      } else {
        console.log('⚠️  Hash mismatch!');
      }
    } else {
      console.log('❌ Template not approved');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
