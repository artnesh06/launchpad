/**
 * Manual test script for validation and error handling utilities
 * Run with: npx tsx src/test/manual-validation-test.ts
 * Tests Requirements 15.1, 15.2, 15.4
 */

import { ActivityListener, ActivityListenerConfig } from '@/lib/blockchain/activity-listener';
import { ActivityType } from '@prisma/client';

// Test counter
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
  }
}

function assertThrows(fn: () => void, expectedError: string, message: string) {
  try {
    fn();
    console.error(`❌ FAIL: ${message} (expected to throw but didn't)`);
    failedTests++;
  } catch (error: any) {
    if (error.message.includes(expectedError)) {
      console.log(`✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`❌ FAIL: ${message} (wrong error: ${error.message})`);
      failedTests++;
    }
  }
}

async function assertNotThrows(fn: () => Promise<void>, message: string) {
  try {
    await fn();
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  } catch (error: any) {
    console.error(`❌ FAIL: ${message} (threw: ${error.message})`);
    failedTests++;
  }
}

async function runTests() {
  console.log('🧪 Starting Validation and Error Handling Tests\n');

  const config: ActivityListenerConfig = {
    chainId: 1,
    rpcUrl: 'https://test.rpc',
    factoryAddress: '0x1234567890123456789012345678901234567890',
    errorThreshold: 5,
    retryAttempts: 3
  };

  const listener = new ActivityListener(config);

  // Test 1: validateEventData with valid data
  console.log('\n📋 Test Group: validateEventData');
  const validEvent = {
    txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
    blockNumber: 12345,
    launchpadAddress: '0x1234567890123456789012345678901234567890',
    owner: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
  };

  try {
    (listener as any).validateEventData(validEvent, ['txHash', 'blockNumber', 'launchpadAddress', 'owner']);
    console.log('✅ PASS: Valid event data passes validation');
    passedTests++;
  } catch (error) {
    console.error('❌ FAIL: Valid event data should not throw');
    failedTests++;
  }

  // Test 2: validateEventData with null data
  assertThrows(
    () => (listener as any).validateEventData(null, ['txHash']),
    'Event data is null or undefined',
    'Null event data throws error'
  );

  // Test 3: validateEventData with missing field
  assertThrows(
    () => (listener as any).validateEventData({ blockNumber: 12345 }, ['txHash', 'blockNumber']),
    'Missing required field: txHash',
    'Missing required field throws error'
  );

  // Test 4: validateEventData with invalid txHash
  assertThrows(
    () => (listener as any).validateEventData({ txHash: 'invalid', blockNumber: 12345 }, ['txHash']),
    'Invalid transaction hash',
    'Invalid transaction hash throws error'
  );

  // Test 5: validateEventData with invalid block number
  assertThrows(
    () => (listener as any).validateEventData({
      txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      blockNumber: -1
    }, ['txHash', 'blockNumber']),
    'Invalid block number',
    'Negative block number throws error'
  );

  // Test 6: validateEventData with invalid address
  assertThrows(
    () => (listener as any).validateEventData({
      txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      blockNumber: 12345,
      owner: 'invalid-address'
    }, ['txHash', 'blockNumber', 'owner']),
    'Invalid Ethereum address',
    'Invalid Ethereum address throws error'
  );

  // Test 7-12: isValidTxHash
  console.log('\n📋 Test Group: isValidTxHash');
  assert(
    (listener as any).isValidTxHash('0x1234567890123456789012345678901234567890123456789012345678901234'),
    'Valid transaction hash returns true'
  );

  assert(
    (listener as any).isValidTxHash('0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF'),
    'Valid transaction hash with uppercase returns true'
  );

  assert(
    !(listener as any).isValidTxHash('1234567890123456789012345678901234567890123456789012345678901234'),
    'Transaction hash without 0x prefix returns false'
  );

  assert(
    !(listener as any).isValidTxHash('0x12345678901234567890123456789012345678901234567890123456789012'),
    'Transaction hash with wrong length returns false'
  );

  assert(
    !(listener as any).isValidTxHash('0x123456789012345678901234567890123456789012345678901234567890GHIJ'),
    'Transaction hash with invalid characters returns false'
  );

  assert(
    !(listener as any).isValidTxHash(123 as any),
    'Non-string transaction hash returns false'
  );

  // Test 13-18: isValidAddress
  console.log('\n📋 Test Group: isValidAddress');
  assert(
    (listener as any).isValidAddress('0x1234567890123456789012345678901234567890'),
    'Valid Ethereum address returns true'
  );

  assert(
    (listener as any).isValidAddress('0x1234567890ABCDEF1234567890ABCDEF12345678'),
    'Valid address with uppercase returns true'
  );

  assert(
    !(listener as any).isValidAddress('1234567890123456789012345678901234567890'),
    'Address without 0x prefix returns false'
  );

  assert(
    !(listener as any).isValidAddress('0x12345678901234567890123456789012345678'),
    'Address with wrong length returns false'
  );

  assert(
    !(listener as any).isValidAddress('0x123456789012345678901234567890123456GHIJ'),
    'Address with invalid characters returns false'
  );

  assert(
    !(listener as any).isValidAddress(null as any),
    'Null address returns false'
  );

  // Test 19-22: incrementErrorCounter
  console.log('\n📋 Test Group: incrementErrorCounter');
  (listener as any).incrementErrorCounter('TestEvent1');
  const errorCounters1 = (listener as any).errorCounters;
  assert(
    errorCounters1.has('TestEvent1') && errorCounters1.get('TestEvent1').count === 1,
    'Error counter increments for new event type'
  );

  (listener as any).incrementErrorCounter('TestEvent1');
  (listener as any).incrementErrorCounter('TestEvent1');
  const errorCounters2 = (listener as any).errorCounters;
  assert(
    errorCounters2.get('TestEvent1').count === 3,
    'Error counter increments for existing event type'
  );

  const beforeTime = new Date();
  (listener as any).incrementErrorCounter('TestEvent2');
  const errorCounters3 = (listener as any).errorCounters;
  const lastError = errorCounters3.get('TestEvent2').lastError;
  assert(
    lastError instanceof Date && lastError.getTime() >= beforeTime.getTime(),
    'Error counter updates lastError timestamp'
  );

  // Test threshold reset
  const testListener = new ActivityListener({
    ...config,
    errorThreshold: 3
  });
  (testListener as any).incrementErrorCounter('ThresholdTest');
  (testListener as any).incrementErrorCounter('ThresholdTest');
  (testListener as any).incrementErrorCounter('ThresholdTest');
  const errorCounters4 = (testListener as any).errorCounters;
  assert(
    errorCounters4.get('ThresholdTest').count === 0,
    'Error counter resets after reaching threshold'
  );

  // Test 23-25: logEventError
  console.log('\n📋 Test Group: logEventError');
  await assertNotThrows(
    async () => {
      await (listener as any).logEventError(
        'TestEvent',
        new Error('Test error'),
        { txHash: '0x123', blockNumber: 12345 },
        'medium'
      );
    },
    'logEventError does not throw with valid data'
  );

  await assertNotThrows(
    async () => {
      await (listener as any).logEventError(
        'TestEvent',
        'String error',
        { txHash: '0x123' },
        'low'
      );
    },
    'logEventError handles non-Error objects'
  );

  await assertNotThrows(
    async () => {
      const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
      for (const severity of severities) {
        await (listener as any).logEventError(
          'TestEvent',
          new Error('Test'),
          { txHash: '0x123' },
          severity
        );
      }
    },
    'logEventError handles all severity levels'
  );

  // Test 26: isDuplicateActivity
  console.log('\n📋 Test Group: isDuplicateActivity');
  await assertNotThrows(
    async () => {
      const result = await (listener as any).isDuplicateActivity(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        ActivityType.BURN_OCCURRED
      );
      assert(
        typeof result === 'boolean',
        'isDuplicateActivity returns boolean'
      );
    },
    'isDuplicateActivity does not throw'
  );

  // Test 27: Error isolation
  console.log('\n📋 Test Group: Error Isolation (Requirement 15.2)');
  try {
    (listener as any).validateEventData({ txHash: 'invalid' }, ['txHash']);
  } catch (error) {
    // Expected to throw
  }

  try {
    (listener as any).validateEventData({
      txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      blockNumber: 12345
    }, ['txHash', 'blockNumber']);
    console.log('✅ PASS: Validation continues after previous error');
    passedTests++;
  } catch (error) {
    console.error('❌ FAIL: Validation should continue after previous error');
    failedTests++;
  }

  // Test 28: Independent error tracking
  (listener as any).incrementErrorCounter('Event1');
  (listener as any).incrementErrorCounter('Event1');
  (listener as any).incrementErrorCounter('Event2');
  const errorCounters5 = (listener as any).errorCounters;
  assert(
    errorCounters5.get('Event1').count === 2 && errorCounters5.get('Event2').count === 1,
    'Errors tracked independently per event type'
  );

  // Test 29: Configuration integration
  console.log('\n📋 Test Group: Configuration Integration');
  const customListener = new ActivityListener({
    chainId: 1,
    rpcUrl: 'https://test.rpc',
    factoryAddress: '0x1234567890123456789012345678901234567890',
    errorThreshold: 2
  });

  (customListener as any).incrementErrorCounter('CustomTest');
  (customListener as any).incrementErrorCounter('CustomTest');
  const customCounters = (customListener as any).errorCounters;
  assert(
    customCounters.get('CustomTest').count === 0,
    'Custom error threshold is respected'
  );

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Total: ${passedTests + failedTests}`);
  console.log(`🎯 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);
  console.log('='.repeat(50));

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
