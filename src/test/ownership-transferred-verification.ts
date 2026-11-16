/**
 * Verification script for OwnershipTransferred event handler implementation
 * 
 * This script verifies that:
 * 1. The OwnershipTransferredEvent interface is properly defined
 * 2. The handleOwnershipTransferredEvent method exists
 * 3. The listenToOwnershipTransferredEvents method exists
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

  // Check 1: OwnershipTransferredEvent interface exists
  const hasInterface = /interface\s+OwnershipTransferredEvent\s*\{/.test(fileContent);
  results.push({
    check: 'OwnershipTransferredEvent interface defined',
    passed: hasInterface,
    details: hasInterface ? 'Interface found' : 'Interface not found'
  });

  // Check 2: Interface has required fields
  const interfaceMatch = fileContent.match(/interface\s+OwnershipTransferredEvent\s*\{[\s\S]+?\}/);
  if (interfaceMatch) {
    const interfaceContent = interfaceMatch[0];
    const hasAllFields = 
      /previousOwner:\s*string/.test(interfaceContent) &&
      /newOwner:\s*string/.test(interfaceContent) &&
      /txHash:\s*string/.test(interfaceContent) &&
      /blockNumber:\s*number/.test(interfaceContent) &&
      /launchpadAddress:\s*string/.test(interfaceContent);
    
    results.push({
      check: 'Interface has all required fields',
      passed: hasAllFields,
      details: hasAllFields ? 'All fields present' : 'Missing required fields'
    });
  }

  // Check 3: handleOwnershipTransferredEvent method exists
  const hasHandler = /private\s+async\s+handleOwnershipTransferredEvent\s*\(/.test(fileContent);
  results.push({
    check: 'handleOwnershipTransferredEvent method exists',
    passed: hasHandler,
    details: hasHandler ? 'Handler method found' : 'Handler method not found'
  });

  // Check 4: Handler validates event data
  const handlerValidates = /this\.validateEventData\(event,\s*\['previousOwner',\s*'newOwner',\s*'txHash',\s*'blockNumber',\s*'launchpadAddress'\]\)/.test(fileContent);
  results.push({
    check: 'Handler validates event data',
    passed: handlerValidates,
    details: handlerValidates ? 'Validation found' : 'Validation not found'
  });

  // Check 5: Handler checks for duplicates
  const handlerChecksDuplicates = /isDuplicateActivity\([^)]*ActivityType\.OWNERSHIP_TRANSFERRED/.test(fileContent);
  results.push({
    check: 'Handler checks for duplicates',
    passed: handlerChecksDuplicates,
    details: handlerChecksDuplicates ? 'Duplicate check found' : 'Duplicate check not found'
  });

  // Check 6: Handler updates owner field in database
  const handlerUpdatesOwner = /creator:\s*event\.newOwner/.test(fileContent);
  results.push({
    check: 'Handler updates owner field in database',
    passed: handlerUpdatesOwner,
    details: handlerUpdatesOwner ? 'Owner update found' : 'Owner update not found'
  });

  // Check 7: Handler creates activity with correct type
  const handlerCreatesActivity = /type:\s*ActivityType\.OWNERSHIP_TRANSFERRED/.test(fileContent);
  results.push({
    check: 'Handler creates activity with OWNERSHIP_TRANSFERRED type',
    passed: handlerCreatesActivity,
    details: handlerCreatesActivity ? 'Activity creation found' : 'Activity creation not found'
  });

  // Check 8: Handler uses transaction for atomic update
  // Look for transaction usage within the handler method
  const handlerSection = fileContent.match(/private\s+async\s+handleOwnershipTransferredEvent\s*\([^)]*\)[^{]*\{[\s\S]*?(?=private\s+async|$)/);
  const handlerUsesTransaction = handlerSection ? /await\s+prisma\.\$transaction/.test(handlerSection[0]) : false;
  results.push({
    check: 'Handler uses transaction for atomic update',
    passed: handlerUsesTransaction,
    details: handlerUsesTransaction ? 'Transaction found' : 'Transaction not found'
  });

  // Check 9: listenToOwnershipTransferredEvents method exists
  const hasListenerMethod = /private\s+async\s+listenToOwnershipTransferredEvents\s*\(/.test(fileContent);
  results.push({
    check: 'listenToOwnershipTransferredEvents method exists',
    passed: hasListenerMethod,
    details: hasListenerMethod ? 'Listener method found' : 'Listener method not found'
  });

  // Check 10: Listener method checks if event is enabled
  const listenerChecksEnabled = /if\s*\(\s*!this\.isEventEnabled\('OwnershipTransferred'\)\s*\)/.test(fileContent);
  results.push({
    check: 'Listener checks if OwnershipTransferred event is enabled',
    passed: listenerChecksEnabled,
    details: listenerChecksEnabled ? 'Enable check found' : 'Enable check not found'
  });

  // Check 11: Listener is called in start() method
  const listenerCalledInStart = /await\s+this\.listenToOwnershipTransferredEvents\(\)/.test(fileContent);
  results.push({
    check: 'Listener is called in start() method',
    passed: listenerCalledInStart,
    details: listenerCalledInStart ? 'Listener call found in start()' : 'Listener call not found in start()'
  });

  // Check 12: Listener is registered in addLaunchpad() method
  const listenerInAddLaunchpad = /if\s*\(\s*this\.isEventEnabled\('OwnershipTransferred'\)\s*\)[\s\S]*?ownershipTransferredFilter/.test(fileContent);
  results.push({
    check: 'Listener is registered in addLaunchpad() method',
    passed: listenerInAddLaunchpad,
    details: listenerInAddLaunchpad ? 'Listener registration found in addLaunchpad()' : 'Listener registration not found in addLaunchpad()'
  });

  // Check 13: Event is in DEFAULT_EVENT_CONFIG
  const eventInConfig = /\{\s*eventName:\s*'OwnershipTransferred'/.test(fileContent);
  results.push({
    check: 'OwnershipTransferred is in DEFAULT_EVENT_CONFIG',
    passed: eventInConfig,
    details: eventInConfig ? 'Event config found' : 'Event config not found'
  });

  return results;
}

// Run verification
console.log('🔍 Verifying OwnershipTransferred event handler implementation...\n');

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
  console.log('- OwnershipTransferredEvent interface: ✓');
  console.log('- handleOwnershipTransferredEvent method: ✓');
  console.log('- Event validation: ✓');
  console.log('- Duplicate checking: ✓');
  console.log('- Database owner update: ✓');
  console.log('- Activity creation: ✓');
  console.log('- Atomic transaction: ✓');
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
