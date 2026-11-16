/**
 * Crypto Price Service
 * Fetches cryptocurrency prices with multiple fallback providers
 */

export interface PriceData {
  price: number;
  currency: string;
  source: string;
  timestamp: number;
}

export interface PriceResponse {
  success: boolean;
  data?: PriceData;
  error?: string;
}

/**
 * Fetch crypto price from backend API
 * Backend will handle multiple providers with fallback
 */
export async function getCryptoPrice(
  symbol: string = 'ETH',
  currency: string = 'USD'
): Promise<PriceResponse> {
  try {
    const response = await fetch(
      `/api/crypto-price?symbol=${symbol}&currency=${currency}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Cache for 30 seconds to reduce API calls
        next: { revalidate: 30 },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PriceResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch multiple crypto prices at once
 */
export async function getMultipleCryptoPrices(
  symbols: string[],
  currency: string = 'USD'
): Promise<Record<string, PriceData | null>> {
  const results: Record<string, PriceData | null> = {};

  await Promise.all(
    symbols.map(async (symbol) => {
      const response = await getCryptoPrice(symbol, currency);
      results[symbol] = response.success && response.data ? response.data : null;
    })
  );

  return results;
}

/**
 * Format price with proper decimals
 */
export function formatCryptoPrice(price: number, decimals: number = 2): string {
  if (price >= 1) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  // For prices < 1, show more decimals
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}
