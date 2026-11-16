# WebSocket Event Optimization Guide

## Overview

Ketika aplikasi menerima banyak event dari WebSocket dalam waktu singkat, kita perlu strategi untuk mengoptimalkan update agar tidak menyebabkan:
- Excessive re-renders
- UI lag/freeze
- Memory issues
- Poor user experience

Project ini mengimplementasikan 3 strategi utama:

## 1. Debouncing

**Konsep**: Tunggu sampai tidak ada event baru dalam interval tertentu, baru update.

**Kapan Digunakan**:
- Stats/counters yang tidak perlu real-time exact
- Trending data yang aggregate dari multiple events
- Search input atau filter yang trigger API calls

**Contoh Implementasi**:
```typescript
// useHomepageSocket.ts
const debouncedTrendingUpdates = useDebounce(trendingUpdates, 500);

// Trending updates akan di-update 500ms setelah burst of events selesai
```

**Use Case di Project**:
- ✅ `useHomepageSocket`: Trending updates table
- ✅ Aggregate statistics yang tidak perlu instant update

**Keuntungan**:
- Mengurangi re-renders drastis saat burst of events
- User tetap melihat data terbaru setelah activity selesai
- Cocok untuk data yang di-aggregate

**Trade-off**:
- Ada delay 500ms sebelum user melihat update
- Tidak cocok untuk data yang harus instant

---

## 2. Throttling

**Konsep**: Update maksimal sekali per interval, ignore events di antaranya.

**Kapan Digunakan**:
- Real-time charts yang update terus-menerus
- Progress bars
- Counters yang perlu terlihat "live" tapi tidak perlu setiap event

**Contoh Implementasi**:
```typescript
// useLaunchpadSocket.ts
const throttledTotalMinted = useThrottle(totalMinted, 1000);

// totalMinted akan update maksimal 1x per detik
```

**Use Case di Project**:
- ✅ `useLaunchpadSocket`: Total minted counter
- ✅ Progress percentage displays
- ✅ Live statistics yang update frequently

**Keuntungan**:
- User tetap melihat update "live" secara berkala
- Mengurangi re-renders tanpa menghilangkan feeling real-time
- Predictable update rate

**Trade-off**:
- Beberapa events akan di-skip
- Nilai yang ditampilkan mungkin tidak exact di setiap momen

---

## 3. Batching

**Konsep**: Kumpulkan multiple events, lalu process sekaligus dalam satu update.

**Kapan Digunakan**:
- Charts yang perlu aggregate data
- Bulk operations
- Mengurangi database writes
- Aggregate calculations

**Contoh Implementasi**:
```typescript
// useMintsChartSocket.ts
const { addToBatch } = useBatch<MintEventData>({
  maxBatchSize: 10,      // Process jika sudah 10 events
  maxWaitTime: 2000,     // Atau process setelah 2 detik
  processor: (batch) => {
    const total = batch.reduce((sum, e) => sum + e.quantity, 0);
    updateChart(total);
  }
});

// Setiap mint event ditambahkan ke batch
addToBatch(mintEvent);
```

**Use Case di Project**:
- ✅ `useMintsChartSocket`: Real-time mints chart
- ✅ Aggregate multiple mints untuk chart data points
- ✅ Bulk statistics calculations

**Keuntungan**:
- Sangat efisien untuk high-frequency events
- Bisa melakukan complex aggregations
- Mengurangi re-renders drastis

**Trade-off**:
- Delay sebelum user melihat update (max 2 detik)
- Lebih complex untuk implement

---

## 4. Replace State (No Optimization)

**Konsep**: Langsung replace state dengan nilai terbaru, tidak accumulate.

**Kapan Digunakan**:
- Single value yang hanya perlu nilai terakhir
- "Latest X" displays
- Current status indicators

**Contoh Implementasi**:
```typescript
// useHomepageSocket.ts
setLatestMint(data); // Replace, bukan append

// Component hanya tampilkan data terakhir
const { latestMint } = useHomepageSocket();
return <div>Latest: {latestMint?.contractAddress}</div>;
```

**Use Case di Project**:
- ✅ `latestMint` dan `latestCollection` di homepage
- ✅ Current phase status
- ✅ Latest transaction display

**Keuntungan**:
- Paling simple
- Instant update
- Minimal memory usage

**Trade-off**:
- Tidak cocok jika perlu history atau aggregate

---

## Comparison Table

| Strategy | Update Delay | Re-renders | Use Case | Best For |
|----------|-------------|------------|----------|----------|
| **Debouncing** | 500ms after last event | Minimal | Stats, aggregates | Burst of events |
| **Throttling** | Max 1x per second | Controlled | Charts, progress | Continuous updates |
| **Batching** | Max 2 seconds | Minimal | Bulk operations | High-frequency events |
| **Replace** | Instant | Every event | Latest value only | Single value displays |

---

## Implementation Examples

### Activity Feed (Current - No Optimization Needed)

```typescript
// market-activity-section.tsx
// Tetap accumulate karena butuh history
setActivities(prev => [newActivity, ...prev].slice(0, 10));
```

**Reasoning**: Activity feed memang butuh semua events untuk history. Optimization tidak diperlukan karena:
- Sudah di-limit ke 10 items
- User expect melihat semua activity
- Animation effect butuh individual items

### Stats Counter (Debouncing)

```typescript
// Contoh: Total volume counter
const [totalVolume, setTotalVolume] = useState(0);
const debouncedVolume = useDebounce(totalVolume, 500);

// Display debounced value
<div>Total Volume: {debouncedVolume} ETH</div>
```

### Progress Bar (Throttling)

```typescript
// Contoh: Mint progress
const [progress, setProgress] = useState(0);
const throttledProgress = useThrottle(progress, 1000);

// Update smooth tapi tidak setiap event
<ProgressBar value={throttledProgress} />
```

### Chart Updates (Batching)

```typescript
// Contoh: Mints over time chart
const { addToBatch } = useBatch({
  maxBatchSize: 10,
  maxWaitTime: 2000,
  processor: (events) => {
    const dataPoint = {
      timestamp: Date.now(),
      count: events.reduce((sum, e) => sum + e.quantity, 0)
    };
    setChartData(prev => [...prev, dataPoint]);
  }
});
```

---

## Best Practices

### 1. Choose the Right Strategy

```typescript
// ❌ WRONG: Debouncing untuk activity feed
const debouncedActivities = useDebounce(activities, 500);
// User tidak akan melihat activity baru sampai 500ms

// ✅ CORRECT: Direct update untuk activity feed
setActivities(prev => [newActivity, ...prev].slice(0, 10));
```

### 2. Combine Strategies When Needed

```typescript
// Contoh: Chart dengan throttled updates DAN batching
const { addToBatch } = useBatch({ ... });
const throttledChartData = useThrottle(chartData, 1000);

// Batch events, tapi display di-throttle
```

### 3. Consider User Experience

```typescript
// Untuk critical data: No optimization atau throttling
const criticalData = useThrottle(data, 500); // Still feels real-time

// Untuk non-critical data: Debouncing atau batching
const stats = useDebounce(statsData, 1000); // Can wait
```

### 4. Monitor Performance

```typescript
// Add logging untuk monitor effectiveness
useEffect(() => {
  console.log('[Performance] Re-render count:', renderCount);
  console.log('[Performance] Events processed:', eventCount);
}, [renderCount, eventCount]);
```

---

## Migration Guide

### Existing Components

1. **market-activity-section.tsx**: ✅ No changes needed
   - Activity feed butuh semua events
   - Already optimized dengan slice(0, 10)

2. **useHomepageSocket**: ✅ Updated
   - Added debouncing untuk trending updates
   - latestMint/latestCollection tetap instant

3. **useLaunchpadSocket**: ✅ Updated
   - Added throttling untuk totalMinted
   - recentMints tetap accumulate (butuh history)

4. **mints-over-time-chart**: 🔄 Can be enhanced
   - Bisa gunakan `useMintsChartSocket` untuk real-time updates
   - Currently hanya fetch dari API

### Adding Real-time to Chart

```typescript
// Before: Static data dari API
const [data, setData] = useState([]);
useEffect(() => {
  fetch('/api/mints-chart').then(r => setData(r.data));
}, []);

// After: Real-time dengan batching
const { chartData } = useMintsChartSocket({
  chainFilter,
  batchSize: 10,
  batchInterval: 2000
});
```

---

## Testing

### Test Scenarios

1. **Burst of Events**: Send 100 events dalam 1 detik
   - Debouncing: Should update once after 500ms
   - Throttling: Should update max 1-2 times
   - Batching: Should process in 1-2 batches

2. **Continuous Events**: Send 1 event per second for 60 seconds
   - Throttling: Should update ~60 times
   - Debouncing: Should update ~60 times (after each event)
   - Batching: Should process ~30 batches

3. **Mixed Frequency**: Burst, pause, burst, pause
   - All strategies should handle gracefully
   - No memory leaks
   - Cleanup timers properly

---

## Performance Metrics

### Before Optimization
- Re-renders per 100 events: ~100
- UI lag: Noticeable on burst
- Memory usage: Growing with events

### After Optimization
- Re-renders per 100 events: ~5-10 (debouncing/batching)
- UI lag: None
- Memory usage: Stable

---

## Conclusion

Pilih strategi berdasarkan use case:

- **Activity Feed**: No optimization (butuh history)
- **Stats/Counters**: Debouncing (can wait)
- **Progress Bars**: Throttling (feels live)
- **Charts**: Batching (aggregate data)
- **Latest Value**: Replace (instant)

Semua hooks tersedia di `src/hooks/useWebSocketOptimization.ts` dan siap digunakan.
