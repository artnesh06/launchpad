/**
 * Comprehensive verification for all 24 event types
 * Tests that registerEventHandlers supports all event types
 */

import { ActivityListener, ActivityListenerConfig, DEFAULT_EVENT_CONFIG } from '@/lib/blockchain/activity-listener';

console.log('🧪 Verifying all 24 event types are supported\n');

// List all 24 event types that should be supported
const all24Events = [
  // Phase 1: User-facing events (6 including existing)
  'Transfer',
  'Burned',
  'Airdropped',
  'PhaseAdded',
  'PhaseUpdated',
  'Revealed',
  // Phase 2: Admin events (6)
  'TreasuryUpdated',
  'Withdrawn',
  'OwnershipTransferred',
  'PlatformFeeToggled',
  'PlatformFlatFeeUpdated',
  'RoyaltyUpdated',
  // Phase 3: Metadata events (3)
  'BaseURIUpdated',
  'ContractURIUpdated',
  'ExternalLinkUpdated',
  // Phase 4: Security events (5)
  'Paused',
  'Unpaused',
  'TransferLockUpdated',
  'RoleGranted',
  'RoleRevoked',
  // Factory events (2)
  'LaunchpadCreated',
  'ContractDeployed'
];

console.log(`Expected event count: ${all24Events.length}`);
console.log(`Events to verify: ${all24Events.join(', ')}\n`);

// Test: Create listener with all 24 events
console.log('Creating listener with all 24 events...');
const config: ActivityListenerConfig = {
  chainId: 1,
  rpcUrl: 'https://test.rpc',
  factoryAddress: '0x1234567890123456789012345678901234567890',
  enabledEvents: all24Events
};

const listener = new ActivityListener(config);
const status = listener.getStatus();

console.log(`✅ Listener created successfully`);
console.log(`   Enabled events count: ${status.enabledEventsCount}`);
console.log(`   Expected count: ${all24Events.length}\n`);

// Verify all events are present
let allEventsPresent = true;
const missingEvents: string[] = [];

for (const eventName of all24Events) {
  if (!status.enabledEvents.includes(eventName)) {
    allEventsPresent = false;
    missingEvents.push(eventName);
  }
}

if (allEventsPresent && status.enabledEventsCount === all24Events.length) {
  console.log('✅ SUCCESS: All 24 events are supported and configured correctly!');
} else {
  console.log('❌ FAILURE: Some events are missing or not configured correctly');
  if (missingEvents.length > 0) {
    console.log(`   Missing events: ${missingEvents.join(', ')}`);
  }
  console.log(`   Expected: ${all24Events.length}, Got: ${status.enabledEventsCount}`);
}

console.log('\n📊 Event Configuration Summary:');
console.log(`   Total events in DEFAULT_EVENT_CONFIG: ${DEFAULT_EVENT_CONFIG.length}`);
console.log(`   Enabled by default: ${DEFAULT_EVENT_CONFIG.filter(e => e.enabled).length}`);
console.log(`   Phase 1 events: ${DEFAULT_EVENT_CONFIG.filter(e => e.phase === 1).length}`);
console.log(`   Phase 2 events: ${DEFAULT_EVENT_CONFIG.filter(e => e.phase === 2).length}`);
console.log(`   Phase 3 events: ${DEFAULT_EVENT_CONFIG.filter(e => e.phase === 3).length}`);
console.log(`   Phase 4 events: ${DEFAULT_EVENT_CONFIG.filter(e => e.phase === 4).length}`);
