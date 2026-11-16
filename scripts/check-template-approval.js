/**
 * Script untuk cek status approval template OddsLaunchpad
 * 
 * Usage: 
 *   node scripts/check-template-approval.js        # MegaETH (default - 6343)
 *   node scripts/check-template-approval.js 6343   # MegaETH (new factory)
 *   node scripts/check-template-approval.js 6343   # MegaETH (new factory)
 *   node scripts/check-template-approval.js 11155111  # Sepolia
 *   node scripts/check-template-approval.js 10143  # Monad Testnet
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config();

const MasterContractFactoryABI = require('../abi/OddsLaunchpadFactory.json');

// Read bytecode from file
const bytecodeFileContent = fs.readFileSync(path.join(__dirname, '../abi/OddsLaunchpadBytecode.ts'), 'utf8');
const bytecodeMatch = bytecodeFileContent.match(/export const ODDS_LAUNCHPAD_BYTECODE = '(0x[a-fA-F0-9]+)'/);
if (!bytecodeMatch) {
  throw new Error('Could not extract bytecode from OddsLaunchpadBytecode.ts');
}
const ODDS_LAUNCHPAD_BYTECODE = bytecodeMatch[1];

// Konfigurasi
const CONFIGS = {
  6343: {
    name: 'MegaETH',
    rpcUrl: process.env.NEXT_PUBLIC_MEGAETH_RPC_URL || 'https://timothy.megaeth.com/rpc',
    factoryAddress: process.env.NEXT_PUBLIC_MEGAETH_FACTORY_ADDRESS || '0x41bBbCCcbc34dDe370593aBD3102327B299315b1',
    templateAddress: process.env.NEXT_PUBLIC_MEGAETH_ODDS_TEMPLATE_ADDRESS || ''
  },
  6343: {
    name: 'MegaETH Testnet V2',
    rpcUrl: process.env.NEXT_PUBLIC_MEGAETH_RPC_URL || 'https://timothy.megaeth.com/rpc',
    factoryAddress: process.env.NEXT_PUBLIC_MEGAETH_6343_FACTORY_ADDRESS || '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
    templateAddress: process.env.NEXT_PUBLIC_MEGAETH_6343_ODDS_TEMPLATE_ADDRESS || '0x8214c3755126f11Ad093BD491C3d3974A7244415'
  },
  11155111: {
    name: 'Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || (process.env.INFURA_API_KEY ? `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}` : 'https://ethereum-sepolia-rpc.publicnode.com'),
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS || '0xB759B92CB8493342ABD53103E2Db5cd20E549975',
    templateAddress: process.env.NEXT_PUBLIC_SEPOLIA_ODDS_TEMPLATE_ADDRESS || '0x8214c3755126f11Ad093BD491C3d3974A7244415'
  },
  10143: {
    name: 'Monad Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || (process.env.ALCHEMY_API_KEY ? `https://monad-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : 'https://testnet-rpc.monad.xyz'),
    factoryAddress: process.env.NEXT_PUBLIC_MONAD_FACTORY_ADDRESS || '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
    templateAddress: process.env.NEXT_PUBLIC_MONAD_ODDS_TEMPLATE_ADDRESS || '0x8214c3755126f11Ad093BD491C3d3974A7244415'
  }
};

async function checkTemplateApproval(chainId) {
  const config = CONFIGS[chainId];
  
  if (!config) {
    throw new Error(`Chain ID ${chainId} tidak didukung`);
  }

  console.log('🔍 Checking Template Approval Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Network:', config.name);
  console.log('Chain ID:', chainId);
  console.log('Factory:', config.factoryAddress);
  console.log('Template:', config.templateAddress);
  console.log('');

  // Connect ke provider (read-only)
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  
  // Get factory contract
  const factory = new ethers.Contract(
    config.factoryAddress,
    MasterContractFactoryABI,
    provider
  );

  // Calculate expected bytecode hash (already loaded at top of file)
  const expectedHash = ethers.keccak256(ODDS_LAUNCHPAD_BYTECODE);

  console.log('📦 Expected Bytecode:');
  console.log('Hash:', expectedHash);
  console.log('Length:', ODDS_LAUNCHPAD_BYTECODE.length, 'bytes');
  console.log('');

  try {
    // Check approval status
    const isApproved = await factory.getTemplateApproved(config.templateAddress);
    
    console.log('📋 Approval Status:');
    console.log('Approved:', isApproved ? '✅ YES' : '❌ NO');
    
    if (isApproved) {
      // Get stored hash
      const storedHash = await factory.getTemplateBytecodeHash(config.templateAddress);
      console.log('');
      console.log('📝 Stored Bytecode:');
      console.log('Hash:', storedHash);
      console.log('');
      
      // Compare hashes
      const hashMatch = storedHash === expectedHash;
      console.log('🔍 Verification:');
      console.log('Hash Match:', hashMatch ? '✅ YES' : '❌ NO');
      
      if (!hashMatch) {
        console.log('');
        console.log('⚠️  WARNING: Bytecode hash mismatch!');
        console.log('');
        console.log('Expected:', expectedHash);
        console.log('Stored:  ', storedHash);
        console.log('');
        console.log('Kemungkinan penyebab:');
        console.log('1. Contract OddsLaunchpad sudah diupdate');
        console.log('2. Perlu re-approve template dengan hash baru');
        console.log('');
        console.log('Solusi:');
        console.log('Jalankan: node scripts/approve-odds-template.js', chainId);
        
        return {
          approved: true,
          hashMatch: false,
          needsUpdate: true,
          expectedHash,
          storedHash
        };
      } else {
        console.log('');
        console.log('✅ Template approved dan hash cocok!');
        console.log('Siap untuk deploy collection.');
        
        return {
          approved: true,
          hashMatch: true,
          needsUpdate: false,
          hash: storedHash
        };
      }
    } else {
      console.log('');
      console.log('❌ Template belum di-approve!');
      console.log('');
      console.log('Untuk approve template, jalankan:');
      console.log('node scripts/approve-odds-template.js', chainId);
      
      return {
        approved: false,
        hashMatch: false,
        needsUpdate: true,
        expectedHash
      };
    }
  } catch (error) {
    console.error('');
    console.error('❌ Error checking approval:', error.message);
    throw error;
  }
}

// Main
async function main() {
  const chainId = process.argv[2] ? parseInt(process.argv[2]) : 6343; // Default to MegaETH
  
  console.log('');
  const result = await checkTemplateApproval(chainId);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // Summary
  if (result.approved && result.hashMatch) {
    console.log('✅ STATUS: READY');
    console.log('Template siap digunakan untuk deploy collection.');
  } else if (result.approved && !result.hashMatch) {
    console.log('⚠️  STATUS: NEEDS UPDATE');
    console.log('Template perlu di-approve ulang dengan hash baru.');
  } else {
    console.log('❌ STATUS: NOT APPROVED');
    console.log('Template belum di-approve.');
  }
  
  console.log('');
  
  return result;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERROR');
    console.error('');
    console.error('Message:', error.message);
    console.error('');
    process.exit(1);
  });
