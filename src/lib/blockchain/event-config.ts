/**
 * Event Configuration
 * 
 * Default configuration for all contract events organized by phase and priority.
 */

import { EventConfig } from './event-types';

// Default event configuration by phase
export const DEFAULT_EVENT_CONFIG: EventConfig[] = [
  // Phase 1: User-facing events (high priority)
  { eventName: 'Burned', enabled: true, priority: 'high', phase: 1 },
  { eventName: 'Airdropped', enabled: true, priority: 'high', phase: 1 },
  { eventName: 'PhaseAdded', enabled: true, priority: 'high', phase: 1 },
  { eventName: 'PhaseUpdated', enabled: true, priority: 'high', phase: 1 },
  { eventName: 'Revealed', enabled: true, priority: 'high', phase: 1 },
  
  // Phase 2: Admin events (medium priority)
  { eventName: 'TreasuryUpdated', enabled: true, priority: 'medium', phase: 2 },
  { eventName: 'Withdrawn', enabled: true, priority: 'medium', phase: 2 },
  { eventName: 'OwnershipTransferred', enabled: true, priority: 'medium', phase: 2 },
  { eventName: 'PlatformFeeToggled', enabled: true, priority: 'medium', phase: 2 },
  { eventName: 'PlatformFlatFeeUpdated', enabled: true, priority: 'medium', phase: 2 },
  { eventName: 'RoyaltyUpdated', enabled: true, priority: 'medium', phase: 2 },
  
  // Phase 3: Metadata events (low priority)
  { eventName: 'BaseURIUpdated', enabled: true, priority: 'low', phase: 3 },
  { eventName: 'ContractURIUpdated', enabled: true, priority: 'low', phase: 3 },
  { eventName: 'ExternalLinkUpdated', enabled: true, priority: 'low', phase: 3 },
  
  // Phase 4: Security events (high priority)
  { eventName: 'Paused', enabled: true, priority: 'high', phase: 4 },
  { eventName: 'Unpaused', enabled: true, priority: 'high', phase: 4 },
  { eventName: 'TransferLockUpdated', enabled: true, priority: 'medium', phase: 4 },
  { eventName: 'RoleGranted', enabled: true, priority: 'medium', phase: 4 },
  { eventName: 'RoleRevoked', enabled: true, priority: 'medium', phase: 4 },
  
  // Existing events (for backward compatibility)
  { eventName: 'Transfer', enabled: true, priority: 'high', phase: 1 },
  { eventName: 'LaunchpadCreated', enabled: true, priority: 'high', phase: 1 },
  { eventName: 'ContractDeployed', enabled: true, priority: 'high', phase: 1 },
];
