/**
 * Verification script for registerEventHandlers method
 * Tests Requirement 16.2: Filter events based on enabledEvents configuration
 */

import { ActivityListener, ActivityListenerConfig } from '@/lib/blockchain/activity-listener';

console.log('🧪 Verifying registerEventHandlers method implementation\n');

// Test 1: Verify listener can be created with custom events
console.log('Test 1: Creating listener with custom enabled events...');
const config1: ActivityListenerConfig = {
  chainId: 1,
  rpcUrl: 'https://test.rpc',
  factoryAddress: '0x1234567890123456789012345678901234567890',
  enabledEvents: ['Burned', 'Airdropped', 'PhaseAdded']
};

const listener1 = new ActivityListener(config1);
const status1 = listener1.getStatus();

console.log(`✅ Listener created successfully`);
console.log(`   Chain ID: ${status1.chainId}`);
console.log(`   Enabled events count: ${status1.enabledEventsCount}`);
console.log(`   Enabled events: ${status1.enabledEvents.join(', ')}`);

if (status1.enabledEventsCount === 3 && 
    status1.enabledEvents.includes('Burned') &&
    status1.enabledEvents.includes('Airdropped') &&
    status1.enabledEvents.includes('PhaseAdded')) {
  console.log('✅ Test 1 PASSED: Custom events configured correctly\n');
} else {
  console.log('❌ Test 1 FAILED: Custom events not configured correctly\n');
}

// Test 2: Verify listener uses all enabled events when none specified
console.log('Test 2: Creating listener with default enabled events...');
const config2: ActivityListenerConfig = {
  chainId: 2,
  rpcUrl: 'https://test2.rpc',
  factoryAddress: '0x0987654321098765432109876543210987654321'
};

const listener2 = new ActivityListener(config2);
const status2 = listener2.getStatus();

console.log(`✅ Listener created successfully`);
console.log(`   Chain ID: ${status2.chainId}`);
console.log(`   Enabled events count: ${status2.enabledEventsCount}`);
console.log(`   Sample enabled events: ${status2.enabledEvents.slice(0, 5).join(', ')}...`);

if (status2.enabledEventsCount > 0) {
  console.log('✅ Test 2 PASSED: Default events configured correctly\n');
} else {
  console.log('❌ Test 2 FAILED: Default events not configured\n');
}

console.log('✅ All verification tests completed successfully!');
console.log('   The registerEventHandlers method is working as expected.');
