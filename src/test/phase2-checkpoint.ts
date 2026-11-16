/**
 * Phase 2 Checkpoint - Verify Administrative Events Implementation
 * 
 * This checkpoint verifies that all Phase 2 administrative event handlers
 * are properly implemented and integrated.
 * 
 * Phase 2 Events:
 * - TreasuryUpdated
 * - Withdrawn
 * - OwnershipTransferred
 * - PlatformFeeToggled
 * - PlatformFlatFeeUpdated
 * - RoyaltyUpdated
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ACTIVITY_LISTENER_PATH = join(process.cwd(), 'src/lib/blockchain/activity-listener.ts');

interface TestResult {
  task: string;
  check: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];
let fileContent: string;

try {
  fileContent = readFileSync(ACTIVITY_LISTENER_PATH, 'utf-8');
} catch (error) {
  console.error('❌ Failed to read activity-listener.ts');
  process.exit(1);
}

// Helper function to add test result
function addResult(task: string, check: string, passed: boolean, details?: string) {
  results.push({ task, check, passed, details });
}

console.log('🔍 Phase 2 Checkpoint - Verifying All Implementations\n');
console.log('='.repeat(80));

// ============================================================================
// Task 10: TreasuryUpdated Event Handler
// ============================================================================
console.log('\n📋 Task 10: TreasuryUpdated Event Handler');
console.log('-'.repeat(80));

// Check interface
const hasTreasuryInterface = /interface\s+TreasuryUpdatedEvent\s*\{/.test(fileContent);
addResult('Task 10', 'TreasuryUpdatedEvent interface exists', hasTreasuryInterface);
console.log(hasTreasuryInterface ? '✅' : '❌', 'TreasuryUpdatedEvent interface exists');

// Check interface fields
if (hasTreasuryInterface) {
  const interfaceMatch = fileContent.match(/interface\s+TreasuryUpdatedEvent\s*\{[\s\S]+?\}/);
  if (interfaceMatch) {
    const hasAllFields = 
      /oldTreasury:\s*string/.test(interfaceMatch[0]) &&
      /newTreasury:\s*string/.test(interfaceMatch[0]) &&
      /txHash:\s*string/.test(interfaceMatch[0]) &&
      /blockNumber:\s*number/.test(interfaceMatch[0]) &&
      /launchpadAddress:\s*string/.test(interfaceMatch[0]);
    addResult('Task 10', 'Interface has all required fields', hasAllFields);
    console.log(hasAllFields ? '✅' : '❌', 'Interface has all required fields');
  }
}

// Check handler method
const hasTreasuryHandler = /private\s+async\s+handleTreasuryUpdatedEvent\s*\(/.test(fileContent);
addResult('Task 10', 'handleTreasuryUpdatedEvent method exists', hasTreasuryHandler);
console.log(hasTreasuryHandler ? '✅' : '❌', 'handleTreasuryUpdatedEvent method exists');

// Check listener method
const hasTreasuryListener = /private\s+async\s+listenToTreasuryUpdatedEvents\s*\(/.test(fileContent);
addResult('Task 10', 'listenToTreasuryUpdatedEvents method exists', hasTreasuryListener);
console.log(hasTreasuryListener ? '✅' : '❌', 'listenToTreasuryUpdatedEvents method exists');

// Check event in config
const treasuryInConfig = /\{\s*eventName:\s*'TreasuryUpdated'/.test(fileContent);
addResult('Task 10', 'TreasuryUpdated in DEFAULT_EVENT_CONFIG', treasuryInConfig);
console.log(treasuryInConfig ? '✅' : '❌', 'TreasuryUpdated in DEFAULT_EVENT_CONFIG');

// ============================================================================
// Task 11: Withdrawn Event Handler
// ============================================================================
console.log('\n📋 Task 11: Withdrawn Event Handler');
console.log('-'.repeat(80));

// Check interface
const hasWithdrawnInterface = /interface\s+WithdrawnEvent\s*\{/.test(fileContent);
addResult('Task 11', 'WithdrawnEvent interface exists', hasWithdrawnInterface);
console.log(hasWithdrawnInterface ? '✅' : '❌', 'WithdrawnEvent interface exists');

// Check interface fields
if (hasWithdrawnInterface) {
  const interfaceMatch = fileContent.match(/interface\s+WithdrawnEvent\s*\{[\s\S]+?\}/);
  if (interfaceMatch) {
    const hasAllFields = 
      /recipient:\s*string/.test(interfaceMatch[0]) &&
      /amount:\s*bigint/.test(interfaceMatch[0]) &&
      /txHash:\s*string/.test(interfaceMatch[0]) &&
      /blockNumber:\s*number/.test(interfaceMatch[0]) &&
      /launchpadAddress:\s*string/.test(interfaceMatch[0]);
    addResult('Task 11', 'Interface has all required fields', hasAllFields);
    console.log(hasAllFields ? '✅' : '❌', 'Interface has all required fields');
  }
}

// Check handler method
const hasWithdrawnHandler = /private\s+async\s+handleWithdrawnEvent\s*\(/.test(fileContent);
addResult('Task 11', 'handleWithdrawnEvent method exists', hasWithdrawnHandler);
console.log(hasWithdrawnHandler ? '✅' : '❌', 'handleWithdrawnEvent method exists');

// Check listener method
const hasWithdrawnListener = /private\s+async\s+listenToWithdrawnEvents\s*\(/.test(fileContent);
addResult('Task 11', 'listenToWithdrawnEvents method exists', hasWithdrawnListener);
console.log(hasWithdrawnListener ? '✅' : '❌', 'listenToWithdrawnEvents method exists');

// Check event in config
const withdrawnInConfig = /\{\s*eventName:\s*'Withdrawn'/.test(fileContent);
addResult('Task 11', 'Withdrawn in DEFAULT_EVENT_CONFIG', withdrawnInConfig);
console.log(withdrawnInConfig ? '✅' : '❌', 'Withdrawn in DEFAULT_EVENT_CONFIG');

// ============================================================================
// Task 12: OwnershipTransferred Event Handler
// ============================================================================
console.log('\n📋 Task 12: OwnershipTransferred Event Handler');
console.log('-'.repeat(80));

// Check interface
const hasOwnershipInterface = /interface\s+OwnershipTransferredEvent\s*\{/.test(fileContent);
addResult('Task 12', 'OwnershipTransferredEvent interface exists', hasOwnershipInterface);
console.log(hasOwnershipInterface ? '✅' : '❌', 'OwnershipTransferredEvent interface exists');

// Check handler method
const hasOwnershipHandler = /private\s+async\s+handleOwnershipTransferredEvent\s*\(/.test(fileContent);
addResult('Task 12', 'handleOwnershipTransferredEvent method exists', hasOwnershipHandler);
console.log(hasOwnershipHandler ? '✅' : '❌', 'handleOwnershipTransferredEvent method exists');

// Check listener method
const hasOwnershipListener = /private\s+async\s+listenToOwnershipTransferredEvents\s*\(/.test(fileContent);
addResult('Task 12', 'listenToOwnershipTransferredEvents method exists', hasOwnershipListener);
console.log(hasOwnershipListener ? '✅' : '❌', 'listenToOwnershipTransferredEvents method exists');

// Check event in config
const ownershipInConfig = /\{\s*eventName:\s*'OwnershipTransferred'/.test(fileContent);
addResult('Task 12', 'OwnershipTransferred in DEFAULT_EVENT_CONFIG', ownershipInConfig);
console.log(ownershipInConfig ? '✅' : '❌', 'OwnershipTransferred in DEFAULT_EVENT_CONFIG');

// Check database update
const ownershipUpdatesDb = /creator:\s*event\.newOwner/.test(fileContent);
addResult('Task 12', 'Handler updates owner field in database', ownershipUpdatesDb);
console.log(ownershipUpdatesDb ? '✅' : '❌', 'Handler updates owner field in database');

// ============================================================================
// Task 13: Platform Fee Event Handlers
// ============================================================================
console.log('\n📋 Task 13: Platform Fee Event Handlers');
console.log('-'.repeat(80));

// Check PlatformFeeToggled interface
const hasFeeToggledInterface = /interface\s+PlatformFeeToggledEvent\s*\{/.test(fileContent);
addResult('Task 13', 'PlatformFeeToggledEvent interface exists', hasFeeToggledInterface);
console.log(hasFeeToggledInterface ? '✅' : '❌', 'PlatformFeeToggledEvent interface exists');

// Check PlatformFlatFeeUpdated interface
const hasFeeUpdatedInterface = /interface\s+PlatformFlatFeeUpdatedEvent\s*\{/.test(fileContent);
addResult('Task 13', 'PlatformFlatFeeUpdatedEvent interface exists', hasFeeUpdatedInterface);
console.log(hasFeeUpdatedInterface ? '✅' : '❌', 'PlatformFlatFeeUpdatedEvent interface exists');

// Check PlatformFeeToggled handler
const hasFeeToggledHandler = /private\s+async\s+handlePlatformFeeToggledEvent\s*\(/.test(fileContent);
addResult('Task 13', 'handlePlatformFeeToggledEvent method exists', hasFeeToggledHandler);
console.log(hasFeeToggledHandler ? '✅' : '❌', 'handlePlatformFeeToggledEvent method exists');

// Check PlatformFlatFeeUpdated handler
const hasFeeUpdatedHandler = /private\s+async\s+handlePlatformFlatFeeUpdatedEvent\s*\(/.test(fileContent);
addResult('Task 13', 'handlePlatformFlatFeeUpdatedEvent method exists', hasFeeUpdatedHandler);
console.log(hasFeeUpdatedHandler ? '✅' : '❌', 'handlePlatformFlatFeeUpdatedEvent method exists');

// Check PlatformFeeToggled listener
const hasFeeToggledListener = /private\s+async\s+listenToPlatformFeeToggledEvents\s*\(/.test(fileContent);
addResult('Task 13', 'listenToPlatformFeeToggledEvents method exists', hasFeeToggledListener);
console.log(hasFeeToggledListener ? '✅' : '❌', 'listenToPlatformFeeToggledEvents method exists');

// Check PlatformFlatFeeUpdated listener
const hasFeeUpdatedListener = /private\s+async\s+listenToPlatformFlatFeeUpdatedEvents\s*\(/.test(fileContent);
addResult('Task 13', 'listenToPlatformFlatFeeUpdatedEvents method exists', hasFeeUpdatedListener);
console.log(hasFeeUpdatedListener ? '✅' : '❌', 'listenToPlatformFlatFeeUpdatedEvents method exists');

// Check events in config
const feeToggledInConfig = /\{\s*eventName:\s*'PlatformFeeToggled'/.test(fileContent);
addResult('Task 13', 'PlatformFeeToggled in DEFAULT_EVENT_CONFIG', feeToggledInConfig);
console.log(feeToggledInConfig ? '✅' : '❌', 'PlatformFeeToggled in DEFAULT_EVENT_CONFIG');

const feeUpdatedInConfig = /\{\s*eventName:\s*'PlatformFlatFeeUpdated'/.test(fileContent);
addResult('Task 13', 'PlatformFlatFeeUpdated in DEFAULT_EVENT_CONFIG', feeUpdatedInConfig);
console.log(feeUpdatedInConfig ? '✅' : '❌', 'PlatformFlatFeeUpdated in DEFAULT_EVENT_CONFIG');

// ============================================================================
// Task 14: RoyaltyUpdated Event Handler
// ============================================================================
console.log('\n📋 Task 14: RoyaltyUpdated Event Handler');
console.log('-'.repeat(80));

// Check interface
const hasRoyaltyInterface = /interface\s+RoyaltyUpdatedEvent\s*\{/.test(fileContent);
addResult('Task 14', 'RoyaltyUpdatedEvent interface exists', hasRoyaltyInterface);
console.log(hasRoyaltyInterface ? '✅' : '❌', 'RoyaltyUpdatedEvent interface exists');

// Check handler method
const hasRoyaltyHandler = /private\s+async\s+handleRoyaltyUpdatedEvent\s*\(/.test(fileContent);
addResult('Task 14', 'handleRoyaltyUpdatedEvent method exists', hasRoyaltyHandler);
console.log(hasRoyaltyHandler ? '✅' : '❌', 'handleRoyaltyUpdatedEvent method exists');

// Check listener method
const hasRoyaltyListener = /private\s+async\s+listenToRoyaltyUpdatedEvents\s*\(/.test(fileContent);
addResult('Task 14', 'listenToRoyaltyUpdatedEvents method exists', hasRoyaltyListener);
console.log(hasRoyaltyListener ? '✅' : '❌', 'listenToRoyaltyUpdatedEvents method exists');

// Check event in config
const royaltyInConfig = /\{\s*eventName:\s*'RoyaltyUpdated'/.test(fileContent);
addResult('Task 14', 'RoyaltyUpdated in DEFAULT_EVENT_CONFIG', royaltyInConfig);
console.log(royaltyInConfig ? '✅' : '❌', 'RoyaltyUpdated in DEFAULT_EVENT_CONFIG');

// ============================================================================
// Summary
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('📊 Phase 2 Checkpoint Summary');
console.log('='.repeat(80));

const totalTests = results.length;
const passedTests = results.filter(r => r.passed).length;
const failedTests = totalTests - passedTests;
const successRate = ((passedTests / totalTests) * 100).toFixed(1);

console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${successRate}%`);
console.log('='.repeat(80));

if (failedTests === 0) {
  console.log('\n🎉 Phase 2 Checkpoint: ALL TESTS PASSED!');
  console.log('\n✅ Phase 2 is complete and ready to proceed to Phase 3');
  console.log('\nImplemented:');
  console.log('  ✓ TreasuryUpdated event handler');
  console.log('  ✓ Withdrawn event handler');
  console.log('  ✓ OwnershipTransferred event handler');
  console.log('  ✓ PlatformFeeToggled event handler');
  console.log('  ✓ PlatformFlatFeeUpdated event handler');
  console.log('  ✓ RoyaltyUpdated event handler');
  console.log('\nNote: Optional property-based tests and unit tests are marked');
  console.log('      with "*" in the task list and can be implemented later.');
  process.exit(0);
} else {
  console.error('\n⚠️  Phase 2 Checkpoint: SOME TESTS FAILED');
  console.error('\nPlease review the failures above before proceeding to Phase 3.');
  
  // List failed tests
  const failedChecks = results.filter(r => !r.passed);
  console.error('\nFailed checks:');
  failedChecks.forEach(check => {
    console.error(`  ❌ ${check.task}: ${check.check}`);
  });
  
  process.exit(1);
}
