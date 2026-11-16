# Async Mint Sync dengan Retry Mechanism

## Overview
Implementasi async processing dan retry mechanism untuk sync mint transaction, mengatasi masalah "Transaction not found or not confirmed yet".

## Problem
- Endpoint `/api/admin/launchpads/sync-mint-tx` gagal ketika transaksi belum dikonfirmasi di blockchain
- Tidak ada retry mechanism
- Blocking request yang membuat UX buruk saat transaksi lambat

## Solution

### 1. Retry Mechanism di Sync Endpoint
**File**: `src/app/api/admin/launchpads/sync-mint-tx/route.ts`

Menambahkan retry logic dengan exponential backoff:
- Max 5 retries
- Base delay: 2 detik
- Exponential backoff: 2s, 4s, 8s, 16s, 32s
- Total max wait time: ~62 detik

```typescript
// Retry mechanism for getting transaction (with exponential backoff)
let tx = null;
let receipt = null;
const maxRetries = 5;
const baseDelay = 2000; // 2 seconds

for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    tx = await provider.getTransaction(txHash);
    receipt = await provider.getTransactionReceipt(txHash);

    if (tx && receipt) {
      console.log(`✅ Transaction found on attempt ${attempt + 1}`);
      break;
    }

    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
      console.log(`⏳ Transaction not confirmed yet, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  } catch (error) {
    console.warn(`⚠️ Error fetching transaction on attempt ${attempt + 1}:`, error);
    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 2. Async Endpoint dengan Job Queue
**File**: `src/app/api/admin/launchpads/sync-mint-tx-async/route.ts`

Endpoint baru untuk async processing:

#### POST `/api/admin/launchpads/sync-mint-tx-async`
Queue sync job dan return immediately:

**Request**:
```json
{
  "launchpadId": "string",
  "contractAddress": "string",
  "chainId": number,
  "txHash": "string"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Sync job queued successfully",
  "jobId": "0x...",
  "status": "pending",
  "checkStatusUrl": "/api/admin/launchpads/sync-mint-tx-async/status?txHash=0x..."
}
```

#### GET `/api/admin/launchpads/sync-mint-tx-async?txHash=0x...`
Check job status:

**Response (Processing)**:
```json
{
  "success": true,
  "jobId": "0x...",
  "status": "processing"
}
```

**Response (Completed)**:
```json
{
  "success": true,
  "jobId": "0x...",
  "status": "completed",
  "result": {
    "success": true,
    "data": {
      "totalMinted": 10,
      "mintedNFTs": 1,
      "tokenIds": [5],
      "txHash": "0x...",
      ...
    }
  }
}
```

**Response (Failed)**:
```json
{
  "success": true,
  "jobId": "0x...",
  "status": "failed",
  "error": "Transaction not found or not confirmed yet after retries"
}
```

### 3. Frontend Polling Implementation
**File**: `src/app/(package)/l/[id]/page.tsx`

Frontend menggunakan polling untuk check status:

```typescript
// 1. Queue the job
const queueResponse = await fetch('/api/admin/launchpads/sync-mint-tx-async', {
  method: 'POST',
  body: JSON.stringify({ launchpadId, contractAddress, chainId, txHash })
});

// 2. Poll for status every 2 seconds (max 30 seconds)
const pollStatus = async () => {
  const statusResponse = await fetch(`/api/admin/launchpads/sync-mint-tx-async?txHash=${txHash}`);
  const statusResult = await statusResponse.json();

  if (statusResult.status === 'completed') {
    // Update UI with result
  } else if (statusResult.status === 'failed') {
    // Handle error
  } else {
    // Still processing, poll again
    setTimeout(pollStatus, 2000);
  }
};
```

## Benefits

### 1. Non-Blocking UX
- User tidak perlu menunggu lama
- Request return immediately
- Background processing

### 2. Automatic Retry
- Retry otomatis dengan exponential backoff
- Mengatasi transaksi yang lambat dikonfirmasi
- Max 5 retries dengan total ~62 detik wait time

### 3. Better Error Handling
- Clear error messages
- Fallback ke full data fetch jika gagal
- Tidak ada data loss

### 4. Scalable
- Job queue dapat di-extend untuk multiple jobs
- Easy to add job persistence (Redis, database)
- Can be moved to background worker

## Flow Diagram

```
User Mints NFT
     ↓
Frontend calls /sync-mint-tx-async (POST)
     ↓
Backend queues job & returns immediately
     ↓
Frontend starts polling /sync-mint-tx-async (GET)
     ↓
Backend processes job in background
     ├─ Retry 1: Wait 2s
     ├─ Retry 2: Wait 4s
     ├─ Retry 3: Wait 8s
     ├─ Retry 4: Wait 16s
     └─ Retry 5: Wait 32s
     ↓
Job completes (success/failed)
     ↓
Frontend receives result via polling
     ↓
Update UI with new data
```

## Configuration

### Retry Settings
```typescript
const maxRetries = 5;           // Max retry attempts
const baseDelay = 2000;         // Base delay in ms
// Exponential backoff: 2s, 4s, 8s, 16s, 32s
```

### Polling Settings
```typescript
const maxPolls = 15;            // Max 30 seconds
const pollInterval = 2000;      // Poll every 2 seconds
```

### Job Cleanup
```typescript
// Jobs are cleaned up after 5 minutes
setTimeout(() => {
  syncQueue.delete(txHash);
}, 5 * 60 * 1000);
```

## Future Improvements

1. **Persistent Queue**: Use Redis or database for job queue
2. **Background Worker**: Move processing to separate worker process
3. **Webhook**: Add webhook support for job completion
4. **Rate Limiting**: Add rate limiting for sync requests
5. **Job Priority**: Add priority queue for important jobs
6. **Monitoring**: Add metrics and monitoring for job processing

## Testing

### Test Slow Transaction
```bash
# Mint NFT on testnet with low gas
# Transaction will take longer to confirm
# Verify retry mechanism works
```

### Test Async Endpoint
```bash
# 1. Queue job
curl -X POST http://localhost:3004/api/admin/launchpads/sync-mint-tx-async \
  -H "Content-Type: application/json" \
  -d '{"launchpadId":"...","contractAddress":"...","chainId":11155111,"txHash":"0x..."}'

# 2. Check status
curl http://localhost:3004/api/admin/launchpads/sync-mint-tx-async?txHash=0x...
```

## Migration Guide

### Option 1: Use Async Endpoint (Recommended)
```typescript
// Old
await fetch('/api/admin/launchpads/sync-mint-tx', { ... });

// New
await fetch('/api/admin/launchpads/sync-mint-tx-async', { ... });
// Then poll for status
```

### Option 2: Keep Sync Endpoint
The original endpoint now has retry mechanism built-in, so it will work better for slow transactions.

## Summary

✅ **Retry mechanism** dengan exponential backoff (5 retries, ~62s total)  
✅ **Async processing** dengan job queue  
✅ **Polling** untuk check status (max 30s)  
✅ **Better UX** - non-blocking requests  
✅ **Fallback** ke full data fetch jika gagal  
✅ **Auto cleanup** jobs setelah 5 menit
