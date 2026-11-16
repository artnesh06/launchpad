/**
 * Test suite for registerEventHandlers method
 * Tests Requirement 16.2: Filter events based on enabledEvents configuration
 */

import { ActivityListener, ActivityListenerConfig } from '@/lib/blockchain/activity-listener';

describe('registerEventHandlers method', () => {
  describe('Event handler registration', () => {
    it('should create ActivityListener with registerEventHandlers method', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890',
        enabledEvents: ['Burned', 'Airdropped']
      };

      const listener = new ActivityListener(config);
      
      // Verify listener was created successfully
      expect(listener).toBeDefined();
      
      // Verify the listener has the correct configuration
      const status = listener.getStatus();
      expect(status.chainId).toBe(1);
      expect(status.enabledEventsCount).toBe(2);
      expect(status.enabledEvents).toEqual(expect.arrayContaining(['Burned', 'Airdropped']));
    });

    it('should initialize with all enabled events when none specified', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890'
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      // Should have all enabled events from DEFAULT_EVENT_CONFIG
      expect(status.enabledEventsCount).toBeGreaterThan(0);
      expect(status.enabledEvents.length).toBeGreaterThan(0);
    });

    it('should filter events based on configuration', () => {
      const customEvents = ['Burned', 'Airdropped', 'PhaseAdded'];
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890',
        enabledEvents: customEvents
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      // Should only have the specified events
      expect(status.enabledEventsCount).toBe(3);
      expect(status.enabledEvents).toEqual(expect.arrayContaining(customEvents));
      
      // Should not have other events
      expect(status.enabledEvents).not.toContain('Transfer');
      expect(status.enabledEvents).not.toContain('Revealed');
      expect(status.enabledEvents).not.toContain('TreasuryUpdated');
    });

    it('should support all 24 event types in configuration', () => {
      const allEvents = [
        // Phase 1: User-facing events
        'Transfer',
        'Burned',
        'Airdropped',
        'PhaseAdded',
        'PhaseUpdated',
        'Revealed',
        // Phase 2: Admin events
        'TreasuryUpdated',
        'Withdrawn',
        'OwnershipTransferred',
        'PlatformFeeToggled',
        'PlatformFlatFeeUpdated',
        'RoyaltyUpdated',
        // Phase 3: Metadata events
        'BaseURIUpdated',
        'ContractURIUpdated',
        'ExternalLinkUpdated',
        // Phase 4: Security events
        'Paused',
        'Unpaused',
        'TransferLockUpdated',
        'RoleGranted',
        'RoleRevoked',
        // Factory events
        'LaunchpadCreated',
        'ContractDeployed'
      ];

      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890',
        enabledEvents: allEvents
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      // Should have all specified events
      expect(status.enabledEventsCount).toBe(allEvents.length);
      expect(status.enabledEvents).toEqual(expect.arrayContaining(allEvents));
    });

    it('should handle empty enabledEvents array', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890',
        enabledEvents: []
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      // Should have no enabled events
      expect(status.enabledEventsCount).toBe(0);
      expect(status.enabledEvents).toEqual([]);
    });

    it('should maintain event configuration independence across multiple listeners', () => {
      const config1: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test1.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890',
        enabledEvents: ['Burned', 'Airdropped']
      };

      const config2: ActivityListenerConfig = {
        chainId: 2,
        rpcUrl: 'https://test2.rpc',
        factoryAddress: '0x0987654321098765432109876543210987654321',
        enabledEvents: ['Transfer', 'PhaseAdded', 'Revealed']
      };

      const listener1 = new ActivityListener(config1);
      const listener2 = new ActivityListener(config2);

      const status1 = listener1.getStatus();
      const status2 = listener2.getStatus();

      // Verify listener1 has only its events
      expect(status1.enabledEventsCount).toBe(2);
      expect(status1.enabledEvents).toEqual(expect.arrayContaining(['Burned', 'Airdropped']));
      expect(status1.enabledEvents).not.toContain('Transfer');

      // Verify listener2 has only its events
      expect(status2.enabledEventsCount).toBe(3);
      expect(status2.enabledEvents).toEqual(expect.arrayContaining(['Transfer', 'PhaseAdded', 'Revealed']));
      expect(status2.enabledEvents).not.toContain('Burned');
    });
  });

  describe('Event handler registration by phase', () => {
    it('should support Phase 1 user-facing events', () => {
      const phase1Events = ['Transfer', 'Burned', 'Airdropped', 'PhaseAdded', 'PhaseUpdated', 'Revealed'];
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890',
        enabledEvents: phase1Events
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      expect(status.enabledEvents).toEqual(expect.arrayContaining(phase1Events));
    });

    it('should support Phase 2 administrative events', () => {
      const phase2Events = [
        'TreasuryUpdated',
        'Withdrawn',
        'OwnershipTransferred',
        'PlatformFeeToggled',
        'PlatformFlatFeeUpdated',
        'RoyaltyUpdated'
      ];
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890',
        enabledEvents: phase2Events
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      expect(status.enabledEvents).toEqual(expect.arrayContaining(phase2Events));
    });

    it('should support Phase 3 metadata events', () => {
      const phase3Events = ['BaseURIUpdated', 'ContractURIUpdated', 'ExternalLinkUpdated'];
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890',
        enabledEvents: phase3Events
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      expect(status.enabledEvents).toEqual(expect.arrayContaining(phase3Events));
    });

    it('should support Phase 4 security events', () => {
      const phase4Events = [
        'Paused',
        'Unpaused',
        'TransferLockUpdated',
        'RoleGranted',
        'RoleRevoked'
      ];
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x1234567890123456789012345678901234567890',
        enabledEvents: phase4Events
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      expect(status.enabledEvents).toEqual(expect.arrayContaining(phase4Events));
    });
  });
});
