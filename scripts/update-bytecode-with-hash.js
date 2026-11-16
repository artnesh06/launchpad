/**
 * Update Bytecode dengan Hash Pre-calculated
 * 
 * Script ini akan extract bytecode dari OddsLaunchpadArtifact.json,
 * calculate hash-nya, dan update file OddsLaunchpadBytecode.ts
 * dengan bytecode DAN hash yang sudah di-calculate
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

console.log('🔄 Updating Bytecode with Pre-calculated Hash...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Read artifact
const artifactPath = path.join(__dirname, 'abi/OddsLaunchpadArtifact.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

if (!artifact.bytecode) {
  console.error('❌ No bytecode found in artifact!');
  process.exit(1);
}

const bytecode = artifact.bytecode;

console.log('✅ Bytecode extracted from artifact');
console.log('   Length:', bytecode.length, 'characters');
console.log('   First 66 chars:', bytecode.substring(0, 66));
console.log('');

// Calculate hash
const hash = ethers.keccak256(bytecode);
console.log('✅ Hash calculated');
console.log('   Hash:', hash);
console.log('');

// Create new bytecode file content with hash
const bytecodeFileContent = `// Auto-generated from OddsLaunchpadArtifact.json
// Run 'node update-bytecode-with-hash.js' to update

export const ODDS_LAUNCHPAD_BYTECODE = '${bytecode}';

// Pre-calculated hash for faster deployment validation
// This avoids calculating keccak256 on every deployment
export const ODDS_LAUNCHPAD_BYTECODE_HASH = '${hash}';
`;

// Write to file
const bytecodePath = path.join(__dirname, 'abi/OddsLaunchpadBytecode.ts');
fs.writeFileSync(bytecodePath, bytecodeFileContent, 'utf8');

console.log('✅ Bytecode file updated!');
console.log('   File:', bytecodePath);
console.log('');

// Verify
const verifyContent = fs.readFileSync(bytecodePath, 'utf8');
const bytecodeMatch = verifyContent.match(/export const ODDS_LAUNCHPAD_BYTECODE = '(0x[a-fA-F0-9]+)'/);
const hashMatch = verifyContent.match(/export const ODDS_LAUNCHPAD_BYTECODE_HASH = '(0x[a-fA-F0-9]+)'/);

if (bytecodeMatch && bytecodeMatch[1] === bytecode && hashMatch && hashMatch[1] === hash) {
  console.log('✅ Verification passed!');
  console.log('   Bytecode matches artifact');
  console.log('   Hash matches calculated value');
} else {
  console.error('❌ Verification failed!');
  process.exit(1);
}

console.log('');
console.log('🎉 Done! Bytecode and hash updated successfully!');
console.log('');
console.log('Next steps:');
console.log('1. Commit changes: git add abi/OddsLaunchpadBytecode.ts');
console.log('2. Approve template: node scripts/approve-current-bytecode.js');
console.log('3. Push to deploy: git push origin dev');
