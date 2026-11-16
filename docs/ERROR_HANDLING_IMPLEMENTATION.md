# Error Handling and Retry Logic Implementation

This document describes the comprehensive error handling and retry logic implemented for the real-time market activity feature.

## Overview

The error handling system provides:
- **Exponential backoff retry** for RPC connections
- **Database write retry** (up to 3 attempts)
- **Centralized error logging** with severity levels
- **API error responses** with appropriate HTTP status codes
- **Frontend cached data fallback** for resilience

## Components

### 1. RPC Connection Error Handling

**Location**: `src/lib/blockchain/activity-listener.ts`

**Features**:
- Exponential backoff retry: 1s, 2s, 4s, 8s, 16s (max 30s)
- Maximum 5 retry attempts before giving up
- Connection timeout (10 seconds)
- Automatic provider recreation on retry
- Independent per-chain failure handling

**Implementation**:
```typescript
// Test connection with timeout
await testConnectionWithTimeout(10000);

// Exponential backoff calculation
const delay = Math.min(retryDelay * Math.pow(2, retryCount - 1), 30000);

// Recreate provider on retry
this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
```

**Error Scenarios Handled**:
- RPC endpoint unavailable
- Network timeout
- Invalid RPC response
- Connection dropped during operation

### 2. Database Write Retry Logic

**Location**: `src/lib/blockchain/activity-listener.ts`

**Features**:
- Up to 3 retry attempts for database writes
- Linear backoff: 1s, 2s, 3s
- Detailed error logging on final failure
- Continues processing other events on failure

**Implementation**:
```typescript
private async writeActivityWithRetry(data: any, attempt: number = 1): Promise<void> {
  const maxAttempts = 3;
  const retryDelay = 1000 * attempt;

  try {
    await prisma.activity.create({ data });
  } catch (error) {
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return this.writeActivityWithRetry(data, attempt + 1);
    } else {
      await this.logActivityError('writeActivityWithRetry', error, data);
      throw error;
    }
  }
}
```

**Error Scenarios Handled**:
- Database connection timeout
- Unique constraint violations
- Transaction deadlocks
- Network issues between app and database

### 3. Centralized Error Logger

**Location**: `src/utils/error-logger.ts`

**Features**:
- Severity levels: low, medium, high, critical
- In-memory log storage (last 1000 errors)
- Structured error format with context
- Ready for integration with monitoring services (Sentry, DataDog)
- Statistics and filtering capabilities

**Usage**:
```typescript
import { logError } from '@/utils/error-logger';

logError('context', error, data, 'high');
```

**Severity Guidelines**:
- **Low**: Non-critical issues, informational
- **Medium**: Standard errors that are handled gracefully
- **High**: Connection failures, database errors
- **Critical**: Max retries reached, system-wide failures

**API Endpoint**: `GET /api/activity/errors`
- Query params: `count` (1-200), `stats` (true/false)
- Returns recent error logs or statistics

### 4. API Error Responses

**Location**: `src/app/api/activity/recent/route.ts`

**Features**:
- Appropriate HTTP status codes
- Detailed error messages
- Query timeout protection (5 seconds)
- Input validation with clear error messages

**Status Codes**:
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Chain not found
- `500 Internal Server Error`: Unexpected errors
- `503 Service Unavailable`: Database connection issues
- `504 Gateway Timeout`: Request timeout

**Implementation**:
```typescript
// Query with timeout
const activities = await Promise.race([
  prisma.activity.findMany({ ... }),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Database query timeout')), 5000)
  )
]);

// Categorized error responses
if (error.message.includes('timeout')) {
  statusCode = 504;
} else if (error.message.includes('database')) {
  statusCode = 503;
}
```

### 5. Frontend Error Handling with Cached Data

**Location**: `src/hooks/useActivityFeed.ts`

**Features**:
- Cached data fallback on API failures
- Exponential backoff for retries
- Consecutive error tracking
- User-friendly error messages after 3 failures
- Automatic retry with increasing delays

**Implementation**:
```typescript
// Cache successful responses
cachedActivitiesRef.current = newActivities;

// Use cached data on error
if (cachedActivitiesRef.current.length > 0 && !loading) {
  setActivities(cachedActivitiesRef.current);
  if (consecutiveErrorsRef.current >= 3) {
    setError(`Connection issue (using cached data): ${errorMessage}`);
  }
}

// Exponential backoff for retries
const retryDelay = consecutiveErrorsRef.current >= 3 
  ? ERROR_RETRY_INTERVAL 
  : Math.min(5000 * consecutiveErrorsRef.current, ERROR_RETRY_INTERVAL);
```

**User Experience**:
- First 2 failures: Silent retry, no error shown to user
- 3+ failures: Show error message but continue displaying cached data
- Automatic recovery when API becomes available

## Multi-Chain Error Isolation

**Location**: `src/lib/blockchain/multi-chain-listener-manager.ts`

**Features**:
- Independent error handling per chain
- One chain failure doesn't affect others
- Error state tracking per chain
- Graceful degradation

**Implementation**:
```typescript
// Continue with other chains on failure
try {
  await listener.start();
} catch (startError) {
  // Store listener even if start fails (it will retry internally)
  this.listeners.set(chainId, listener);
  this.errors.set(chainId, errorMsg);
  // Don't throw - allow other chains to continue
}
```

## Monitoring and Observability

### Error Statistics API

**Endpoint**: `GET /api/activity/errors?stats=true`

**Response**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 42,
      "bySeverity": {
        "low": 5,
        "medium": 20,
        "high": 15,
        "critical": 2
      },
      "byContext": {
        "ActivityListener.handleConnectionError": 10,
        "ActivityListener.writeActivityWithRetry": 5
      }
    }
  }
}
```

### Recent Error Logs API

**Endpoint**: `GET /api/activity/errors?count=50`

**Response**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "context": "ActivityListener.handleConnectionError",
        "error": "RPC connection timeout",
        "stack": "...",
        "data": { "chainId": 1, "attempt": 3 },
        "timestamp": "2025-11-05T10:30:00.000Z",
        "severity": "high"
      }
    ]
  }
}
```

## Integration with Monitoring Services

The error logger is designed to integrate with external monitoring services. To enable:

1. **Sentry Integration**:
```typescript
// In src/utils/error-logger.ts
import * as Sentry from '@sentry/nextjs';

private sendToMonitoring(entry: ErrorLogEntry): void {
  Sentry.captureException(new Error(entry.error), {
    contexts: {
      custom: entry
    }
  });
}
```

2. **DataDog Integration**:
```typescript
import { datadogLogs } from '@datadog/browser-logs';

private sendToMonitoring(entry: ErrorLogEntry): void {
  datadogLogs.logger.error(entry.error, entry);
}
```

## Testing Error Handling

### Manual Testing Scenarios

1. **RPC Connection Failure**:
   - Stop RPC endpoint
   - Verify exponential backoff retry
   - Verify max retries behavior

2. **Database Write Failure**:
   - Simulate database connection issue
   - Verify 3 retry attempts
   - Verify error logging

3. **API Timeout**:
   - Simulate slow database query
   - Verify 5-second timeout
   - Verify 504 status code

4. **Frontend Cached Data**:
   - Disconnect from API
   - Verify cached data displayed
   - Verify error message after 3 failures

### Automated Testing

```typescript
// Example test for database retry
test('retries database write up to 3 times', async () => {
  const mockCreate = jest.fn()
    .mockRejectedValueOnce(new Error('Connection failed'))
    .mockRejectedValueOnce(new Error('Connection failed'))
    .mockResolvedValueOnce({ id: '123' });

  await writeActivityWithRetry(data);
  
  expect(mockCreate).toHaveBeenCalledTimes(3);
});
```

## Performance Considerations

- **Memory Usage**: Error logger keeps last 1000 errors (~100KB)
- **Retry Delays**: Total max retry time ~63 seconds (1+2+4+8+16+30)
- **Database Timeout**: 5 seconds prevents long-hanging queries
- **Frontend Polling**: Pauses when tab not visible to save resources

## Best Practices

1. **Always log errors with context**: Include relevant data for debugging
2. **Use appropriate severity levels**: Critical for system-wide issues only
3. **Don't throw errors in event handlers**: Log and continue processing
4. **Provide user-friendly messages**: Hide technical details from users
5. **Monitor error rates**: Set up alerts for high/critical errors

## Future Enhancements

- [ ] Implement circuit breaker pattern for repeated failures
- [ ] Add health check endpoint with error rate metrics
- [ ] Implement automatic alerting for critical errors
- [ ] Add error rate limiting to prevent log flooding
- [ ] Implement error recovery strategies (e.g., fallback RPC endpoints)
- [ ] Add distributed tracing for multi-chain operations

## Related Requirements

This implementation satisfies the following requirements:
- **Requirement 3.4**: API retry after 30 seconds on failure
- **Requirement 4.5**: Event listener error handling and logging
- **Requirement 9.5**: Per-chain independent error handling
