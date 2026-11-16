# Design Document

## Overview

This design document outlines the implementation of comprehensive event listening for the OddsLaunchpad smart contract ecosystem. The system will expand from tracking 2 events (7.7% coverage) to tracking all 24 critical contract events, providing complete visibility into user activities, administrative actions, and contract state changes.

The implementation will follow a phased approach, prioritizing user-facing events first, then administrative events, followed by metadata and security monitoring events. The design leverages the existing ActivityListener architecture and extends it with new event handlers while maintaining backward compatibility.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Multi-Chain Listener Manager               │
│  - Manages listeners across multiple blockchain networks     │
│  - Handles listener lifecycle (start/stop/restart)           │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐       ┌───────▼────────┐
│  Chain 1       │       │  Chain 2       │
│  Listener      │  ...  │  Listener      │
└───────┬────────┘       └───────┬────────┘
        │                        │
        │  ┌─────────────────────┘
        │  │
┌───────▼──▼──────────────────────────────────────────────────┐
│              Enhanced Activity Listener                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Event Handlers (26 total)                           │  │
│  │  - Existing: Transfer (mint), ContractDeployed       │  │
│  │  - New: Burned, Airdropped, PhaseAdded, etc.        │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Event Processing Pipeline                            │  │
│  │  1. Event Detection                                   │  │
│  │  2. Data Extraction                                   │  │
│  │  3. Validation                                        │  │
│  │  4. Database Storage                                  │  │
│  │  5. Error Handling                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                ┌─────────▼─────────┐
                │   Database        │
                │   - Activity      │
                │   - Launchpad     │
                │   - Metadata      │
                └───────────────────┘
```

### Component Interaction Flow

```
Smart Contract Event Emission
        │
        ▼
Ethers.js Event Listener
        │
        ▼
Event Handler (ActivityListener)
        │
        ├─► Data Extraction
        ├─► Validation
        ├─► Deduplication Check
        └─► Database Write (with retry)
                │
                ▼
        Activity Feed / UI Update
```

## Components and Interfaces

### 1. Enhanced ActivityListener Class

The existing `ActivityListener` class will be extended with new event handlers:

```typescript
export class ActivityListener {
  // Existing properties
  private provider: ethers.JsonRpcProvider;
  private factoryContract: ethers.Contract;
  private launchpadContracts: Map<string, ethers.Contract>;
  private config: ActivityListenerConfig;
  
  // New: Event configuration
  private enabledEvents: Set<string>;
  
  // Existing methods
  async start(): Promise<void>;
  async stop(): Promise<void>;
  async addLaunchpad(address: string): Promise<void>;
  
  // New: Event handler registration
  private async registerEventHandlers(): Promise<void>;
  
  // New: User-facing event handlers (Phase 1)
  private async handleBurnedEvent(event: BurnedEvent): Promise<void>;
  private async handleAirdroppedEvent(event: AirdroppedEvent): Promise<void>;
  private async handlePhaseAddedEvent(event: PhaseAddedEvent): Promise<void>;
  private async handlePhaseUpdatedEvent(event: PhaseUpdatedEvent): Promise<void>;
  private async handleRevealedEvent(event: RevealedEvent): Promise<void>;
  
  // New: Admin event handlers (Phase 2)
  private async handleTreasuryUpdatedEvent(event: TreasuryUpdatedEvent): Promise<void>;
  private async handleWithdrawnEvent(event: WithdrawnEvent): Promise<void>;
  private async handleOwnershipTransferredEvent(event: OwnershipTransferredEvent): Promise<void>;
  private async handlePlatformFeeToggledEvent(event: PlatformFeeToggledEvent): Promise<void>;
  private async handlePlatformFlatFeeUpdatedEvent(event: PlatformFlatFeeUpdatedEvent): Promise<void>;
  private async handleRoyaltyUpdatedEvent(event: RoyaltyUpdatedEvent): Promise<void>;
  
  // New: Metadata event handlers (Phase 3)
  private async handleBaseURIUpdatedEvent(event: BaseURIUpdatedEvent): Promise<void>;
  private async handleContractURIUpdatedEvent(event: ContractURIUpdatedEvent): Promise<void>;
  private async handleExternalLinkUpdatedEvent(event: ExternalLinkUpdatedEvent): Promise<void>;
  
  // New: Security event handlers (Phase 4)
  private async handlePausedEvent(event: PausedEvent): Promise<void>;
  private async handleUnpausedEvent(event: UnpausedEvent): Promise<void>;
  private async handleTransferLockUpdatedEvent(event: TransferLockUpdatedEvent): Promise<void>;
  private async handleRoleGrantedEvent(event: RoleGrantedEvent): Promise<void>;
  private async handleRoleRevokedEvent(event: RoleRevokedEvent): Promise<void>;
}
```

### 2. Event Type Definitions

```typescript
// Phase 1: User-facing events
interface BurnedEvent {
  owner: string;
  tokenId: bigint;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface AirdroppedEvent {
  operator: string;
  recipientCount: bigint;
  totalQuantity: bigint;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface PhaseAddedEvent {
  phaseId: bigint;
  name: string;
  startTime: bigint;
  endTime: bigint;
  price: bigint;
  maxMintPerWallet: bigint;
  totalLimit: bigint;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface PhaseUpdatedEvent {
  phaseId: bigint;
  name: string;
  startTime: bigint;
  endTime: bigint;
  price: bigint;
  maxMintPerWallet: bigint;
  totalLimit: bigint;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface RevealedEvent {
  baseURI: string;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

// Phase 2: Admin events
interface TreasuryUpdatedEvent {
  oldTreasury: string;
  newTreasury: string;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface WithdrawnEvent {
  recipient: string;
  amount: bigint;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface OwnershipTransferredEvent {
  previousOwner: string;
  newOwner: string;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface PlatformFeeToggledEvent {
  enabled: boolean;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface PlatformFlatFeeUpdatedEvent {
  newFee: bigint;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface RoyaltyUpdatedEvent {
  recipient: string;
  percentage: bigint;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

// Phase 3: Metadata events
interface BaseURIUpdatedEvent {
  newBaseURI: string;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface ContractURIUpdatedEvent {
  newContractURI: string;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface ExternalLinkUpdatedEvent {
  newExternalLink: string;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

// Phase 4: Security events
interface PausedEvent {
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface UnpausedEvent {
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface TransferLockUpdatedEvent {
  locked: boolean;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface RoleGrantedEvent {
  role: string;
  account: string;
  sender: string;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}

interface RoleRevokedEvent {
  role: string;
  account: string;
  sender: string;
  txHash: string;
  blockNumber: number;
  launchpadAddress: string;
}
```

### 3. Configuration Interface

```typescript
export interface ActivityListenerConfig {
  chainId: number;
  rpcUrl: string;
  factoryAddress: string;
  launchpadAddresses?: string[];
  enabledEvents?: string[]; // New: Allow selective event enabling
  errorThreshold?: number; // Number of errors before alerting (default: 10)
  retryAttempts?: number; // Database retry attempts (default: 3)
}

export interface EventConfig {
  eventName: string;
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
  phase: 1 | 2 | 3 | 4;
}

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
  { eventName: 'RoleRevoked', enabled: true, priority: 'medium', phase: 4 }
];
```

**Design Rationale**: The configuration system allows for flexible event enabling/disabling per chain, which is important because different chains may have different contract versions or requirements. The phased approach with priority levels allows for gradual rollout and helps prioritize which events to process first under high load.

## Implementation Phases

The implementation will follow a phased rollout approach to minimize risk and allow for iterative testing:

### Phase 1: User-Facing Events (High Priority)
**Events**: Burned, Airdropped, PhaseAdded, PhaseUpdated, Revealed

**Rationale**: These events directly impact user experience and provide the most visible value. Users need to see burns (affecting rarity), airdrops (distribution events), phase changes (minting opportunities), and reveals (final metadata).

**Success Criteria**:
- All 5 event handlers implemented and tested
- Activity feed displays these events correctly
- Database updates (supply, phases, reveal status) work correctly

### Phase 2: Administrative Events (Medium Priority)
**Events**: TreasuryUpdated, Withdrawn, OwnershipTransferred, PlatformFeeToggled, PlatformFlatFeeUpdated, RoyaltyUpdated

**Rationale**: These events provide transparency for administrative actions and financial operations. Important for trust and auditability but less time-sensitive than user-facing events.

**Success Criteria**:
- All 6 event handlers implemented and tested
- Admin dashboard displays these events
- Financial transparency maintained

### Phase 3: Metadata Events (Low Priority)
**Events**: BaseURIUpdated, ContractURIUpdated, ExternalLinkUpdated

**Rationale**: These events track metadata changes which are important for completeness but occur less frequently and have lower immediate impact.

**Success Criteria**:
- All 3 event handlers implemented and tested
- Metadata change history tracked
- UI reflects metadata updates

### Phase 4: Security and Access Control Events (High Priority)
**Events**: Paused, Unpaused, TransferLockUpdated, RoleGranted, RoleRevoked

**Rationale**: These events are critical for security monitoring and access control auditing. Implemented last to build on the foundation of earlier phases but marked high priority due to security implications.

**Success Criteria**:
- All 5 event handlers implemented and tested
- Security alerts configured
- Access control audit trail complete

**Overall Success Metric**: Increase event coverage from 7.7% (2/26 events) to 100% (26/26 events) with all events properly captured, stored, and displayed.

## Data Models

### Database Schema Updates

The Prisma schema will be extended with new ActivityType enum values:

```prisma
enum ActivityType {
  // Existing
  FACTORY_CREATED
  LAUNCHPAD_CREATED
  LAUNCHPAD_UPDATED
  MINT_OCCURRED
  PHASE_CREATED
  PHASE_UPDATED
  FEE_UPDATED
  TREASURY_UPDATED
  OWNERSHIP_TRANSFERRED
  EMERGENCY_WITHDRAW
  
  // New - Phase 1: User-facing events
  BURN_OCCURRED
  AIRDROP_OCCURRED
  COLLECTION_REVEALED
  
  // New - Phase 2: Admin events
  ROYALTY_UPDATED
  
  // New - Phase 3: Metadata events
  METADATA_UPDATED
  
  // New - Phase 4: Security events
  CONTRACT_PAUSED
  CONTRACT_UNPAUSED
  TRANSFER_LOCK_UPDATED
  ROLE_GRANTED
  ROLE_REVOKED
}
```

### Activity Metadata Structure

Each activity type will have a specific metadata structure:

```typescript
// Burn activity metadata
interface BurnActivityMetadata {
  tokenId: string;
  owner: string;
  ownerShort: string;
  collectionName: string;
  collectionSymbol: string;
  collectionImage: string | null;
}

// Airdrop activity metadata
interface AirdropActivityMetadata {
  operator: string;
  operatorShort: string;
  recipientCount: string;
  totalQuantity: string;
  collectionName: string;
  collectionSymbol: string;
  collectionImage: string | null;
}

// Phase added activity metadata
interface PhaseAddedActivityMetadata {
  phaseId: string;
  phaseName: string;
  startTime: string;
  endTime: string;
  price: string;
  maxMintPerWallet: string;
  totalLimit: string;
  collectionName: string;
  collectionSymbol: string;
  collectionImage: string | null;
}

// Reveal activity metadata
interface RevealActivityMetadata {
  baseURI: string;
  collectionName: string;
  collectionSymbol: string;
  collectionImage: string | null;
}

// Treasury update activity metadata
interface TreasuryUpdateActivityMetadata {
  oldTreasury: string;
  oldTreasuryShort: string;
  newTreasury: string;
  newTreasuryShort: string;
  collectionName: string;
}

// Withdrawal activity metadata
interface WithdrawalActivityMetadata {
  recipient: string;
  recipientShort: string;
  amount: string;
  amountInEth: string;
  collectionName: string;
}

// Ownership transfer activity metadata
interface OwnershipTransferActivityMetadata {
  previousOwner: string;
  previousOwnerShort: string;
  newOwner: string;
  newOwnerShort: string;
  collectionName: string;
}

// Royalty update activity metadata
interface RoyaltyUpdateActivityMetadata {
  recipient: string;
  recipientShort: string;
  percentage: string;
  collectionName: string;
}

// Platform fee activity metadata
interface PlatformFeeActivityMetadata {
  enabled?: boolean;
  newFee?: string;
  newFeeInEth?: string;
  collectionName: string;
}

// Metadata update activity metadata
interface MetadataUpdateActivityMetadata {
  updateType: 'baseURI' | 'contractURI' | 'externalLink';
  newValue: string;
  collectionName: string;
  collectionSymbol: string;
}

// Pause/Unpause activity metadata
interface PauseActivityMetadata {
  action: 'paused' | 'unpaused';
  collectionName: string;
  collectionSymbol: string;
}

// Transfer lock activity metadata
interface TransferLockActivityMetadata {
  locked: boolean;
  collectionName: string;
  collectionSymbol: string;
}

// Role change activity metadata
interface RoleChangeActivityMetadata {
  action: 'granted' | 'revoked';
  role: string;
  account: string;
  accountShort: string;
  sender: string;
  senderShort: string;
  collectionName: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Event Capture Properties

Property 1: Complete event data capture
*For any* contract event of a specific type (Burned, Airdropped, PhaseAdded, etc.), the event handler should capture all required fields specified in the event interface without data loss or field omission.
**Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 9.2, 10.1, 11.1, 11.2, 12.1, 12.2, 13.1, 14.1, 14.2**

Property 2: Correct activity type assignment
*For any* captured event, the system should store it with the correct ActivityType enum value corresponding to the event type (e.g., Burned → BURN_OCCURRED, Airdropped → AIRDROP_OCCURRED).
**Validates: Requirements 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.3, 10.2, 11.3, 12.3, 13.2, 14.3**

Property 3: Database side effects consistency
*For any* event that requires database updates beyond activity logging (e.g., supply count, phase list, owner field), the corresponding database record should be updated atomically with the activity creation.
**Validates: Requirements 1.3, 3.3, 4.3, 5.3, 8.3**

Property 4: Display completeness
*For any* activity record, the display/formatting function should include all required fields specified for that activity type without omitting mandatory information.
**Validates: Requirements 1.4, 2.3, 3.4, 4.4, 5.4, 6.3, 7.3, 8.4, 9.4, 10.3, 11.4, 12.4, 13.3, 14.4**

### Error Handling Properties

Property 5: Error isolation
*For any* event handler that encounters an error, the system should continue processing subsequent events without cascading failure.
**Validates: Requirements 15.2**

Property 6: Error logging completeness
*For any* error encountered during event processing, the system should log the error with complete context including event type, transaction hash, block number, and error details.
**Validates: Requirements 15.1**

Property 7: Validation before storage
*For any* event data, the system should validate all required fields and data types before attempting database storage, rejecting invalid data.
**Validates: Requirements 15.4**

Property 8: Alert threshold triggering
*For any* event handler that fails repeatedly (exceeding a defined threshold), the system should trigger an administrator alert.
**Validates: Requirements 15.3**

### Configuration Properties

Property 9: Chain-specific event filtering
*For any* configured chain, the system should only process events that are explicitly enabled in that chain's configuration, ignoring disabled events.
**Validates: Requirements 16.2**

Property 10: Configuration independence
*For any* two different chains, modifying the event configuration for one chain should not affect the event configuration or processing of the other chain.
**Validates: Requirements 16.1, 16.3**

## 
Error Handling

### Error Handling Strategy

The event listening system will implement a multi-layered error handling approach to ensure resilience and observability:

#### 1. Event Handler Level

Each event handler will implement try-catch blocks with specific error handling:

```typescript
private async handleBurnedEvent(event: BurnedEvent): Promise<void> {
  try {
    // Validate event data
    this.validateEventData(event, ['owner', 'tokenId', 'txHash', 'blockNumber']);
    
    // Process event
    await this.processBurnEvent(event);
    
  } catch (error) {
    // Log error with full context
    await this.logEventError({
      eventType: 'Burned',
      eventData: event,
      error: error,
      severity: 'high',
      timestamp: new Date()
    });
    
    // Don't throw - allow other events to process
    // Increment error counter for alerting
    this.incrementErrorCounter('Burned');
  }
}
```

#### 2. Validation Layer

All event data will be validated before processing:

```typescript
private validateEventData(event: any, requiredFields: string[]): void {
  for (const field of requiredFields) {
    if (event[field] === undefined || event[field] === null) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }
  
  // Type-specific validations
  if (event.txHash && !this.isValidTxHash(event.txHash)) {
    throw new ValidationError(`Invalid transaction hash: ${event.txHash}`);
  }
  
  if (event.blockNumber && event.blockNumber < 0) {
    throw new ValidationError(`Invalid block number: ${event.blockNumber}`);
  }
}
```

#### 3. Database Error Handling

Database operations will implement retry logic with exponential backoff:

```typescript
private async storeActivityWithRetry(
  activity: ActivityData,
  maxRetries: number = 3
): Promise<void> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      await prisma.activity.create({ data: activity });
      return; // Success
      
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        // Log final failure
        await this.logDatabaseError(activity, error);
        throw error;
      }
      
      // Exponential backoff
      await this.sleep(Math.pow(2, attempt) * 1000);
    }
  }
}
```

#### 4. Error Monitoring and Alerting

The system will track error rates and trigger alerts:

```typescript
interface ErrorCounter {
  eventType: string;
  count: number;
  lastError: Date;
  threshold: number;
}

private errorCounters: Map<string, ErrorCounter> = new Map();

private incrementErrorCounter(eventType: string): void {
  const counter = this.errorCounters.get(eventType) || {
    eventType,
    count: 0,
    lastError: new Date(),
    threshold: 10 // Alert after 10 failures
  };
  
  counter.count++;
  counter.lastError = new Date();
  
  this.errorCounters.set(eventType, counter);
  
  // Check if threshold exceeded
  if (counter.count >= counter.threshold) {
    this.sendAdminAlert({
      type: 'EVENT_HANDLER_FAILURE',
      eventType,
      errorCount: counter.count,
      lastError: counter.lastError
    });
    
    // Reset counter after alert
    counter.count = 0;
  }
}
```

### Error Types and Handling

| Error Type | Handling Strategy | Recovery Action |
|------------|------------------|-----------------|
| ValidationError | Log and skip event | Continue processing |
| DatabaseError | Retry with backoff | Alert if retries exhausted |
| NetworkError | Retry connection | Restart listener if persistent |
| ContractError | Log and investigate | May indicate contract upgrade |
| UnknownError | Log with full context | Alert administrators |

### Deduplication Strategy

To prevent duplicate activity records from reprocessed events:

```typescript
private async isDuplicateActivity(
  txHash: string,
  eventType: string,
  launchpadAddress: string
): Promise<boolean> {
  const existing = await prisma.activity.findFirst({
    where: {
      txHash,
      type: eventType,
      launchpadAddress
    }
  });
  
  return existing !== null;
}
```

**Design Rationale**: This error handling approach ensures that individual event failures don't cascade to system-wide failures, while maintaining complete observability through logging and alerting. The retry mechanism handles transient failures, and the deduplication prevents data corruption from reprocessed events.

## Testing Strategy

### Dual Testing Approach

The implementation will use both unit testing and property-based testing to ensure comprehensive coverage:

#### Unit Testing

Unit tests will verify specific scenarios and edge cases:

1. **Event Handler Tests**: Test each event handler with known event data
2. **Validation Tests**: Test validation logic with valid and invalid inputs
3. **Database Integration Tests**: Test database operations with test database
4. **Error Handling Tests**: Test error scenarios and recovery mechanisms
5. **Configuration Tests**: Test chain-specific configuration loading

Example unit test structure:

```typescript
describe('BurnedEvent Handler', () => {
  it('should capture all required fields from burn event', async () => {
    const mockEvent = {
      owner: '0x123...',
      tokenId: 42n,
      txHash: '0xabc...',
      blockNumber: 12345,
      launchpadAddress: '0xdef...'
    };
    
    await listener.handleBurnedEvent(mockEvent);
    
    const activity = await prisma.activity.findFirst({
      where: { txHash: mockEvent.txHash }
    });
    
    expect(activity).toBeDefined();
    expect(activity.type).toBe('BURN_OCCURRED');
    expect(activity.metadata.tokenId).toBe('42');
  });
  
  it('should reject burn event with missing tokenId', async () => {
    const invalidEvent = {
      owner: '0x123...',
      txHash: '0xabc...',
      blockNumber: 12345,
      launchpadAddress: '0xdef...'
      // Missing tokenId
    };
    
    await expect(
      listener.handleBurnedEvent(invalidEvent)
    ).rejects.toThrow(ValidationError);
  });
});
```

#### Property-Based Testing

Property-based tests will verify universal properties across many generated inputs using **fast-check** (JavaScript/TypeScript property testing library):

Each property-based test will:
- Run a minimum of 100 iterations
- Use smart generators that produce valid event data
- Be tagged with the corresponding correctness property from this design document

Example property test structure:

```typescript
import * as fc from 'fast-check';

describe('Event Capture Properties', () => {
  it('Property 1: Complete event data capture', async () => {
    /**
     * Feature: contract-events-implementation, Property 1
     * For any contract event of a specific type, the event handler 
     * should capture all required fields without data loss.
     */
    
    await fc.assert(
      fc.asyncProperty(
        // Generator for valid burn events
        fc.record({
          owner: fc.hexaString({ minLength: 42, maxLength: 42 }),
          tokenId: fc.bigInt({ min: 0n, max: 10000n }),
          txHash: fc.hexaString({ minLength: 66, maxLength: 66 }),
          blockNumber: fc.integer({ min: 1, max: 1000000 }),
          launchpadAddress: fc.hexaString({ minLength: 42, maxLength: 42 })
        }),
        async (burnEvent) => {
          await listener.handleBurnedEvent(burnEvent);
          
          const stored = await prisma.activity.findFirst({
            where: { txHash: burnEvent.txHash }
          });
          
          // Verify all fields captured
          expect(stored).toBeDefined();
          expect(stored.metadata.owner).toBe(burnEvent.owner);
          expect(stored.metadata.tokenId).toBe(burnEvent.tokenId.toString());
          expect(stored.txHash).toBe(burnEvent.txHash);
          expect(stored.blockNumber).toBe(burnEvent.blockNumber);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 2: Correct activity type assignment', async () => {
    /**
     * Feature: contract-events-implementation, Property 2
     * For any captured event, the system should store it with 
     * the correct ActivityType enum value.
     */
    
    const eventTypeMapping = [
      { generator: burnEventGen, expectedType: 'BURN_OCCURRED', handler: 'handleBurnedEvent' },
      { generator: airdropEventGen, expectedType: 'AIRDROP_OCCURRED', handler: 'handleAirdroppedEvent' },
      { generator: phaseAddedEventGen, expectedType: 'PHASE_CREATED', handler: 'handlePhaseAddedEvent' }
    ];
    
    for (const mapping of eventTypeMapping) {
      await fc.assert(
        fc.asyncProperty(
          mapping.generator,
          async (event) => {
            await listener[mapping.handler](event);
            
            const stored = await prisma.activity.findFirst({
              where: { txHash: event.txHash }
            });
            
            expect(stored.type).toBe(mapping.expectedType);
          }
        ),
        { numRuns: 100 }
      );
    }
  });
  
  it('Property 5: Error isolation', async () => {
    /**
     * Feature: contract-events-implementation, Property 5
     * For any event handler that encounters an error, the system 
     * should continue processing subsequent events.
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(burnEventGen, { minLength: 5, maxLength: 10 }),
        fc.integer({ min: 0, max: 4 }), // Index of event to corrupt
        async (events, corruptIndex) => {
          // Corrupt one event
          events[corruptIndex].tokenId = null;
          
          // Process all events
          for (const event of events) {
            await listener.handleBurnedEvent(event);
          }
          
          // Verify non-corrupted events were processed
          const validEvents = events.filter((_, i) => i !== corruptIndex);
          for (const validEvent of validEvents) {
            const stored = await prisma.activity.findFirst({
              where: { txHash: validEvent.txHash }
            });
            expect(stored).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Configuration

- **Test Framework**: Jest
- **Property Testing Library**: fast-check
- **Test Database**: Separate test database with automatic cleanup
- **Minimum Property Test Iterations**: 100 runs per property
- **Coverage Target**: 90% code coverage for event handlers

### Testing Phases

1. **Phase 1**: Unit tests for existing Transfer and ContractDeployed handlers
2. **Phase 2**: Property tests for core properties (1, 2, 5)
3. **Phase 3**: Unit tests for new event handlers (by phase)
4. **Phase 4**: Property tests for remaining properties
5. **Phase 5**: Integration tests with mock blockchain events

**Design Rationale**: The dual testing approach ensures both concrete scenarios (unit tests) and general correctness (property tests) are verified. Property-based testing is particularly valuable for event handling systems where many different event combinations can occur, helping catch edge cases that manual test writing might miss.
