# Validation and Error Handling Implementation

## Overview

This document describes the implementation of core validation and error handling utilities for the ActivityListener class, completing Task 3 of the contract-events-implementation spec.

## Implementation Date

November 20, 2025

## Requirements Addressed

- **Requirement 15.1**: Error logging with full context
- **Requirement 15.2**: Error isolation - one failing event does not crash the system
- **Requirement 15.4**: Validation before storage

## Components Implemented

### 1. Type Definitions

Added the following interfaces to support error handling:

```typescript
interface ErrorCounter {
  eventType: string;
  count: number;
  lastError: Date;
  threshold: number;
}

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ErrorLogData {
  eventType: string;
  eventData: any;
  error: any;
  severity: ErrorSeverity;
  timestamp: Date;
  chainId: number;
  txHash?: string;
  blockNumber?: number;
}
```

### 2. Error Counter Tracking

Added `errorCounters` Map to the ActivityListener class to track errors per event type:

```typescript
private errorCounters: Map<string, ErrorCounter> = new Map();
```

### 3. Validation Methods

#### validateEventData(event: any, requiredFields: string[]): void

Validates event data by checking:
- Event is not null or undefined
- All required fields are present
- Transaction hash format (0x + 64 hex chars)
- Block number is a positive number
- Ethereum addresses are valid (0x + 40 hex chars)

**Throws**: Error with descriptive message if validation fails

#### isValidTxHash(txHash: string): boolean

Validates Ethereum transaction hash format:
- Must be a string
- Must start with "0x"
- Must be exactly 66 characters (0x + 64 hex)
- Must contain only valid hex characters (0-9, a-f, A-F)

**Returns**: true if valid, false otherwise

#### isValidAddress(address: string): boolean

Validates Ethereum address format:
- Must be a string
- Must start with "0x"
- Must be exactly 42 characters (0x + 40 hex)
- Must contain only valid hex characters (0-9, a-f, A-F)

**Returns**: true if valid, false otherwise

### 4. Deduplication

#### isDuplicateActivity(txHash: string, eventType: ActivityType, launchpadAddress?: string): Promise<boolean>

Checks if an activity has already been recorded in the database:
- Queries by transaction hash and activity type
- Optionally filters by launchpad address
- Returns false on database errors (fail-safe approach)

**Returns**: Promise<boolean> - true if duplicate, false otherwise

### 5. Error Tracking and Alerting

#### incrementErrorCounter(eventType: string): void

Tracks error counts per event type:
- Creates or updates error counter for the event type
- Increments count and updates lastError timestamp
- Triggers admin alert when threshold is reached
- Resets counter after alert is sent

#### sendAdminAlert(alertData): void

Sends critical alerts to administrators:
- Logs alert to console with 🚨 emoji
- Uses centralized error logger with 'critical' severity
- In production, would integrate with notification services (email, Slack, PagerDuty)

#### logEventError(eventType: string, error: any, eventData: any, severity: ErrorSeverity): Promise<void>

Comprehensive error logging with full context:
- Captures error details (message, stack, name)
- Includes event type, data, timestamp, chainId
- Extracts txHash and blockNumber if available
- Uses centralized error logger
- Automatically increments error counter
- Never throws - handles logging failures gracefully

## Error Handling Strategy

### Validation Before Storage (Requirement 15.4)

All event data is validated before any database operations:

1. Check for null/undefined
2. Verify required fields are present
3. Validate data types (numbers, strings)
4. Validate format (transaction hashes, addresses)
5. Only proceed to storage if all validations pass

### Error Isolation (Requirement 15.2)

Errors in one event handler do not affect others:

1. Each event handler wrapped in try-catch
2. Errors logged but not re-thrown
3. Error counters tracked independently per event type
4. System continues processing subsequent events

### Error Logging Completeness (Requirement 15.1)

All errors logged with complete context:

- Event type that failed
- Full event data being processed
- Error details (message, stack trace)
- Severity level
- Timestamp
- Chain ID
- Transaction hash (if available)
- Block number (if available)

## Configuration

The error handling system respects configuration parameters:

- `errorThreshold`: Number of errors before alerting (default: 10)
- `retryAttempts`: Database retry attempts (default: 3)

Example:

```typescript
const config: ActivityListenerConfig = {
  chainId: 1,
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/...',
  factoryAddress: '0x...',
  errorThreshold: 5,  // Alert after 5 errors
  retryAttempts: 3    // Retry database operations 3 times
};
```

## Testing

### Test Coverage

Comprehensive test suite created with 30 test cases covering:

1. **validateEventData** (6 tests)
   - Valid data passes
   - Null/undefined data rejected
   - Missing fields detected
   - Invalid transaction hashes rejected
   - Invalid block numbers rejected
   - Invalid addresses rejected

2. **isValidTxHash** (6 tests)
   - Valid hashes accepted
   - Uppercase letters supported
   - Missing 0x prefix rejected
   - Wrong length rejected
   - Invalid characters rejected
   - Non-string input rejected

3. **isValidAddress** (6 tests)
   - Valid addresses accepted
   - Uppercase letters supported
   - Missing 0x prefix rejected
   - Wrong length rejected
   - Invalid characters rejected
   - Non-string input rejected

4. **incrementErrorCounter** (4 tests)
   - New counter creation
   - Existing counter increment
   - Timestamp updates
   - Threshold reset behavior

5. **logEventError** (3 tests)
   - Error objects handled
   - Non-Error objects handled
   - All severity levels supported

6. **isDuplicateActivity** (2 tests)
   - Returns boolean
   - Handles errors gracefully

7. **Error Isolation** (2 tests)
   - Validation continues after errors
   - Independent error tracking

8. **Configuration** (1 test)
   - Custom thresholds respected

### Test Results

```
✅ Passed: 30
❌ Failed: 0
📈 Total: 30
🎯 Success Rate: 100.00%
```

### Running Tests

Manual test script (no test framework required):

```bash
npx tsx src/test/manual-validation-test.ts
```

Unit test file (requires Jest/Vitest):

```bash
# When test framework is configured
npm test src/test/validation-error-handling.test.ts
```

## Files Modified

1. **src/lib/blockchain/activity-listener.ts**
   - Added type definitions
   - Added errorCounters property
   - Implemented 6 new methods for validation and error handling

## Files Created

1. **src/test/manual-validation-test.ts**
   - Manual test script with 30 test cases
   - Can be run directly with tsx

2. **src/test/validation-error-handling.test.ts**
   - Unit test suite for Jest/Vitest
   - Ready for when test framework is configured

3. **docs/VALIDATION_ERROR_HANDLING_IMPLEMENTATION.md**
   - This documentation file

## Usage Examples

### Validating Event Data

```typescript
// In an event handler
private async handleBurnedEvent(event: BurnedEvent): Promise<void> {
  try {
    // Validate before processing
    this.validateEventData(event, ['owner', 'tokenId', 'txHash', 'blockNumber']);
    
    // Check for duplicates
    const isDuplicate = await this.isDuplicateActivity(
      event.txHash,
      ActivityType.BURN_OCCURRED,
      event.launchpadAddress
    );
    
    if (isDuplicate) {
      console.log('Duplicate event, skipping');
      return;
    }
    
    // Process event...
    
  } catch (error) {
    // Log error with full context
    await this.logEventError('Burned', error, event, 'high');
    // Don't throw - allow other events to process
  }
}
```

### Custom Validation

```typescript
// Validate specific fields
if (!this.isValidTxHash(event.txHash)) {
  throw new Error(`Invalid transaction hash: ${event.txHash}`);
}

if (!this.isValidAddress(event.owner)) {
  throw new Error(`Invalid owner address: ${event.owner}`);
}
```

## Benefits

1. **Robustness**: System continues operating even when individual events fail
2. **Observability**: Complete error context for debugging
3. **Alerting**: Automatic notifications when error thresholds are exceeded
4. **Data Integrity**: Validation prevents invalid data from entering the database
5. **Maintainability**: Centralized error handling logic
6. **Configurability**: Adjustable error thresholds per deployment

## Next Steps

This implementation provides the foundation for Phase 2 event handlers. The validation and error handling utilities will be used by all new event handlers to ensure:

- Data quality
- System resilience
- Complete error visibility
- Proper alerting

## Related Tasks

- ✅ Task 1: Update Prisma schema with new ActivityType enums
- ✅ Task 2: Add event configuration system to ActivityListener
- ✅ Task 3: Implement core validation and error handling utilities (THIS TASK)
- ⏭️ Task 4: Implement Burned event handler (NEXT)
