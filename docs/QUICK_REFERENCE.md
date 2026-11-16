# WebSocket Optimization - Quick Reference

## 🚀 Quick Start

### Import Hooks
```typescript
import { useDebounce, useThrottle, useBatch } from '@/hooks/useWebSocketOptimization';
```

### Import Config
```typescript
import { getDebounceDelay, getThrottleInterval, getBatchConfig } from '@/config/websocket-optimization';
```

---

## 📋 When to Use What?

| Scenario | Strategy | Hook | Config Key |
|----------|----------|------|------------|
| Stats yang aggregate | Debouncing | `useDebounce` | `trendingUpdates` |
| Live counter | Throttling | `useThrottle` | `totalMinted` |
| Chart updates | Batching | `useBatch` | `mintsChart` |
| Latest value only | None | Direct state | - |
| Activity feed | None | Direct state | - |

---

## 💻 Code Examples

### Debouncing (Stats)
```typescript
const [stats, setStats] = useState(0);
const debouncedStats = useDebounce(stats, getDebounceDelay('statsCounters'));

// Display debounced value
<div>{debouncedStats}</div>
```

### Throttling (Counter)
```typescript
const [count, setCount] = useState(0);
const throttledCount = useThrottle(count, getThrottleInterval('liveCounter'));

// Display throttled value
<div>{throttledCount}</div>
```

### Batching (Chart)
```typescript
const { addToBatch } = useBatch({
  ...getBatchConfig('mintsChart'),
  processor: (batch) => {
    const total = batch.reduce((sum, e) => sum + e.quantity, 0);
    updateChart(total);
  }
});

// Add events to batch
useEffect(() => {
  if (newEvent) addToBatch(newEvent);
}, [newEvent]);
```

---

## ⚙️ Configuration

Edit `src/config/websocket-optimization.ts`:

```typescript
export const optimizationConfig = {
  debounce: {
    trendingUpdates: 500,  // ms
    statsCounters: 500,
    default: 500,
  },
  throttle: {
    totalMinted: 1000,     // ms
    liveCounter: 1000,
    default: 1000,
  },
  batch: {
    mintsChart: {
      maxBatchSize: 10,    // events
      maxWaitTime: 2000,   // ms
    },
  },
};
```

---

## 🎯 Current Implementation

| Component | Hook | Strategy | Config |
|-----------|------|----------|--------|
| `useHomepageSocket` | `trendingUpdates` | Debouncing | 500ms |
| `useLaunchpadSocket` | `totalMinted` | Throttling | 1000ms |
| `useMintsChartSocket` | Chart data | Batching | 10 events / 2s |
| `market-activity-section` | Activities | None | Direct |

---

## 🔍 Debugging

Enable debug logging:
```typescript
// In websocket-optimization.ts
features: {
  debugLogging: true,
}
```

Check console for:
```
[useHomepageSocket] Using debounce delay: 500ms
[useLaunchpadSocket] Using throttle interval: 1000ms
[useMintsChartSocket] Using batch config: size=10, wait=2000ms
```

---

## 📊 Performance Monitoring

```typescript
import { PerformanceMonitor } from '@/config/websocket-optimization';

const monitor = PerformanceMonitor.getInstance();

// Track updates
monitor.track('component-name');

// Get metrics
const metrics = monitor.getMetrics('component-name');
console.log(`Updates per second: ${metrics?.count}`);
```

---

## 🧪 Testing

Run tests:
```bash
npm test useWebSocketOptimization
```

Manual testing:
1. Open browser console
2. Monitor re-render counts
3. Send burst of events
4. Verify update behavior

---

## 📚 Full Documentation

- [Complete Guide](./WEBSOCKET_OPTIMIZATION.md)
- [Implementation Summary](./WEBSOCKET_IMPLEMENTATION_SUMMARY.md)
- [Example Components](../src/components/examples/optimized-stats-display.tsx)

---

## ⚡ Tips

1. **Don't over-optimize**: Measure first, optimize if needed
2. **Activity feeds**: Keep without optimization (users expect all events)
3. **Critical data**: Use throttling (still feels real-time)
4. **Non-critical data**: Use debouncing or batching
5. **Test with burst**: Send 100 events in 1 second to verify
6. **Monitor performance**: Enable logging in development

---

## 🐛 Common Issues

### Issue: Updates too slow
**Solution**: Reduce delay/interval in config

### Issue: Too many re-renders
**Solution**: Increase delay/interval or switch strategy

### Issue: Missing events
**Solution**: Check if strategy is appropriate (don't debounce activity feeds)

### Issue: Memory leak
**Solution**: Verify cleanup in useEffect

---

## 📞 Need Help?

1. Check [WEBSOCKET_OPTIMIZATION.md](./WEBSOCKET_OPTIMIZATION.md)
2. Review [example components](../src/components/examples/optimized-stats-display.tsx)
3. Run tests to verify behavior
4. Enable debug logging
