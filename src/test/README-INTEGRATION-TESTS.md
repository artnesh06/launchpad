# API Integration Tests

This directory contains comprehensive integration tests for the NFT Launchpad platform API endpoints.

## Test Coverage

### 1. GET /api/admin/launchpads - contractAddress parameter

Tests the contractAddress query parameter support added to the Launchpads API.

**Test Cases:**
- ✅ Returns matching launchpad when valid contractAddress is provided
- ✅ Returns empty array when contractAddress not found
- ✅ Prioritizes contractAddress over chainId when both are provided
- ✅ Falls back to chainId filtering when contractAddress not provided

**Requirements Covered:** 1.1, 1.2, 5.1, 5.2, 5.3

### 2. POST /api/admin/launchpads/save - Activity creation

Tests the activity logging functionality when creating or updating launchpads.

**Test Cases:**
- ✅ Creates activity record for new launchpad
- ✅ Does not create duplicate activity for existing launchpad updates
- ✅ Includes correct factoryId in activity record
- ✅ Activity metadata includes contractAddress, totalMaxSupply, and phasesCount

**Requirements Covered:** 2.1, 2.2, 2.3, 2.4, 2.5

## Test Files

### `api-integration.test.ts`
Comprehensive integration test suite with proper test framework structure. This file is ready for use with Jest, Vitest, or other test frameworks.

**Features:**
- Full test suite with describe/test blocks
- Proper setup and teardown (beforeAll, afterAll, beforeEach, afterEach)
- Type-safe test assertions
- Database cleanup utilities
- Test data factories

### `run-integration-tests.ts`
Standalone test runner that can be executed without a test framework.

**Features:**
- Manual test execution
- Custom assertion helpers
- Detailed test output with pass/fail indicators
- Test summary with success rate
- Exit codes for CI/CD integration

## Running the Tests

### Option 1: Standalone Test Runner (Recommended)

Run the tests directly using tsx:

```bash
npx tsx src/test/run-integration-tests.ts
```

This will:
1. Execute all integration tests
2. Display real-time pass/fail status
3. Show a summary with success rate
4. Exit with code 0 (success) or 1 (failure)

### Option 2: With Test Framework

If you have Jest or Vitest configured:

```bash
# With Jest
npm test src/test/api-integration.test.ts

# With Vitest
npx vitest run src/test/api-integration.test.ts
```

## Test Data

The tests use the following test data:

- **Test Contract Address:** `0xTestIntegration1234567890123456789012345678`
- **Invalid Contract Address:** `0xInvalidAddress1234567890123456789012345678`
- **Test Chain ID:** 6343 (MegaETH Testnet V2)

All test data is automatically cleaned up after tests complete.

## Database Requirements

The tests require:
- PostgreSQL database connection (configured via DATABASE_URL)
- Prisma client initialized
- Database schema migrated

The tests will:
- Create temporary test data
- Clean up all test data after completion
- Not interfere with existing production data

## Test Results

### Latest Test Run

```
🧪 Running API Integration Tests

============================================================
✅ PASS: GET /api/admin/launchpads with valid contractAddress
✅ PASS: GET /api/admin/launchpads with invalid contractAddress
✅ PASS: GET /api/admin/launchpads prioritizes contractAddress
✅ PASS: POST /api/admin/launchpads/save creates activity
✅ PASS: POST /api/admin/launchpads/save no duplicate activity
✅ PASS: POST /api/admin/launchpads/save includes factoryId

============================================================

📊 Test Summary:
   Total: 6
   ✅ Passed: 6
   ❌ Failed: 0
   Success Rate: 100.0%

🎉 All tests passed!
```

## CI/CD Integration

The test runner returns appropriate exit codes:
- `0` - All tests passed
- `1` - One or more tests failed or error occurred

Example GitHub Actions workflow:

```yaml
- name: Run Integration Tests
  run: npx tsx src/test/run-integration-tests.ts
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Troubleshooting

### Database Connection Issues

If you see database connection errors:
1. Verify DATABASE_URL is set in `.env`
2. Ensure PostgreSQL is running
3. Run `npx prisma generate` to update Prisma client

### Test Data Cleanup Issues

If tests fail due to existing test data:
1. Manually clean up test data:
   ```sql
   DELETE FROM activities WHERE tx_hash = '0xTestIntegrationTxHash1234567890123456789';
   DELETE FROM launchpads WHERE contract_address = '0xTestIntegration1234567890123456789012345678';
   ```

### Factory Not Found

If tests fail with "Factory not found":
1. The test will automatically create a test factory
2. Ensure the factory table has proper constraints
3. Check that chainId 6343 is configured in your chains table

## Adding New Tests

To add new integration tests:

1. Add test case to `api-integration.test.ts`:
   ```typescript
   test('should do something', async () => {
     // Test implementation
   });
   ```

2. Add test to `run-integration-tests.ts`:
   ```typescript
   await runTest('Test name', async () => {
     // Test implementation
   });
   ```

3. Update this README with the new test case

## Related Documentation

- [Requirements Document](../../.kiro/specs/integration-fixes/requirements.md)
- [Design Document](../../.kiro/specs/integration-fixes/design.md)
- [Implementation Tasks](../../.kiro/specs/integration-fixes/tasks.md)
