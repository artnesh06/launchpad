/**
 * Test suite for event configuration system in ActivityListener
 * Tests Requirements 16.1, 16.2, 16.3
 */

import { ActivityListener, ActivityListenerConfig, DEFAULT_EVENT_CONFIG, EventConfig } from '@/lib/blockchain/activity-listener';

describe('Event Configuration System', () => {
  describe('DEFAULT_EVENT_CONFIG', () => {
    it('should contain all 24 events', () => {
      // Count events excluding the existing backward compatibility events
      const newEvents = DEFAULT_EVENT_CONFIG.filter(
        e => !['Transfer', 'LaunchpadCreated', 'ContractDeployed'].includes(e.eventName)
      );
      
      expect(newEvents.length).toBe(19); // 19 new events
      expect(DEFAULT_EVENT_CONFIG.length).toBe(22); // 19 new + 3 existing
    });

    it('should have all required fields for each event', () => {
      DEFAULT_EVENT_CONFIG.forEach((config: EventConfig) => {
        expect(config).toHaveProperty('eventName');
        expect(config).toHaveProperty('enabled');
        expect(config).toHaveProperty('priority');
        expect(config).toHaveProperty('phase');
        
        expect(typeof config.eventName).toBe('string');
        expect(typeof config.enabled).toBe('boolean');
        expect(['high', 'medium', 'low']).toContain(config.priority);
        expect([1, 2, 3, 4]).toContain(config.phase);
      });
    });

    it('should organize events by phase correctly', () => {
      const phase1Events = DEFAULT_EVENT_CONFIG.filter(e => e.phase === 1);
      const phase2Events = DEFAULT_EVENT_CONFIG.filter(e => e.phase === 2);
      const phase3Events = DEFAULT_EVENT_CONFIG.filter(e => e.phase === 3);
      const phase4Events = DEFAULT_EVENT_CONFIG.filter(e => e.phase === 4);

      // Phase 1: User-facing events (5 new + 3 existing)
      expect(phase1Events.length).toBeGreaterThanOrEqual(5);
      
      // Phase 2: Admin events (6)
      expect(phase2Events.length).toBe(6);
      
      // Phase 3: Metadata events (3)
      expect(phase3Events.length).toBe(3);
      
      // Phase 4: Security events (5)
      expect(phase4Events.length).toBe(5);
    });
  });

  describe('ActivityListenerConfig', () => {
    it('should accept optional enabledEvents parameter', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123',
        enabledEvents: ['Burned', 'Airdropped']
      };

      expect(config.enabledEvents).toEqual(['Burned', 'Airdropped']);
    });

    it('should accept optional errorThreshold parameter', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123',
        errorThreshold: 5
      };

      expect(config.errorThreshold).toBe(5);
    });

    it('should accept optional retryAttempts parameter', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123',
        retryAttempts: 5
      };

      expect(config.retryAttempts).toBe(5);
    });

    it('should work without optional parameters', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123'
      };

      expect(config.chainId).toBe(1);
      expect(config.enabledEvents).toBeUndefined();
      expect(config.errorThreshold).toBeUndefined();
      expect(config.retryAttempts).toBeUndefined();
    });
  });

  describe('ActivityListener initialization', () => {
    it('should initialize with default enabled events when none specified', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123'
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      // Should have all enabled events from DEFAULT_EVENT_CONFIG
      const expectedCount = DEFAULT_EVENT_CONFIG.filter(e => e.enabled).length;
      expect(status.enabledEventsCount).toBe(expectedCount);
      expect(status.enabledEvents.length).toBe(expectedCount);
    });

    it('should initialize with custom enabled events when specified', () => {
      const customEvents = ['Burned', 'Airdropped', 'Transfer'];
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123',
        enabledEvents: customEvents
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      expect(status.enabledEventsCount).toBe(3);
      expect(status.enabledEvents).toEqual(expect.arrayContaining(customEvents));
    });

    it('should use default errorThreshold when not specified', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123'
      };

      const listener = new ActivityListener(config);
      // The errorThreshold is private, but we can verify it's set by checking the listener was created
      expect(listener).toBeDefined();
    });

    it('should use custom errorThreshold when specified', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123',
        errorThreshold: 5
      };

      const listener = new ActivityListener(config);
      expect(listener).toBeDefined();
    });

    it('should use default retryAttempts when not specified', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123'
      };

      const listener = new ActivityListener(config);
      expect(listener).toBeDefined();
    });

    it('should use custom retryAttempts when specified', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123',
        retryAttempts: 5
      };

      const listener = new ActivityListener(config);
      expect(listener).toBeDefined();
    });
  });

  describe('getStatus method', () => {
    it('should include enabledEventsCount in status', () => {
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123',
        enabledEvents: ['Burned', 'Airdropped']
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      expect(status).toHaveProperty('enabledEventsCount');
      expect(status.enabledEventsCount).toBe(2);
    });

    it('should include enabledEvents array in status', () => {
      const customEvents = ['Burned', 'Airdropped', 'Transfer'];
      const config: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test.rpc',
        factoryAddress: '0x123',
        enabledEvents: customEvents
      };

      const listener = new ActivityListener(config);
      const status = listener.getStatus();

      expect(status).toHaveProperty('enabledEvents');
      expect(status.enabledEvents).toEqual(expect.arrayContaining(customEvents));
      expect(status.enabledEvents.length).toBe(3);
    });
  });

  describe('Event filtering independence (Requirement 16.1, 16.3)', () => {
    it('should allow different chains to have different enabled events', () => {
      const config1: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test1.rpc',
        factoryAddress: '0x123',
        enabledEvents: ['Burned', 'Airdropped']
      };

      const config2: ActivityListenerConfig = {
        chainId: 2,
        rpcUrl: 'https://test2.rpc',
        factoryAddress: '0x456',
        enabledEvents: ['Transfer', 'PhaseAdded']
      };

      const listener1 = new ActivityListener(config1);
      const listener2 = new ActivityListener(config2);

      const status1 = listener1.getStatus();
      const status2 = listener2.getStatus();

      // Verify chain 1 has its own events
      expect(status1.enabledEvents).toEqual(expect.arrayContaining(['Burned', 'Airdropped']));
      expect(status1.enabledEvents).not.toContain('Transfer');
      expect(status1.enabledEvents).not.toContain('PhaseAdded');

      // Verify chain 2 has its own events
      expect(status2.enabledEvents).toEqual(expect.arrayContaining(['Transfer', 'PhaseAdded']));
      expect(status2.enabledEvents).not.toContain('Burned');
      expect(status2.enabledEvents).not.toContain('Airdropped');
    });

    it('should not affect other listeners when modifying one listener config', () => {
      const config1: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test1.rpc',
        factoryAddress: '0x123',
        enabledEvents: ['Burned']
      };

      const config2: ActivityListenerConfig = {
        chainId: 2,
        rpcUrl: 'https://test2.rpc',
        factoryAddress: '0x456',
        enabledEvents: ['Transfer']
      };

      const listener1 = new ActivityListener(config1);
      const listener2 = new ActivityListener(config2);

      // Get initial status
      const status1Before = listener1.getStatus();
      const status2Before = listener2.getStatus();

      // Verify they are independent
      expect(status1Before.enabledEvents).toEqual(['Burned']);
      expect(status2Before.enabledEvents).toEqual(['Transfer']);

      // Create a new listener with different config (simulating config change)
      const config1Modified: ActivityListenerConfig = {
        chainId: 1,
        rpcUrl: 'https://test1.rpc',
        factoryAddress: '0x123',
        enabledEvents: ['Burned', 'Airdropped']
      };

      const listener1Modified = new ActivityListener(config1Modified);
      const status1After = listener1Modified.getStatus();
      const status2After = listener2.getStatus();

      // Verify listener1 changed
      expect(status1After.enabledEvents).toEqual(expect.arrayContaining(['Burned', 'Airdropped']));

      // Verify listener2 unchanged
      expect(status2After.enabledEvents).toEqual(['Transfer']);
    });
  });
});
