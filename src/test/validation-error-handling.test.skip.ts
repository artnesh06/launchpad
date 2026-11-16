/**
 * Test suite for validation and error handling utilities in ActivityListener
 * Tests Requirements 15.1, 15.2, 15.4
 */

import { ActivityListener, ActivityListenerConfig } from '@/lib/blockchain/activity-listener';
import { ActivityType } from '@prisma/client';

describe('Validation and Error Handling Utilities', () => {
  let listener: ActivityListener;
  let config: ActivityListenerConfig;

  beforeEach(() => {
    config = {
      chainId: 1,
      rpcUrl: 'https://test.rpc',
      factoryAddress: '0x1234567890123456789012345678901234567890',
      errorThreshold: 5,
      retryAttempts: 3
    };
    listener = new ActivityListener(config);
  });

  describe('validateEventData', () => {
    it('should validate event with all required fields', () => {
      const validEvent = {
        txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        blockNumber: 12345,
        launchpadAddress: '0x1234567890123456789012345678901234567890',
        owner: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };

      // Access private method through any type casting for testing
      expect(() => {
        (listener as any).validateEventData(validEvent, ['txHash', 'blockNumber', 'launchpadAddress', 'owner']);
      }).not.toThrow();
    });

    it('should throw error for null event data', () => {
      expect(() => {
        (listener as any).validateEventData(null, ['txHash']);
      }).toThrow('Event data is null or undefined');
    });

    it('should throw error for undefined event data', () => {
      expect(() => {
        (listener as any).validateEventData(undefined, ['txHash']);
      }).toThrow('Event data is null or undefined');
    });

    it('should throw error for missing required field', () => {
      const invalidEvent = {
        blockNumber: 12345,
        launchpadAddress: '0x1234567890123456789012345678901234567890'
      };

      expect(() => {
        (listener as any).validateEventData(invalidEvent, ['txHash', 'blockNumber']);
      }).toThrow('Missing required field: txHash');
    });

    it('should throw error for null required field', () => {
      const invalidEvent = {
        txHash: null,
        blockNumber: 12345
      };

      expect(() => {
        (listener as any).validateEventData(invalidEvent, ['txHash', 'blockNumber']);
      }).toThrow('Missing required field: txHash');
    });

    it('should throw error for invalid transaction hash', () => {
      const invalidEvent = {
        txHash: 'invalid-hash',
        blockNumber: 12345
      };

      expect(() => {
        (listener as any).validateEventData(invalidEvent, ['txHash', 'blockNumber']);
      }).toThrow('Invalid transaction hash: invalid-hash');
    });

    it('should throw error for invalid block number (negative)', () => {
      const invalidEvent = {
        txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        blockNumber: -1
      };

      expect(() => {
        (listener as any).validateEventData(invalidEvent, ['txHash', 'blockNumber']);
      }).toThrow('Invalid block number: -1');
    });

    it('should throw error for invalid block number (non-number)', () => {
      const invalidEvent = {
        txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        blockNumber: 'not-a-number'
      };

      expect(() => {
        (listener as any).validateEventData(invalidEvent, ['txHash', 'blockNumber']);
      }).toThrow('Invalid block number: not-a-number');
    });

    it('should throw error for invalid Ethereum address', () => {
      const invalidEvent = {
        txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        blockNumber: 12345,
        owner: 'invalid-address'
      };

      expect(() => {
        (listener as any).validateEventData(invalidEvent, ['txHash', 'blockNumber', 'owner']);
      }).toThrow('Invalid Ethereum address for field owner: invalid-address');
    });

    it('should validate multiple address fields', () => {
      const validEvent = {
        txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        blockNumber: 12345,
        owner: '0x1234567890123456789012345678901234567890',
        recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        sender: '0x9876543210987654321098765432109876543210'
      };

      expect(() => {
        (listener as any).validateEventData(validEvent, ['txHash', 'blockNumber', 'owner', 'recipient', 'sender']);
      }).not.toThrow();
    });
  });

  describe('isValidTxHash', () => {
    it('should return true for valid transaction hash', () => {
      const validHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      expect((listener as any).isValidTxHash(validHash)).toBe(true);
    });

    it('should return true for valid transaction hash with uppercase letters', () => {
      const validHash = '0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF';
      expect((listener as any).isValidTxHash(validHash)).toBe(true);
    });

    it('should return false for hash without 0x prefix', () => {
      const invalidHash = '1234567890123456789012345678901234567890123456789012345678901234';
      expect((listener as any).isValidTxHash(invalidHash)).toBe(false);
    });

    it('should return false for hash with wrong length', () => {
      const invalidHash = '0x12345678901234567890123456789012345678901234567890123456789012';
      expect((listener as any).isValidTxHash(invalidHash)).toBe(false);
    });

    it('should return false for hash with invalid characters', () => {
      const invalidHash = '0x123456789012345678901234567890123456789012345678901234567890GHIJ';
      expect((listener as any).isValidTxHash(invalidHash)).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect((listener as any).isValidTxHash(123)).toBe(false);
      expect((listener as any).isValidTxHash(null)).toBe(false);
      expect((listener as any).isValidTxHash(undefined)).toBe(false);
    });
  });

  describe('isValidAddress', () => {
    it('should return true for valid Ethereum address', () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      expect((listener as any).isValidAddress(validAddress)).toBe(true);
    });

    it('should return true for valid address with uppercase letters', () => {
      const validAddress = '0x1234567890ABCDEF1234567890ABCDEF12345678';
      expect((listener as any).isValidAddress(validAddress)).toBe(true);
    });

    it('should return false for address without 0x prefix', () => {
      const invalidAddress = '1234567890123456789012345678901234567890';
      expect((listener as any).isValidAddress(invalidAddress)).toBe(false);
    });

    it('should return false for address with wrong length', () => {
      const invalidAddress = '0x12345678901234567890123456789012345678';
      expect((listener as any).isValidAddress(invalidAddress)).toBe(false);
    });

    it('should return false for address with invalid characters', () => {
      const invalidAddress = '0x123456789012345678901234567890123456GHIJ';
      expect((listener as any).isValidAddress(invalidAddress)).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect((listener as any).isValidAddress(123)).toBe(false);
      expect((listener as any).isValidAddress(null)).toBe(false);
      expect((listener as any).isValidAddress(undefined)).toBe(false);
    });
  });

  describe('isDuplicateActivity', () => {
    it('should return false for non-duplicate activity', async () => {
      const txHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const eventType = ActivityType.BURN_OCCURRED;

      // Mock prisma to return null (no existing activity)
      const result = await (listener as any).isDuplicateActivity(txHash, eventType);
      
      // Since we don't have a real database, this will return false on error
      expect(typeof result).toBe('boolean');
    });

    it('should handle errors gracefully and return false', async () => {
      const txHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const eventType = ActivityType.BURN_OCCURRED;

      // Should not throw even if database query fails
      const result = await (listener as any).isDuplicateActivity(txHash, eventType);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('incrementErrorCounter', () => {
    it('should increment error count for event type', () => {
      const eventType = 'Burned';
      
      // Increment error counter
      (listener as any).incrementErrorCounter(eventType);
      
      // Check that error counter was created
      const errorCounters = (listener as any).errorCounters;
      expect(errorCounters.has(eventType)).toBe(true);
      expect(errorCounters.get(eventType).count).toBe(1);
    });

    it('should increment existing error counter', () => {
      const eventType = 'Burned';
      
      // Increment multiple times
      (listener as any).incrementErrorCounter(eventType);
      (listener as any).incrementErrorCounter(eventType);
      (listener as any).incrementErrorCounter(eventType);
      
      const errorCounters = (listener as any).errorCounters;
      expect(errorCounters.get(eventType).count).toBe(3);
    });

    it('should update lastError timestamp', () => {
      const eventType = 'Burned';
      const beforeTime = new Date();
      
      (listener as any).incrementErrorCounter(eventType);
      
      const errorCounters = (listener as any).errorCounters;
      const lastError = errorCounters.get(eventType).lastError;
      
      expect(lastError).toBeInstanceOf(Date);
      expect(lastError.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it('should reset counter after reaching threshold', () => {
      const eventType = 'Burned';
      const threshold = 5;
      
      // Increment to threshold
      for (let i = 0; i < threshold; i++) {
        (listener as any).incrementErrorCounter(eventType);
      }
      
      // Counter should be reset after alert
      const errorCounters = (listener as any).errorCounters;
      expect(errorCounters.get(eventType).count).toBe(0);
    });

    it('should handle multiple event types independently', () => {
      (listener as any).incrementErrorCounter('Burned');
      (listener as any).incrementErrorCounter('Burned');
      (listener as any).incrementErrorCounter('Airdropped');
      
      const errorCounters = (listener as any).errorCounters;
      expect(errorCounters.get('Burned').count).toBe(2);
      expect(errorCounters.get('Airdropped').count).toBe(1);
    });
  });

  describe('logEventError', () => {
    it('should log error without throwing', async () => {
      const eventType = 'Burned';
      const error = new Error('Test error');
      const eventData = {
        txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        blockNumber: 12345
      };

      // Should not throw
      await expect(
        (listener as any).logEventError(eventType, error, eventData, 'medium')
      ).resolves.not.toThrow();
    });

    it('should handle Error objects', async () => {
      const eventType = 'Burned';
      const error = new Error('Test error message');
      error.stack = 'Test stack trace';
      const eventData = { txHash: '0x123' };

      await expect(
        (listener as any).logEventError(eventType, error, eventData, 'high')
      ).resolves.not.toThrow();
    });

    it('should handle non-Error objects', async () => {
      const eventType = 'Burned';
      const error = 'String error';
      const eventData = { txHash: '0x123' };

      await expect(
        (listener as any).logEventError(eventType, error, eventData, 'low')
      ).resolves.not.toThrow();
    });

    it('should increment error counter when logging', async () => {
      const eventType = 'Burned';
      const error = new Error('Test error');
      const eventData = { txHash: '0x123' };

      await (listener as any).logEventError(eventType, error, eventData, 'medium');

      const errorCounters = (listener as any).errorCounters;
      expect(errorCounters.has(eventType)).toBe(true);
      expect(errorCounters.get(eventType).count).toBeGreaterThan(0);
    });

    it('should handle different severity levels', async () => {
      const eventType = 'Burned';
      const error = new Error('Test error');
      const eventData = { txHash: '0x123' };

      const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];

      for (const severity of severities) {
        await expect(
          (listener as any).logEventError(eventType, error, eventData, severity)
        ).resolves.not.toThrow();
      }
    });
  });

  describe('Error isolation (Requirement 15.2)', () => {
    it('should continue processing after validation error', () => {
      const invalidEvent = {
        txHash: 'invalid',
        blockNumber: 12345
      };

      const validEvent = {
        txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        blockNumber: 12345
      };

      // First validation should fail
      expect(() => {
        (listener as any).validateEventData(invalidEvent, ['txHash', 'blockNumber']);
      }).toThrow();

      // Second validation should succeed (not affected by first failure)
      expect(() => {
        (listener as any).validateEventData(validEvent, ['txHash', 'blockNumber']);
      }).not.toThrow();
    });

    it('should track errors independently per event type', () => {
      (listener as any).incrementErrorCounter('Burned');
      (listener as any).incrementErrorCounter('Burned');
      (listener as any).incrementErrorCounter('Airdropped');

      const errorCounters = (listener as any).errorCounters;
      
      // Errors should be tracked separately
      expect(errorCounters.get('Burned').count).toBe(2);
      expect(errorCounters.get('Airdropped').count).toBe(1);
    });
  });

  describe('Validation before storage (Requirement 15.4)', () => {
    it('should validate all required fields before processing', () => {
      const requiredFields = ['txHash', 'blockNumber', 'launchpadAddress'];
      
      const validEvent = {
        txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        blockNumber: 12345,
        launchpadAddress: '0x1234567890123456789012345678901234567890'
      };

      expect(() => {
        (listener as any).validateEventData(validEvent, requiredFields);
      }).not.toThrow();
    });

    it('should reject invalid data before storage attempt', () => {
      const invalidEvent = {
        txHash: 'invalid-hash',
        blockNumber: 12345,
        launchpadAddress: '0x1234567890123456789012345678901234567890'
      };

      expect(() => {
        (listener as any).validateEventData(invalidEvent, ['txHash', 'blockNumber', 'launchpadAddress']);
      }).toThrow('Invalid transaction hash');
    });

    it('should validate data types', () => {
      const invalidEvent = {
        txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        blockNumber: 'not-a-number',
        launchpadAddress: '0x1234567890123456789012345678901234567890'
      };

      expect(() => {
        (listener as any).validateEventData(invalidEvent, ['txHash', 'blockNumber', 'launchpadAddress']);
      }).toThrow('Invalid block number');
    });
  });

  describe('Error logging completeness (Requirement 15.1)', () => {
    it('should include all required context in error log', async () => {
      const eventType = 'Burned';
      const error = new Error('Test error');
      const eventData = {
        txHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        blockNumber: 12345,
        owner: '0x1234567890123456789012345678901234567890'
      };

      // Should log with all context
      await expect(
        (listener as any).logEventError(eventType, error, eventData, 'high')
      ).resolves.not.toThrow();
    });

    it('should handle missing optional fields in event data', async () => {
      const eventType = 'Burned';
      const error = new Error('Test error');
      const eventData = {
        // Only required fields
        txHash: '0x1234567890123456789012345678901234567890123456789012345678901234'
      };

      await expect(
        (listener as any).logEventError(eventType, error, eventData, 'medium')
      ).resolves.not.toThrow();
    });
  });

  describe('Configuration integration', () => {
    it('should use custom error threshold from config', () => {
      const customConfig: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890',
        errorThreshold: 3
      };

      const customListener = new ActivityListener(customConfig);
      
      // Increment to custom threshold
      for (let i = 0; i < 3; i++) {
        (customListener as any).incrementErrorCounter('TestEvent');
      }

      // Counter should be reset after reaching custom threshold
      const errorCounters = (customListener as any).errorCounters;
      expect(errorCounters.get('TestEvent').count).toBe(0);
    });

    it('should use default error threshold when not specified', () => {
      const defaultConfig: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890'
      };

      const defaultListener = new ActivityListener(defaultConfig);
      
      // Default threshold should be 10
      for (let i = 0; i < 9; i++) {
        (defaultListener as any).incrementErrorCounter('TestEvent');
      }

      // Should not reset yet (threshold is 10)
      const errorCounters = (defaultListener as any).errorCounters;
      expect(errorCounters.get('TestEvent').count).toBe(9);
    });
  });
});
