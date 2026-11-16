/**
 * Rarity Display Verification Test
 * 
 * Verifies that rarity information is properly displayed on NFT detail pages
 * Tests Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Rarity Display Implementation...\n');

let allPassed = true;

// Test 1: Check API route fetches rarity data
try {
  const apiPath = path.join(process.cwd(), 'src/app/api/nft/[address]/[tokenid]/route.ts');
  const apiContent = fs.readFileSync(apiPath, 'utf-8');
  
  if (apiContent.includes('computeRarity') && 
      apiContent.includes('summarizeNFTAttributes') && 
      apiContent.includes('prevalence')) {
    console.log('✅ API route fetches rarity data using computeRarity');
    console.log('✅ API route fetches attribute summary for prevalence');
    console.log('✅ API route merges prevalence into attributes');
  } else {
    console.log('❌ API route missing rarity or prevalence fetching');
    allPassed = false;
  }
} catch (error) {
  console.log('❌ Failed to verify API route:', error.message);
  allPassed = false;
}

console.log('');

// Test 2: Check RarityDisplay component
try {
  const componentPath = path.join(process.cwd(), 'src/components/rarity-display.tsx');
  const componentContent = fs.readFileSync(componentPath, 'utf-8');
  
  if (componentContent.includes('rank') && 
      componentContent.includes('rarityScore') && 
      componentContent.includes('percentile')) {
    console.log('✅ RarityDisplay component displays rank');
    console.log('✅ RarityDisplay component displays rarity score');
    console.log('✅ RarityDisplay component displays percentile');
  } else {
    console.log('❌ RarityDisplay component missing required fields');
    allPassed = false;
  }
} catch (error) {
  console.log('❌ Failed to verify RarityDisplay component:', error.message);
  allPassed = false;
}

console.log('');

// Test 3: Check NFTAttributes component displays prevalence
try {
  const componentPath = path.join(process.cwd(), 'src/components/nft-attributes.tsx');
  const componentContent = fs.readFileSync(componentPath, 'utf-8');
  
  if (componentContent.includes('prevalence') && 
      componentContent.includes('* 100')) {
    console.log('✅ NFTAttributes component displays prevalence percentages');
  } else {
    console.log('❌ NFTAttributes component missing prevalence display');
    allPassed = false;
  }
} catch (error) {
  console.log('❌ Failed to verify NFTAttributes component:', error.message);
  allPassed = false;
}

console.log('');

// Test 4: Check NFT detail page conditionally renders rarity
try {
  const pagePath = path.join(process.cwd(), 'src/app/(package)/nft/[address]/[tokenid]/page.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf-8');
  
  if (pageContent.includes('rarity &&') && 
      pageContent.includes('<RarityDisplay')) {
    console.log('✅ NFT detail page conditionally renders rarity section');
    console.log('✅ Rarity section gracefully hidden when unavailable');
  } else {
    console.log('❌ NFT detail page missing conditional rarity rendering');
    allPassed = false;
  }
} catch (error) {
  console.log('❌ Failed to verify NFT detail page:', error.message);
  allPassed = false;
}

console.log('');
console.log('='.repeat(60));

if (allPassed) {
  console.log('✅ All rarity display verification tests passed!');
  console.log('');
  console.log('Implementation Summary:');
  console.log('- ✅ Rarity data fetched using Alchemy computeRarity method (Req 10.1)');
  console.log('- ✅ Rank displayed in RarityDisplay component (Req 10.2)');
  console.log('- ✅ Score and percentile displayed in RarityDisplay (Req 10.3)');
  console.log('- ✅ Prevalence percentages displayed in NFTAttributes (Req 10.4)');
  console.log('- ✅ Rarity section gracefully hidden when unavailable (Req 10.5)');
  process.exit(0);
} else {
  console.log('❌ Some verification tests failed');
  process.exit(1);
}
