/**
 * Verify Bytecode Consistency
 * 
 * Script ini memverifikasi bahwa:
 * 1. Bytecode di OddsLaunchpadBytecode.ts match dengan artifact
 * 2. Hash yang di-calculate match dengan yang di-export
 * 3. Tidak ada corruption atau encoding issues
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

console.log('🔍 Verifying Bytecode Consistency...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// 1. Read artifact
console.log('📦 Reading artifact...');
const artifactPath = path.join(__dirname, 'abi/OddsLaunchpadArtifact.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const artifactBytecode = artifact.bytecode;

if (!artifactBytecode) {
  console.error('❌ No bytecode in artifact!');
  process.exit(1);
}

console.log('   ✅ Artifact bytecode found');
console.log('   Length:', artifactBytecode.length);
console.log('   First 66 chars:', artifactBytecode.substring(0, 66));
console.log('');

// 2. Read bytecode file
console.log('📄 Reading OddsLaunchpadBytecode.ts...');
const { ODDS_LAUNCHPAD_BYTECODE, ODDS_LAUNCHPAD_BYTECODE_HASH } = require('./abi/OddsLaunchpadBytecode.ts');

console.log('   ✅ Bytecode file loaded');
console.log('   Length:', ODDS_LAUNCHPAD_BYTECODE.length);
console.log('   First 66 chars:', ODDS_LAUNCHPAD_BYTECODE.substring(0, 66));
console.log('   Exported hash:', ODDS_LAUNCHPAD_BYTECODE_HASH);
console.log('');

// 3. Compare bytecodes
console.log('🔄 Comparing bytecodes...');
if (artifactBytecode === ODDS_LAUNCHPAD_BYTECODE) {
  console.log('   ✅ Bytecode matches artifact');
} else {
  console.error('   ❌ Bytecode DOES NOT match artifact!');
  console.error('   This means OddsLaunchpadBytecode.ts is out of sync');
  console.error('   Run: node update-bytecode-with-hash.js');
  process.exit(1);
}
console.log('');

// 4. Calculate hash
console.log('🔐 Calculating hash...');
const calculatedHash = ethers.keccak256(ODDS_LAUNCHPAD_BYTECODE);
console.log('   Calculated:', calculatedHash);
console.log('   Exported:  ', ODDS_LAUNCHPAD_BYTECODE_HASH);

if (calculatedHash === ODDS_LAUNCHPAD_BYTECODE_HASH) {
  console.log('   ✅ Hash matches');
} else {
  console.error('   ❌ Hash DOES NOT match!');
  console.error('   This means ODDS_LAUNCHPAD_BYTECODE_HASH is wrong');
  console.error('   Run: node update-bytecode-with-hash.js');
  process.exit(1);
}
console.log('');

// 5. Check factory approval (optional)
console.log('🏭 Checking factory approval...');
const MasterContractFactoryABI = require('./abi/OddsLaunchpadFactory.json');
const provider = new ethers.JsonRpcProvider(
  process.env.MEGAETH_RPC_URL || 'https://timothy.megaeth.com/rpc'
);
const factory = new ethers.Contract(
  process.env.MEGAETH_FACTORY_ADDRESS || '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
  MasterContractFactoryABI,
  provider
);

const templateAddress = '0x8214c3755126f11Ad093BD491C3d3974A7244415';

(async () => {
  try {
    const isApproved = await factory.getTemplateApproved(templateAddress);
    console.log('   Template approved:', isApproved ? '✅ Yes' : '❌ No');
    
    if (isApproved) {
      const approvedHash = await factory.getTemplateBytecodeHash(templateAddress);
      console.log('   Approved hash:', approvedHash);
      
      if (approvedHash === calculatedHash) {
        console.log('   ✅ Factory hash matches local hash');
      } else {
        console.warn('   ⚠️  Factory hash DOES NOT match local hash');
        console.warn('   Factory has:', approvedHash);
        console.warn('   Local has:  ', calculatedHash);
        console.warn('   Run: node scripts/approve-current-bytecode.js');
      }
    }
  } catch (error) {
    console.warn('   ⚠️  Could not check factory:', error.message);
  }
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Verification complete!');
  console.log('');
  console.log('Summary:');
  console.log('  Bytecode length:', ODDS_LAUNCHPAD_BYTECODE.length);
  console.log('  Bytecode hash:  ', calculatedHash);
  console.log('  Artifact match: ✅');
  console.log('  Hash match:     ✅');
})();
