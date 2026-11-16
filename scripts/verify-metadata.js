/**
 * Script to verify NFT metadata configuration
 * 
 * Usage:
 *   node scripts/verify-metadata.js <contractAddress> <tokenId>
 * 
 * Example:
 *   node scripts/verify-metadata.js 0x1Aff08F103Bd26fB02f970103556D034264ca491 0
 */

const { ethers } = require('ethers');
const OddsLaunchpadABI = require('../abi/OddsLaunchpad.json');

// Configuration
const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY';
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

// IPFS Gateways to test (prioritize custom Pinata gateway)
const IPFS_GATEWAYS = [
  'https://eu.orbitor.dev/ipfs/',
  'https://eu.orbitor.dev/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

async function verifyMetadata(contractAddress, tokenId = '0') {
  console.log('🔍 NFT Metadata Verification Tool\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Connect to provider
    console.log('📡 Connecting to network...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const network = await provider.getNetwork();
    console.log(`✅ Connected to chain ID: ${network.chainId}\n`);

    // Get contract instance
    console.log('📋 Loading contract...');
    const contract = new ethers.Contract(contractAddress, OddsLaunchpadABI, provider);
    console.log(`✅ Contract loaded: ${contractAddress}\n`);

    // Get collection info
    console.log('📊 Collection Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const name = await contract.name();
      const symbol = await contract.symbol();
      const totalSupply = await contract.totalSupply();
      const maxSupply = await contract.maxSupply();
      
      console.log(`Name:         ${name}`);
      console.log(`Symbol:       ${symbol}`);
      console.log(`Total Supply: ${totalSupply.toString()}`);
      console.log(`Max Supply:   ${maxSupply.toString()}`);
    } catch (error) {
      console.log('⚠️  Could not fetch collection info:', error.message);
    }
    console.log('');

    // Check baseURI
    console.log('🔗 Base URI Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    let baseURI = '';
    try {
      baseURI = await contract.baseURI();
      console.log(`Base URI: ${baseURI || '(empty)'}`);
      
      if (!baseURI || baseURI.trim() === '') {
        console.log('❌ ERROR: Base URI is empty!');
      } else if (baseURI.startsWith('ipfs://')) {
        console.log('✅ Base URI uses IPFS protocol');
        
        // Check if it has trailing slash (for ERC721)
        if (baseURI.endsWith('/')) {
          console.log('✅ Base URI has trailing slash (good for ERC721)');
        } else {
          console.log('⚠️  Base URI missing trailing slash (may be Open Edition or needs fix)');
        }
      } else {
        console.log('⚠️  Base URI does not use IPFS protocol');
      }
    } catch (error) {
      console.log('❌ Could not fetch baseURI:', error.message);
    }
    console.log('');

    // Check isRevealed
    console.log('👁️  Reveal Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const isRevealed = await contract.isRevealed();
      console.log(`Is Revealed: ${isRevealed}`);
      
      if (!isRevealed) {
        console.log('⚠️  Collection is NOT revealed - will show unrevealedURI');
        
        try {
          const unrevealedURI = await contract.unrevealedURI();
          console.log(`Unrevealed URI: ${unrevealedURI || '(empty)'}`);
        } catch (error) {
          console.log('Could not fetch unrevealedURI');
        }
      } else {
        console.log('✅ Collection is revealed - will show actual metadata');
      }
    } catch (error) {
      console.log('⚠️  Could not check reveal status:', error.message);
    }
    console.log('');

    // Check tokenURI for specific token
    console.log(`🎨 Token URI for Token #${tokenId}:`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    let tokenURI = '';
    try {
      tokenURI = await contract.tokenURI(tokenId);
      console.log(`Token URI: ${tokenURI || '(empty)'}`);
      
      if (!tokenURI || tokenURI.trim() === '') {
        console.log('❌ ERROR: Token URI is empty!');
        console.log('   Possible causes:');
        console.log('   - Base URI is not set');
        console.log('   - Collection is not revealed and unrevealedURI is empty');
        console.log('   - Token does not exist');
      } else {
        console.log('✅ Token URI is set');
      }
    } catch (error) {
      console.log('❌ Could not fetch tokenURI:', error.message);
      console.log('   Token may not exist or contract may not support tokenURI()');
    }
    console.log('');

    // Test IPFS accessibility
    if (tokenURI && tokenURI.startsWith('ipfs://')) {
      console.log('🌐 Testing IPFS Accessibility:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const ipfsHash = tokenURI.replace('ipfs://', '');
      
      for (const gateway of IPFS_GATEWAYS) {
        const url = gateway + ipfsHash;
        try {
          const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
          if (response.ok) {
            console.log(`✅ ${gateway} - Accessible`);
          } else {
            console.log(`❌ ${gateway} - Status ${response.status}`);
          }
        } catch (error) {
          console.log(`❌ ${gateway} - Failed (${error.message})`);
        }
      }
      console.log('');

      // Try to fetch and parse metadata
      console.log('📄 Fetching Metadata Content:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      for (const gateway of IPFS_GATEWAYS) {
        const url = gateway + ipfsHash;
        try {
          const response = await fetch(url, { timeout: 10000 });
          if (response.ok) {
            const metadata = await response.json();
            console.log(`✅ Successfully fetched from ${gateway}`);
            console.log('\nMetadata:');
            console.log(JSON.stringify(metadata, null, 2));
            break;
          }
        } catch (error) {
          // Try next gateway
          continue;
        }
      }
      console.log('');
    }

    // Check via Alchemy API if available
    if (ALCHEMY_API_KEY && tokenURI) {
      console.log('🔮 Checking via Alchemy API:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      try {
        const alchemyUrl = `https://eth-sepolia.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata`;
        const response = await fetch(alchemyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractAddress: contractAddress,
            tokenId: tokenId.toString()
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Alchemy API Response:');
          console.log(JSON.stringify(data, null, 2));
          
          if (data.raw?.error) {
            console.log('\n❌ Alchemy Error:', data.raw.error);
          }
        } else {
          console.log('❌ Alchemy API request failed:', response.status);
        }
      } catch (error) {
        console.log('❌ Alchemy API error:', error.message);
      }
      console.log('');
    }

    // Summary and recommendations
    console.log('📝 Summary & Recommendations:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const issues = [];
    const recommendations = [];

    if (!baseURI || baseURI.trim() === '') {
      issues.push('Base URI is empty');
      recommendations.push('Set base URI using setBaseURI() function');
    }

    if (!tokenURI || tokenURI.trim() === '') {
      issues.push('Token URI is empty');
      recommendations.push('Ensure base URI is set and collection is revealed');
    }

    try {
      const isRevealed = await contract.isRevealed();
      if (!isRevealed) {
        issues.push('Collection is not revealed');
        recommendations.push('Call reveal() function to reveal the collection');
      }
    } catch (error) {
      // Ignore
    }

    if (baseURI && !baseURI.endsWith('/') && !baseURI.includes('.json')) {
      issues.push('Base URI may be missing trailing slash');
      recommendations.push('For ERC721, base URI should end with / (e.g., ipfs://hash/)');
    }

    if (issues.length === 0) {
      console.log('✅ No issues detected! Metadata configuration looks good.');
    } else {
      console.log('⚠️  Issues detected:');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      console.log('');
      console.log('💡 Recommendations:');
      recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node scripts/verify-metadata.js <contractAddress> [tokenId]');
  console.log('Example: node scripts/verify-metadata.js 0x1Aff08F103Bd26fB02f970103556D034264ca491 0');
  process.exit(1);
}

const contractAddress = args[0];
const tokenId = args[1] || '0';

verifyMetadata(contractAddress, tokenId);
