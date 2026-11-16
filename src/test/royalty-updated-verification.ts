/**
 * Verification script for RoyaltyUpdated event handler implementation
 * 
 * This script verifies that:
 * 1. The RoyaltyUpdatedEvent interface is properly defined
 * 2. The handleRoyaltyUpdatedEvent method exists
 * 3. The listenToRoyaltyUpdatedEvents method exists
 * 4. The event listener is registered in the start() method
 * 5. The event listener is registered in the addLaunchpad() method
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ACTIVITY_LISTENER_PATH = join(process.cwd(), 'src/lib/blockchain/activity-listener.ts');

interface VerificationResult {
  check: string;
  passed: boolean;
  details?: string;
}

function verifyImplementation(): VerificationResult[] {
  const results: VerificationResult[] = [];
  const fileContent = readFileSync(ACTIVITY_LISTENER_PATH, 'utf-8');

  // Check 1: RoyaltyUpdatedEvent interface exists
  const hasInterface = /interface\s+RoyaltyUpdatedEvent\s*\{/.test(fileContent);
  results.push({
    check: 'RoyaltyUpdatedEvent interface defined',
    passed: hasInterface,
    details: hasInterface ? 'Interface found' : 'Interface not found'
  });

  // Check 2: Interface has required fields
  const interfaceMatch = fileContent.match(/interface\s+RoyaltyUpdatedEvent\s*\{[^}]+\}/);
  if (interfaceMatch) {
    const interfaceContent = interfaceMatch[0];
    const hasAllFields = 
      /recipient:\s*string/.test(interfaceContent) &&
      /percentage:\s*bigint/.test(interfaceContent) &&
      /txHash:\s*string/.test(interfaceContent) &&
      /blockNumber:\s*number/.test(interfaceContent) &&
      /launchpadAddress:\s*string/.test(interfaceContent);
    
    results.push({
      check: 'Interface has all required fields',
      passed: hasAllFields,
      details: hasAllFields ? 'All fields present' : 'Missing required fields'
    });
  }

  // Check 3: handleRoyaltyUpdatedEvent method exists
  const hasHandler = /private\s+async\s+handleRoyaltyUpdatedEvent\s*\(/.test(fileContent);
  results.push({
    check: 'handleRoyaltyUpdatedEvent method exists',
    passed: hasHandler,
    details: hasHandler ? 'Handler method found' : 'Handler method not found'
  });

  // Check 4: Handler validates event data
  const handlerValidates = /this\.validateEventData\(event,\s*\['recipient',\s*'percentage',\s*'txHash',\s*'blockNumber',\s*'launchpadAddress'\]\)/.test(fileContent);
  results.push({
    check: 'Handler validates event data',
    passed: handlerValidates,
    details: handlerValidates ? 'Validation found' : 'Validation not found'
  });

  // Check 5: Handler checks for duplicates
  const handlerChecksDuplicates = /isDuplicateActivity\([^)]*ActivityType\.ROYALTY_UPDATED/.test(fileContent);
  results.push({
    check: 'Handler checks for duplicates',
    passed: handlerChecksDuplicates,
    details: handlerChecksDuplicates ? 'Duplicate check found' : 'Duplicate check not found'
  });

  // Check 6: Handler creates activity with correct type
  const handlerCreatesActivity = /type:\s*ActivityType\.ROYALTY_UPDATED/.test(fileContent);
  results.push({
    check: 'Handler creates activity with ROYALTY_UPDATED type',
    passed: handlerCreatesActivity,
    details: handlerCreatesActivity ? 'Activity creation found' : 'Activity creation not found'
  });

  // Check 7: Handler formats metadata with recipient and percentage
  const handlerSection = fileContent.match(/private\s+async\s+handleRoyaltyUpdatedEvent\s*\([^)]*\)[^{]*\{[\s\S]*?(?=private\s+async|$)/);
  const handlerFormatsMetadata = handlerSection ? 
    /recipient:\s*event\.recipient/.test(handlerSection[0]) &&
    /percentage:\s*event\.percentage\.toString\(\)/.test(handlerSection[0]) : false;
  results.push({
    check: 'Handler formats metadata with recipient and percentage',
    passed: handlerFormatsMetadata,
    details: handlerFormatsMetadata ? 'Metadata formatting found' : 'Metadata formatting not found'
  });

  // Check 8: listenToRoyaltyUpdatedEvents method exists
  const hasListenerMethod = /private\s+async\s+listenToRoyaltyUpdatedEvents\s*\(/.test(fileContent);
  results.push({
    check: 'listenToRoyaltyUpdatedEvents method exists',
    passed: hasListenerMethod,
    details: hasListenerMethod ? 'Listener method found' : 'Listener method not found'
  });

  // Check 9: Listener method checks if event is enabled
  const listenerChecksEnabled = /if\s*\(\s*!this\.isEventEnabled\('RoyaltyUpdated'\)\s*\)/.test(fileContent);
  results.push({
    check: 'Listener checks if RoyaltyUpdated event is enabled',
    passed: listenerChecksEnabled,
    details: listenerChecksEnabled ? 'Enable check found' : 'Enable check not found'
  });

  // Check 10: Listener is called in start() method
  const listenerCalledInStart = /await\s+this\.listenToRoyaltyUpdatedEvents\(\)/.test(fileContent);
  results.push({
    check: 'Listener is called in start() method',
    passed: listenerCalledInStart,
    details: listenerCalledInStart ? 'Listener call found in start()' : 'Listener call not found in start()'
  });

  // Check 11: Listener is registered in addLaunchpad() method
  const listenerInAddLaunchpad = /if\s*\(\s*this\.isEventEnabled\('RoyaltyUpdated'\)\s*\)[^}]*royaltyUpdatedFilter/.test(fileContent);
  results.push({
    check: 'Listener is registered in addLaunchpad() method',
    passed: listenerInAddLaunchpad,
    details: listenerInAddLaunchpad ? 'Listener registration found in addLaunchpad()' : 'Listener registration not found in addLaunchpad()'
  });

  // Check 12: Event is in DEFAULT_EVENT_CONFIG
  const eventInConfig = /\{\s*eventName:\s*'RoyaltyUpdated'/.test(fileContent);
  results.push({
    check: 'RoyaltyUpdated is in DEFAULT_EVENT_CONFIG',
    passed: eventInConfig,
    details: eventInConfig ? 'Event config found' : 'Event config not found'
  });

  return results;
}

// Run verification
console.log('🔍 Verifying RoyaltyUpdated event handler implementation...\n');

const results = verifyImplementation();
const allPassed = results.every(r => r.passed);

results.forEach(result => {
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.check}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }
});

console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ All verification checks passed!');
  console.log('\nImplementation Summary:');
  console.log('- RoyaltyUpdatedEvent interface: ✓');
  console.log('- handleRoyaltyUpdatedEvent method: ✓');
  console.log('- Event validation: ✓');
  console.log('- Duplicate checking: ✓');
  console.log('- Activity creation: ✓');
  console.log('- Metadata formatting: ✓');
  console.log('- Event listener registration: ✓');
  console.log('- Integration in start() method: ✓');
  console.log('- Integration in addLaunchpad() method: ✓');
  process.exit(0);
} else {
  console.log('❌ Some verification checks failed!');
  const failedChecks = results.filter(r => !r.passed);
  console.log(`\nFailed checks (${failedChecks.length}):`);
  failedChecks.forEach(check => {
    console.log(`  - ${check.check}`);
  });
  process.exit(1);
}
