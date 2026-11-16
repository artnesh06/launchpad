/**
 * Verify that all discovered icons have mappings
 */

import { iconMappings } from './icon-mapping';
import discoveryReport from '../icon-discovery-report.json';

const mappedIcons = new Set(iconMappings.map(m => m.lucideName));
const discoveredIcons = discoveryReport.uniqueIcons.filter(icon => icon !== 'LucideIcon');

console.log('=== Icon Mapping Verification ===\n');
console.log(`Total discovered icons: ${discoveredIcons.length}`);
console.log(`Total mapped icons: ${mappedIcons.size}`);

const missingMappings = discoveredIcons.filter(icon => !mappedIcons.has(icon));

if (missingMappings.length > 0) {
  console.log(`\n⚠️  Missing mappings for ${missingMappings.length} icons:`);
  missingMappings.forEach(icon => {
    const usage = discoveryReport.iconCounts.find(ic => ic.iconName === icon);
    console.log(`  - ${icon} (used ${usage?.totalUsages || 0} times)`);
  });
} else {
  console.log('\n✅ All discovered icons have mappings!');
}

const unusedMappings = Array.from(mappedIcons).filter(icon => !discoveredIcons.includes(icon));
if (unusedMappings.length > 0) {
  console.log(`\nℹ️  ${unusedMappings.length} mapped icons not currently used in codebase:`);
  console.log(`  ${unusedMappings.join(', ')}`);
}

console.log('\n=== Summary ===');
console.log(`✓ Mapped: ${discoveredIcons.length - missingMappings.length}/${discoveredIcons.length}`);
console.log(`✗ Missing: ${missingMappings.length}`);
console.log(`ℹ Unused mappings: ${unusedMappings.length}`);
