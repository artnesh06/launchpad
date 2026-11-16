/**
 * Update Bytecode dari Artifact
 * 
 * Script ini akan extract bytecode dari OddsLaunchpadArtifact.json
 * dan update file OddsLaunchpadBytecode.ts
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Updating Bytecode...');
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

// Create new bytecode file content
const bytecodeFileContent = `export const ODDS_LAUNCHPAD_BYTECODE = '${bytecode}';\n`;

// Write to file
const bytecodePath = path.join(__dirname, 'abi/OddsLaunchpadBytecode.ts');
fs.writeFileSync(bytecodePath, bytecodeFileContent, 'utf8');

console.log('✅ Bytecode file updated!');
console.log('   File:', bytecodePath);
console.log('');

// Verify
const verifyContent = fs.readFileSync(bytecodePath, 'utf8');
const match = verifyContent.match(/export const ODDS_LAUNCHPAD_BYTECODE = '(0x[a-fA-F0-9]+)'/);

if (match && match[1] === bytecode) {
  console.log('✅ Verification passed!');
  console.log('   Bytecode matches artifact');
} else {
  console.error('❌ Verification failed!');
  console.error('   Bytecode does not match');
  process.exit(1);
}

console.log('');
console.log('🎉 Done! Bytecode updated successfully!');
console.log('');
console.log('Next steps:');
console.log('1. Run: node deploy-and-test.js');
console.log('2. Verify Open Edition tokenURI is correct');
console.log('3. If correct, approve template: node scripts/approve-current-bytecode.js');
