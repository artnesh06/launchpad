/**
 * Tests for WebSocket Optimization Hooks
 * 
 * Testing debouncing, throttling, dan batching behavior
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce, useThrottle, useBatch } from '../useWebSocketOptimization';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Update value multiple times quickly
    rerender({ value: 'update1', delay: 500 });
    rerender({ value: 'update2', delay: 500 });
    rerender({ value: 'update3', delay: 500 });

    // Should still be initial (not updated yet)
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should now be the last value
    expect(result.current).toBe('update3');
  });

  it('should reset timer on new value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 0 } }
    );

    // Update at 0ms
    rerender({ value: 1 });
    
    // Advance 400ms (not enough)
    act(() => {
      jest.advanceTimersByTime(400);
    });
    
    // Update again (resets timer)
    rerender({ value: 2 });
    
    // Advance another 400ms (total 800ms, but timer was reset)
    act(() => {
      jest.advanceTimersByTime(400);
    });
    
    // Should still be initial
    expect(result.current).toBe(0);
    
    // Advance final 100ms (500ms since last update)
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Now should be updated
    expect(result.current).toBe(2);
  });
});

describe('useThrottle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should throttle value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 1000),
      { initialProps: { value: 0 } }
    );

    expect(result.current).toBe(0);

    // First update should go through immediately
    rerender({ value: 1 });
    expect(result.current).toBe(1);

    // Subsequent updates within interval should be throttled
    rerender({ value: 2 });
    expect(result.current).toBe(1); // Still 1

    rerender({ value: 3 });
    expect(result.current).toBe(1); // Still 1

    // After interval, should update to latest
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(3);
  });

  it('should allow updates after interval passes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 1000),
      { initialProps: { value: 0 } }
    );

    // Update 1
    rerender({ value: 1 });
    expect(result.current).toBe(1);

    // Wait for interval
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Update 2 (should go through)
    rerender({ value: 2 });
    expect(result.current).toBe(2);

    // Wait for interval
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Update 3 (should go through)
    rerender({ value: 3 });
    expect(result.current).toBe(3);
  });
});

describe('useBatch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should batch items and process after maxWaitTime', () => {
    const processor = jest.fn();
    const { result } = renderHook(() =>
      useBatch({
        maxBatchSize: 10,
        maxWaitTime: 1000,
        processor,
      })
    );

    // Add items
    act(() => {
      result.current.addToBatch('item1');
      result.current.addToBatch('item2');
      result.current.addToBatch('item3');
    });

    // Should not process yet
    expect(processor).not.toHaveBeenCalled();

    // Wait for maxWaitTime
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should process batch
    expect(processor).toHaveBeenCalledTimes(1);
    expect(processor).toHaveBeenCalledWith(['item1', 'item2', 'item3']);
  });

  it('should process immediately when batch is full', () => {
    const processor = jest.fn();
    const { result } = renderHook(() =>
      useBatch({
        maxBatchSize: 3,
        maxWaitTime: 1000,
        processor,
      })
    );

    // Add items up to maxBatchSize
    act(() => {
      result.current.addToBatch('item1');
      result.current.addToBatch('item2');
      result.current.addToBatch('item3'); // This should trigger processing
    });

    // Should process immediately without waiting
    expect(processor).toHaveBeenCalledTimes(1);
    expect(processor).toHaveBeenCalledWith(['item1', 'item2', 'item3']);
  });

  it('should reset timer when adding new items', () => {
    const processor = jest.fn();
    const { result } = renderHook(() =>
      useBatch({
        maxBatchSize: 10,
        maxWaitTime: 1000,
        processor,
      })
    );

    // Add item
    act(() => {
      result.current.addToBatch('item1');
    });

    // Wait 800ms
    act(() => {
      jest.advanceTimersByTime(800);
    });

    // Add another item (resets timer)
    act(() => {
      result.current.addToBatch('item2');
    });

    // Wait another 800ms (total 1600ms, but timer was reset)
    act(() => {
      jest.advanceTimersByTime(800);
    });

    // Should not have processed yet
    expect(processor).not.toHaveBeenCalled();

    // Wait final 200ms (1000ms since last item)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Now should process
    expect(processor).toHaveBeenCalledTimes(1);
    expect(processor).toHaveBeenCalledWith(['item1', 'item2']);
  });

  it('should process remaining items on unmount', () => {
    const processor = jest.fn();
    const { result, unmount } = renderHook(() =>
      useBatch({
        maxBatchSize: 10,
        maxWaitTime: 1000,
        processor,
      })
    );

    // Add items
    act(() => {
      result.current.addToBatch('item1');
      result.current.addToBatch('item2');
    });

    // Unmount before timer fires
    unmount();

    // Should process remaining items
    expect(processor).toHaveBeenCalledTimes(1);
    expect(processor).toHaveBeenCalledWith(['item1', 'item2']);
  });
});

describe('Integration: Multiple strategies', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should work together in a component', () => {
    const processor = jest.fn();
    
    const { result, rerender } = renderHook(
      ({ rawValue }) => {
        const debounced = useDebounce(rawValue, 500);
        const throttled = useThrottle(rawValue, 1000);
        const { addToBatch } = useBatch({
          maxBatchSize: 5,
          maxWaitTime: 1000,
          processor,
        });

        return { debounced, throttled, addToBatch };
      },
      { initialProps: { rawValue: 0 } }
    );

    // Initial state
    expect(result.current.debounced).toBe(0);
    expect(result.current.throttled).toBe(0);

    // Simulate burst of updates
    act(() => {
      for (let i = 1; i <= 10; i++) {
        rerender({ rawValue: i });
        result.current.addToBatch(`event${i}`);
      }
    });

    // Debounced should still be 0 (waiting)
    expect(result.current.debounced).toBe(0);
    
    // Throttled should be 10 (first update went through)
    expect(result.current.throttled).toBe(10);
    
    // Batch should have processed twice (5 items each)
    expect(processor).toHaveBeenCalledTimes(2);

    // Wait for debounce
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Debounced should now be 10
    expect(result.current.debounced).toBe(10);
  });
});
