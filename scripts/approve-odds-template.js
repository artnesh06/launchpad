/**
 * Script untuk approve OddsLaunchpad template di MasterContractFactory
 * Jalankan script ini SEBELUM deploy collection via factory
 * 
 * Usage: node scripts/approve-odds-template.js
 */

const { ethers } = require('ethers');
const MasterContractFactoryABI = require('../abi/OddsLaunchpadFactory.json');
const bytecodeModule = require('../abi/OddsLaunchpadBytecode');

// Konfigurasi - SESUAIKAN DENGAN CHAIN ANDA
const CONFIGS = {
  // Sepolia Testnet
  11155111: {
    name: 'Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS || '0x8214c3755126f11ad093bd491c3d3974a7244415',
    templateAddress: process.env.NEXT_PUBLIC_SEPOLIA_ODDS_TEMPLATE_ADDRESS || '0xYOUR_TEMPLATE_ADDRESS'
  },
  // Monad Testnet
  41454: {
    name: 'Monad Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
    factoryAddress: process.env.NEXT_PUBLIC_MONAD_FACTORY_ADDRESS || '0xYOUR_FACTORY_ADDRESS',
    templateAddress: process.env.NEXT_PUBLIC_MONAD_ODDS_TEMPLATE_ADDRESS || '0xYOUR_TEMPLATE_ADDRESS'
  }
};

async function approveTemplate(chainId) {
  const config = CONFIGS[chainId];
  
  if (!config) {
    throw new Error(`Chain ID ${chainId} tidak didukung. Pilih: ${Object.keys(CONFIGS).join(', ')}`);
  }

  console.log('🔧 Approve OddsLaunchpad Template');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Network:', config.name);
  console.log('Chain ID:', chainId);
  console.log('Factory:', config.factoryAddress);
  console.log('Template:', config.templateAddress);
  console.log('');

  // Validasi konfigurasi
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY tidak ditemukan. Set dengan: export PRIVATE_KEY="your-key"');
  }

  if (config.rpcUrl.includes('YOUR_API_KEY')) {
    throw new Error('Silakan update RPC URL di .env atau script');
  }

  if (config.templateAddress.includes('YOUR_TEMPLATE')) {
    throw new Error('Silakan update template address di .env atau script');
  }

  // Connect ke provider
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('Deployer:', wallet.address);
  
  // Cek balance
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
  console.log('');

  // Get factory contract
  const factory = new ethers.Contract(
    config.factoryAddress,
    MasterContractFactoryABI,
    wallet
  );

  // Calculate bytecode hash dari OddsLaunchpad
  const ODDS_LAUNCHPAD_BYTECODE = bytecodeModule.ODDS_LAUNCHPAD_BYTECODE;
  const bytecodeHash = ethers.keccak256(ODDS_LAUNCHPAD_BYTECODE);
  
  console.log('📦 Bytecode Info:');
  console.log('Hash:', bytecodeHash);
  console.log('Length:', ODDS_LAUNCHPAD_BYTECODE.length, 'bytes');
  console.log('');

  // Cek apakah sudah approved
  try {
    const isApproved = await factory.getTemplateApproved(config.templateAddress);
    
    if (isApproved) {
      const existingHash = await factory.getTemplateBytecodeHash(config.templateAddress);
      console.log('✅ Template sudah approved!');
      console.log('Existing hash:', existingHash);
      console.log('');
      
      if (existingHash === bytecodeHash) {
        console.log('✅ Hash cocok - tidak perlu action');
        console.log('Template siap digunakan untuk deploy collection!');
        return { alreadyApproved: true, hash: existingHash };
      } else {
        console.log('⚠️  Hash tidak cocok - perlu update approval');
        console.log('Old hash:', existingHash);
        console.log('New hash:', bytecodeHash);
        console.log('');
      }
    } else {
      console.log('ℹ️  Template belum approved');
      console.log('');
    }
  } catch (error) {
    console.log('⚠️  Error checking approval status:', error.message);
    console.log('Melanjutkan proses approval...');
    console.log('');
  }

  // Approve template
  console.log('📝 Approving template...');
  console.log('Silakan konfirmasi transaksi di wallet Anda.');
  console.log('');

  try {
    const tx = await factory.approveTemplate(config.templateAddress, bytecodeHash);
    console.log('✅ Transaction submitted!');
    console.log('Hash:', tx.hash);
    console.log('');
    
    console.log('⏳ Menunggu konfirmasi...');
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('✅ Template berhasil di-approve!');
      console.log('Block:', receipt.blockNumber);
      console.log('Gas used:', receipt.gasUsed.toString());
      console.log('');
      
      // Verify approval
      const isNowApproved = await factory.getTemplateApproved(config.templateAddress);
      const newHash = await factory.getTemplateBytecodeHash(config.templateAddress);
      
      console.log('📋 Verification:');
      console.log('Approved:', isNowApproved ? '✅' : '❌');
      console.log('Stored hash:', newHash);
      console.log('Expected hash:', bytecodeHash);
      console.log('Match:', newHash === bytecodeHash ? '✅' : '❌');
      
      return { 
        success: true, 
        txHash: tx.hash, 
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('❌ Approval failed:', error.message);
    
    if (error.code === 'ACTION_REJECTED') {
      console.error('User rejected transaction');
    } else if (error.message.includes('NotAdmin')) {
      console.error('Only admin can approve templates');
    }
    
    throw error;
  }
}

// Main execution
async function main() {
  // Ambil chain ID dari argument atau default ke Sepolia
  const chainId = process.argv[2] ? parseInt(process.argv[2]) : 11155111;
  
  console.log('');
  console.log('🚀 Starting template approval process...');
  console.log('');
  
  const result = await approveTemplate(chainId);
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SELESAI!');
  console.log('');
  
  if (result.alreadyApproved) {
    console.log('Template sudah approved dan siap digunakan.');
  } else {
    console.log('Template berhasil di-approve!');
    console.log('Anda sekarang bisa deploy collection via factory.');
  }
  
  console.log('');
  console.log('Next steps:');
  console.log('1. Buat collection baru via Creator Studio');
  console.log('2. Factory akan otomatis deploy menggunakan template ini');
  console.log('3. Collection akan muncul di dashboard Anda');
  console.log('');
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERROR');
    console.error('');
    console.error('Message:', error.message);
    if (error.code) {
      console.error('Code:', error.code);
    }
    console.error('');
    process.exit(1);
  });
