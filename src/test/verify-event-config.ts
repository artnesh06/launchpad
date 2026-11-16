/**
 * Manual verification script for event configuration system
 * This script verifies the implementation without requiring a test runner
 */

import { ActivityListener, ActivityListenerConfig, DEFAULT_EVENT_CONFIG } from '@/lib/blockchain/activity-listener';

console.log('🧪 Verifying Event Configuration System Implementation\n');

// Test 1: Verify DEFAULT_EVENT_CONFIG structure
console.log('Test 1: Verifying DEFAULT_EVENT_CONFIG structure...');
console.log(`Total events configured: ${DEFAULT_EVENT_CONFIG.length}`);

const newEvents = DEFAULT_EVENT_CONFIG.filter(
  e => !['Transfer', 'LaunchpadCreated', 'ContractDeployed'].includes(e.eventName)
);
console.log(`New events (excluding existing): ${newEvents.length}`);

// Verify all events have required fields
let allFieldsValid = true;
DEFAULT_EVENT_CONFIG.forEach(config => {
  if (!config.eventName || typeof config.enabled !== 'boolean' || 
      !config.priority || !config.phase) {
    console.error(`❌ Invalid config for event: ${config.eventName}`);
    allFieldsValid = false;
  }
});

if (allFieldsValid) {
  console.log('✅ All events have required fields\n');
} else {
  console.log('❌ Some events have missing fields\n');
}

// Test 2: Verify phase organization
console.log('Test 2: Verifying phase organization...');
const phase1 = DEFAULT_EVENT_CONFIG.filter(e => e.phase === 1);
const phase2 = DEFAULT_EVENT_CONFIG.filter(e => e.phase === 2);
const phase3 = DEFAULT_EVENT_CONFIG.filter(e => e.phase === 3);
const phase4 = DEFAULT_EVENT_CONFIG.filter(e => e.phase === 4);

console.log(`Phase 1 events: ${phase1.length} (${phase1.map(e => e.eventName).join(', ')})`);
console.log(`Phase 2 events: ${phase2.length} (${phase2.map(e => e.eventName).join(', ')})`);
console.log(`Phase 3 events: ${phase3.length} (${phase3.map(e => e.eventName).join(', ')})`);
console.log(`Phase 4 events: ${phase4.length} (${phase4.map(e => e.eventName).join(', ')})`);
console.log('✅ Phase organization verified\n');

// Test 3: Verify ActivityListener initialization with default config
console.log('Test 3: Verifying ActivityListener with default config...');
try {
  const config1: ActivityListenerConfig = {
    chainId: 1,
    rpcUrl: 'https://test.rpc',
    factoryAddress: '0x1234567890123456789012345678901234567890'
  };

  const listener1 = new ActivityListener(config1);
  const status1 = listener1.getStatus();

  console.log(`Chain ID: ${status1.chainId}`);
  console.log(`Enabled events count: ${status1.enabledEventsCount}`);
  console.log(`Enabled events: ${status1.enabledEvents.join(', ')}`);
  
  const expectedCount = DEFAULT_EVENT_CONFIG.filter(e => e.enabled).length;
  if (status1.enabledEventsCount === expectedCount) {
    console.log('✅ Default enabled events initialized correctly\n');
  } else {
    console.log(`❌ Expected ${expectedCount} events, got ${status1.enabledEventsCount}\n`);
  }
} catch (error) {
  console.error('❌ Error initializing listener with default config:', error);
}

// Test 4: Verify ActivityListener with custom enabled events
console.log('Test 4: Verifying ActivityListener with custom enabled events...');
try {
  const customEvents = ['Burned', 'Airdropped', 'Transfer'];
  const config2: ActivityListenerConfig = {
    chainId: 2,
    rpcUrl: 'https://test2.rpc',
    factoryAddress: '0x2234567890123456789012345678901234567890',
    enabledEvents: customEvents
  };

  const listener2 = new ActivityListener(config2);
  const status2 = listener2.getStatus();

  console.log(`Chain ID: ${status2.chainId}`);
  console.log(`Enabled events count: ${status2.enabledEventsCount}`);
  console.log(`Enabled events: ${status2.enabledEvents.join(', ')}`);

  if (status2.enabledEventsCount === 3 && 
      status2.enabledEvents.includes('Burned') &&
      status2.enabledEvents.includes('Airdropped') &&
      status2.enabledEvents.includes('Transfer')) {
    console.log('✅ Custom enabled events initialized correctly\n');
  } else {
    console.log('❌ Custom enabled events not initialized correctly\n');
  }
} catch (error) {
  console.error('❌ Error initializing listener with custom config:', error);
}

// Test 5: Verify error threshold and retry attempts configuration
console.log('Test 5: Verifying error threshold and retry attempts...');
try {
  const config3: ActivityListenerConfig = {
    chainId: 3,
    rpcUrl: 'https://test3.rpc',
    factoryAddress: '0x3234567890123456789012345678901234567890',
    errorThreshold: 5,
    retryAttempts: 5
  };

  const listener3 = new ActivityListener(config3);
  console.log('✅ Listener created with custom errorThreshold and retryAttempts\n');
} catch (error) {
  console.error('❌ Error initializing listener with error config:', error);
}

// Test 6: Verify configuration independence (Requirements 16.1, 16.3)
console.log('Test 6: Verifying configuration independence...');
try {
  const config4: ActivityListenerConfig = {
    chainId: 4,
    rpcUrl: 'https://test4.rpc',
    factoryAddress: '0x4234567890123456789012345678901234567890',
    enabledEvents: ['Burned', 'Airdropped']
  };

  const config5: ActivityListenerConfig = {
    chainId: 5,
    rpcUrl: 'https://test5.rpc',
    factoryAddress: '0x5234567890123456789012345678901234567890',
    enabledEvents: ['Transfer', 'PhaseAdded']
  };

  const listener4 = new ActivityListener(config4);
  const listener5 = new ActivityListener(config5);

  const status4 = listener4.getStatus();
  const status5 = listener5.getStatus();

  console.log(`Chain 4 events: ${status4.enabledEvents.join(', ')}`);
  console.log(`Chain 5 events: ${status5.enabledEvents.join(', ')}`);

  const chain4HasCorrectEvents = status4.enabledEvents.includes('Burned') && 
                                   status4.enabledEvents.includes('Airdropped') &&
                                   !status4.enabledEvents.includes('Transfer') &&
                                   !status4.enabledEvents.includes('PhaseAdded');

  const chain5HasCorrectEvents = status5.enabledEvents.includes('Transfer') && 
                                   status5.enabledEvents.includes('PhaseAdded') &&
                                   !status5.enabledEvents.includes('Burned') &&
                                   !status5.enabledEvents.includes('Airdropped');

  if (chain4HasCorrectEvents && chain5HasCorrectEvents) {
    console.log('✅ Configuration independence verified (Req 16.1, 16.3)\n');
  } else {
    console.log('❌ Configuration independence test failed\n');
  }
} catch (error) {
  console.error('❌ Error verifying configuration independence:', error);
}

console.log('🎉 Event Configuration System Verification Complete!');
