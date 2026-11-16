/**
 * Verification script for RoleGranted and RoleRevoked event handler implementation
 * 
 * This script verifies that:
 * 1. The RoleGrantedEvent and RoleRevokedEvent interfaces are properly defined
 * 2. The handleRoleGrantedEvent and handleRoleRevokedEvent methods exist
 * 3. The listenToRoleGrantedEvents and listenToRoleRevokedEvents methods exist
 * 4. The event listeners are registered in the start() method
 * 5. The events are in DEFAULT_EVENT_CONFIG
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ACTIVITY_LISTENER_PATH = join(process.cwd(), 'src/lib/blockchain/activity-listener.ts');
const EVENT_TYPES_PATH = join(process.cwd(), 'src/lib/blockchain/event-types.ts');
const SECURITY_HANDLER_PATH = join(process.cwd(), 'src/lib/blockchain/event-handlers/security-events.ts');

interface VerificationResult {
  check: string;
  passed: boolean;
  details?: string;
}

function verifyImplementation(): VerificationResult[] {
  const results: VerificationResult[] = [];
  const activityListenerContent = readFileSync(ACTIVITY_LISTENER_PATH, 'utf-8');
  const eventTypesContent = readFileSync(EVENT_TYPES_PATH, 'utf-8');
  const securityHandlerContent = readFileSync(SECURITY_HANDLER_PATH, 'utf-8');

  // ============================================================================
  // Check RoleGrantedEvent Interface
  // ============================================================================

  // Check 1: RoleGrantedEvent interface exists
  const hasRoleGrantedInterface = /export\s+interface\s+RoleGrantedEvent\s*\{/.test(eventTypesContent);
  results.push({
    check: 'RoleGrantedEvent interface defined',
    passed: hasRoleGrantedInterface,
    details: hasRoleGrantedInterface ? 'Interface found in event-types.ts' : 'Interface not found'
  });

  // Check 2: RoleGrantedEvent has required fields
  const roleGrantedInterfaceMatch = eventTypesContent.match(/export\s+interface\s+RoleGrantedEvent\s*\{[\s\S]+?\}/);
  if (roleGrantedInterfaceMatch) {
    const interfaceContent = roleGrantedInterfaceMatch[0];
    const hasAllFields = 
      /role:\s*string/.test(interfaceContent) &&
      /account:\s*string/.test(interfaceContent) &&
      /sender:\s*string/.test(interfaceContent) &&
      /txHash:\s*string/.test(interfaceContent) &&
      /blockNumber:\s*number/.test(interfaceContent) &&
      /launchpadAddress:\s*string/.test(interfaceContent);
    
    results.push({
      check: 'RoleGrantedEvent has all required fields',
      passed: hasAllFields,
      details: hasAllFields ? 'All fields present (role, account, sender, txHash, blockNumber, launchpadAddress)' : 'Missing required fields'
    });
  }

  // ============================================================================
  // Check RoleRevokedEvent Interface
  // ============================================================================

  // Check 3: RoleRevokedEvent interface exists
  const hasRoleRevokedInterface = /export\s+interface\s+RoleRevokedEvent\s*\{/.test(eventTypesContent);
  results.push({
    check: 'RoleRevokedEvent interface defined',
    passed: hasRoleRevokedInterface,
    details: hasRoleRevokedInterface ? 'Interface found in event-types.ts' : 'Interface not found'
  });

  // Check 4: RoleRevokedEvent has required fields
  const roleRevokedInterfaceMatch = eventTypesContent.match(/export\s+interface\s+RoleRevokedEvent\s*\{[\s\S]+?\}/);
  if (roleRevokedInterfaceMatch) {
    const interfaceContent = roleRevokedInterfaceMatch[0];
    const hasAllFields = 
      /role:\s*string/.test(interfaceContent) &&
      /account:\s*string/.test(interfaceContent) &&
      /sender:\s*string/.test(interfaceContent) &&
      /txHash:\s*string/.test(interfaceContent) &&
      /blockNumber:\s*number/.test(interfaceContent) &&
      /launchpadAddress:\s*string/.test(interfaceContent);
    
    results.push({
      check: 'RoleRevokedEvent has all required fields',
      passed: hasAllFields,
      details: hasAllFields ? 'All fields present (role, account, sender, txHash, blockNumber, launchpadAddress)' : 'Missing required fields'
    });
  }

  // ============================================================================
  // Check handleRoleGrantedEvent Handler
  // ============================================================================

  // Check 5: handleRoleGrantedEvent method exists
  const hasRoleGrantedHandler = /async\s+handleRoleGrantedEvent\s*\(/.test(securityHandlerContent);
  results.push({
    check: 'handleRoleGrantedEvent method exists',
    passed: hasRoleGrantedHandler,
    details: hasRoleGrantedHandler ? 'Handler method found in security-events.ts' : 'Handler method not found'
  });

  // Check 6: Handler validates event data
  const roleGrantedValidates = /this\.validateEventData\(event,\s*\['role',\s*'account',\s*'sender',\s*'txHash',\s*'blockNumber',\s*'launchpadAddress'\]\)/.test(securityHandlerContent);
  results.push({
    check: 'handleRoleGrantedEvent validates event data',
    passed: roleGrantedValidates,
    details: roleGrantedValidates ? 'Validation found' : 'Validation not found'
  });

  // Check 7: Handler checks for duplicates
  const roleGrantedChecksDuplicates = /isDuplicateActivity\([^)]*ActivityType\.ROLE_GRANTED/.test(securityHandlerContent);
  results.push({
    check: 'handleRoleGrantedEvent checks for duplicates',
    passed: roleGrantedChecksDuplicates,
    details: roleGrantedChecksDuplicates ? 'Duplicate check found' : 'Duplicate check not found'
  });

  // Check 8: Handler creates activity with correct type
  const roleGrantedCreatesActivity = /type:\s*ActivityType\.ROLE_GRANTED/.test(securityHandlerContent);
  results.push({
    check: 'handleRoleGrantedEvent creates activity with ROLE_GRANTED type',
    passed: roleGrantedCreatesActivity,
    details: roleGrantedCreatesActivity ? 'Activity creation found' : 'Activity creation not found'
  });

  // Check 9: Handler formats metadata with action: 'granted'
  const roleGrantedMetadata = /action:\s*'granted'/.test(securityHandlerContent);
  results.push({
    check: 'handleRoleGrantedEvent formats metadata with action: "granted"',
    passed: roleGrantedMetadata,
    details: roleGrantedMetadata ? 'Metadata formatting found' : 'Metadata formatting not found'
  });

  // ============================================================================
  // Check handleRoleRevokedEvent Handler
  // ============================================================================

  // Check 10: handleRoleRevokedEvent method exists
  const hasRoleRevokedHandler = /async\s+handleRoleRevokedEvent\s*\(/.test(securityHandlerContent);
  results.push({
    check: 'handleRoleRevokedEvent method exists',
    passed: hasRoleRevokedHandler,
    details: hasRoleRevokedHandler ? 'Handler method found in security-events.ts' : 'Handler method not found'
  });

  // Check 11: Handler validates event data
  const roleRevokedValidates = /this\.validateEventData\(event,\s*\['role',\s*'account',\s*'sender',\s*'txHash',\s*'blockNumber',\s*'launchpadAddress'\]\)/.test(securityHandlerContent);
  results.push({
    check: 'handleRoleRevokedEvent validates event data',
    passed: roleRevokedValidates,
    details: roleRevokedValidates ? 'Validation found' : 'Validation not found'
  });

  // Check 12: Handler checks for duplicates
  const roleRevokedChecksDuplicates = /isDuplicateActivity\([^)]*ActivityType\.ROLE_REVOKED/.test(securityHandlerContent);
  results.push({
    check: 'handleRoleRevokedEvent checks for duplicates',
    passed: roleRevokedChecksDuplicates,
    details: roleRevokedChecksDuplicates ? 'Duplicate check found' : 'Duplicate check not found'
  });

  // Check 13: Handler creates activity with correct type
  const roleRevokedCreatesActivity = /type:\s*ActivityType\.ROLE_REVOKED/.test(securityHandlerContent);
  results.push({
    check: 'handleRoleRevokedEvent creates activity with ROLE_REVOKED type',
    passed: roleRevokedCreatesActivity,
    details: roleRevokedCreatesActivity ? 'Activity creation found' : 'Activity creation not found'
  });

  // Check 14: Handler formats metadata with action: 'revoked'
  const roleRevokedMetadata = /action:\s*'revoked'/.test(securityHandlerContent);
  results.push({
    check: 'handleRoleRevokedEvent formats metadata with action: "revoked"',
    passed: roleRevokedMetadata,
    details: roleRevokedMetadata ? 'Metadata formatting found' : 'Metadata formatting not found'
  });

  // ============================================================================
  // Check Listener Registration Methods
  // ============================================================================

  // Check 15: listenToRoleGrantedEvents method exists
  const hasRoleGrantedListenerMethod = /private\s+async\s+listenToRoleGrantedEvents\s*\(/.test(activityListenerContent);
  results.push({
    check: 'listenToRoleGrantedEvents method exists',
    passed: hasRoleGrantedListenerMethod,
    details: hasRoleGrantedListenerMethod ? 'Listener method found' : 'Listener method not found'
  });

  // Check 16: RoleGranted listener checks if event is enabled
  const roleGrantedListenerChecksEnabled = /if\s*\(\s*!this\.isEventEnabled\('RoleGranted'\)\s*\)/.test(activityListenerContent);
  results.push({
    check: 'RoleGranted listener checks if event is enabled',
    passed: roleGrantedListenerChecksEnabled,
    details: roleGrantedListenerChecksEnabled ? 'Enable check found' : 'Enable check not found'
  });

  // Check 17: listenToRoleRevokedEvents method exists
  const hasRoleRevokedListenerMethod = /private\s+async\s+listenToRoleRevokedEvents\s*\(/.test(activityListenerContent);
  results.push({
    check: 'listenToRoleRevokedEvents method exists',
    passed: hasRoleRevokedListenerMethod,
    details: hasRoleRevokedListenerMethod ? 'Listener method found' : 'Listener method not found'
  });

  // Check 18: RoleRevoked listener checks if event is enabled
  const roleRevokedListenerChecksEnabled = /if\s*\(\s*!this\.isEventEnabled\('RoleRevoked'\)\s*\)/.test(activityListenerContent);
  results.push({
    check: 'RoleRevoked listener checks if event is enabled',
    passed: roleRevokedListenerChecksEnabled,
    details: roleRevokedListenerChecksEnabled ? 'Enable check found' : 'Enable check not found'
  });

  // ============================================================================
  // Check Integration in start() Method
  // ============================================================================

  // Check 19: RoleGranted listener is called in start() method
  const roleGrantedListenerCalledInStart = /await\s+this\.listenToRoleGrantedEvents\(\)/.test(activityListenerContent);
  results.push({
    check: 'RoleGranted listener is called in start() method',
    passed: roleGrantedListenerCalledInStart,
    details: roleGrantedListenerCalledInStart ? 'Listener call found in start()' : 'Listener call not found in start()'
  });

  // Check 20: RoleRevoked listener is called in start() method
  const roleRevokedListenerCalledInStart = /await\s+this\.listenToRoleRevokedEvents\(\)/.test(activityListenerContent);
  results.push({
    check: 'RoleRevoked listener is called in start() method',
    passed: roleRevokedListenerCalledInStart,
    details: roleRevokedListenerCalledInStart ? 'Listener call found in start()' : 'Listener call not found in start()'
  });

  // ============================================================================
  // Check Event Configuration
  // ============================================================================

  // Check 21: RoleGranted is in DEFAULT_EVENT_CONFIG
  const roleGrantedInConfig = /\{\s*eventName:\s*'RoleGranted'/.test(activityListenerContent);
  results.push({
    check: 'RoleGranted is in DEFAULT_EVENT_CONFIG',
    passed: roleGrantedInConfig,
    details: roleGrantedInConfig ? 'Event config found' : 'Event config not found'
  });

  // Check 22: RoleRevoked is in DEFAULT_EVENT_CONFIG
  const roleRevokedInConfig = /\{\s*eventName:\s*'RoleRevoked'/.test(activityListenerContent);
  results.push({
    check: 'RoleRevoked is in DEFAULT_EVENT_CONFIG',
    passed: roleRevokedInConfig,
    details: roleRevokedInConfig ? 'Event config found' : 'Event config not found'
  });

  return results;
}

// Run verification
console.log('🔍 Verifying RoleGranted and RoleRevoked event handler implementation...\n');

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
  console.log('- RoleGrantedEvent interface: ✓');
  console.log('- RoleRevokedEvent interface: ✓');
  console.log('- handleRoleGrantedEvent method: ✓');
  console.log('- handleRoleRevokedEvent method: ✓');
  console.log('- Event validation: ✓');
  console.log('- Duplicate checking: ✓');
  console.log('- Activity creation: ✓');
  console.log('- Metadata formatting: ✓');
  console.log('- Event listener registration: ✓');
  console.log('- Integration in start() method: ✓');
  console.log('- Event configuration: ✓');
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
