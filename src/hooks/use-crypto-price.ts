import { useState, useEffect, useCallback } from 'react';
import { getCryptoPrice, PriceData } from '@/lib/crypto-price-service';

interface UseCryptoPriceOptions {
  symbol?: string;
  currency?: string;
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

interface UseCryptoPriceReturn {
  price: number | null;
  priceData: PriceData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and auto-refresh crypto prices
 */
export function useCryptoPrice({
  symbol = 'ETH',
  currency = 'USD',
  refreshInterval = 60000, // 1 minute default
  enabled = true,
}: UseCryptoPriceOptions = {}): UseCryptoPriceReturn {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getCryptoPrice(symbol, currency);

      if (response.success && response.data) {
        setPriceData(response.data);
      } else {
        setError(response.error || 'Failed to fetch price');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [symbol, currency, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // Auto-refresh
  useEffect(() => {
    if (!enabled || !refreshInterval) return;

    const interval = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrice, refreshInterval, enabled]);

  return {
    price: priceData?.price || null,
    priceData,
    loading,
    error,
    refresh: fetchPrice,
  };
}

/**
 * Hook to fetch multiple crypto prices
 */
export function useMultipleCryptoPrices(
  symbols: string[],
  currency: string = 'USD',
  refreshInterval: number = 60000
) {
  const [prices, setPrices] = useState<Record<string, PriceData | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const results: Record<string, PriceData | null> = {};

      await Promise.all(
        symbols.map(async (symbol) => {
          const response = await getCryptoPrice(symbol, currency);
          results[symbol] = response.success && response.data ? response.data : null;
        })
      );

      setPrices(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [symbols, currency]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval]);

  return {
    prices,
    loading,
    error,
    refresh: fetchPrices,
  };
}
