import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

interface PriceProvider {
  name: string;
  fetch: (symbol: string, currency: string) => Promise<number>;
  priority: number;
}

/**
 * CoinCap API - Free, unlimited
 */
async function fetchFromCoinCap(symbol: string): Promise<number> {
  const symbolMap: Record<string, string> = {
    ETH: 'ethereum',
    BTC: 'bitcoin',
    USDT: 'tether',
    BNB: 'binance-coin',
    USDC: 'usd-coin',
    SOL: 'solana',
    MATIC: 'polygon',
  };

  const id = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
  const response = await fetch(`https://api.coincap.io/v2/assets/${id}`, {
    next: { revalidate: 30 },
  });

  if (!response.ok) throw new Error('CoinCap API failed');

  const data = await response.json();
  return parseFloat(data.data.priceUsd);
}

/**
 * Binance API - Free, unlimited
 */
async function fetchFromBinance(symbol: string, currency: string): Promise<number> {
  const pair = `${symbol.toUpperCase()}${currency.toUpperCase()}`;
  const response = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
    { next: { revalidate: 30 } }
  );

  if (!response.ok) throw new Error('Binance API failed');

  const data = await response.json();
  return parseFloat(data.price);
}

/**
 * Coinbase API - Free, no key required
 */
async function fetchFromCoinbase(symbol: string, currency: string): Promise<number> {
  const pair = `${symbol.toUpperCase()}-${currency.toUpperCase()}`;
  const response = await fetch(
    `https://api.coinbase.com/v2/prices/${pair}/spot`,
    { next: { revalidate: 30 } }
  );

  if (!response.ok) throw new Error('Coinbase API failed');

  const data = await response.json();
  return parseFloat(data.data.amount);
}

/**
 * Kraken API - Free, public
 */
async function fetchFromKraken(symbol: string, currency: string): Promise<number> {
  const pairMap: Record<string, string> = {
    'ETH-USD': 'ETHUSD',
    'BTC-USD': 'XBTUSD',
    'SOL-USD': 'SOLUSD',
  };

  const pair = pairMap[`${symbol}-${currency}`] || `${symbol}${currency}`;
  const response = await fetch(
    `https://api.kraken.com/0/public/Ticker?pair=${pair}`,
    { next: { revalidate: 30 } }
  );

  if (!response.ok) throw new Error('Kraken API failed');

  const data = await response.json();
  const pairData = Object.values(data.result)[0] as any;
  return parseFloat(pairData.c[0]); // Last trade closed price
}

/**
 * Coinlore API - Completely free
 */
async function fetchFromCoinlore(symbol: string): Promise<number> {
  const idMap: Record<string, string> = {
    ETH: '80',
    BTC: '90',
    USDT: '518',
    BNB: '2710',
    SOL: '48543',
    MATIC: '2496',
  };

  const id = idMap[symbol.toUpperCase()];
  if (!id) throw new Error('Symbol not supported by Coinlore');

  const response = await fetch(`https://api.coinlore.net/api/ticker/?id=${id}`, {
    next: { revalidate: 30 },
  });

  if (!response.ok) throw new Error('Coinlore API failed');

  const data = await response.json();
  return parseFloat(data[0].price_usd);
}

/**
 * CryptoCompare API - Free tier 100k calls/month
 */
async function fetchFromCryptoCompare(
  symbol: string,
  currency: string
): Promise<number> {
  const apiKey = process.env.CRYPTOCOMPARE_API_KEY || '';
  const url = `https://min-api.cryptocompare.com/data/price?fsym=${symbol.toUpperCase()}&tsyms=${currency.toUpperCase()}`;

  const response = await fetch(url, {
    headers: apiKey ? { Authorization: `Apikey ${apiKey}` } : {},
    next: { revalidate: 30 },
  });

  if (!response.ok) throw new Error('CryptoCompare API failed');

  const data = await response.json();
  return parseFloat(data[currency.toUpperCase()]);
}

/**
 * CoinGecko API - Free tier 10-30 calls/minute
 */
async function fetchFromCoinGecko(symbol: string, currency: string): Promise<number> {
  const idMap: Record<string, string> = {
    ETH: 'ethereum',
    BTC: 'bitcoin',
    USDT: 'tether',
    BNB: 'binancecoin',
    USDC: 'usd-coin',
    SOL: 'solana',
    MATIC: 'matic-network',
  };

  const id = idMap[symbol.toUpperCase()] || symbol.toLowerCase();
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${currency.toLowerCase()}`,
    { next: { revalidate: 30 } }
  );

  if (!response.ok) throw new Error('CoinGecko API failed');

  const data = await response.json();
  return parseFloat(data[id][currency.toLowerCase()]);
}

/**
 * Gate.io API - Free, public
 */
async function fetchFromGateIo(symbol: string, currency: string): Promise<number> {
  const pair = `${symbol.toUpperCase()}_${currency.toUpperCase()}`;
  const response = await fetch(
    `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${pair}`,
    { next: { revalidate: 30 } }
  );

  if (!response.ok) throw new Error('Gate.io API failed');

  const data = await response.json();
  return parseFloat(data[0].last);
}

/**
 * All available providers with priority
 */
const providers: PriceProvider[] = [
  {
    name: 'CoinCap',
    fetch: fetchFromCoinCap,
    priority: 1,
  },
  {
    name: 'Binance',
    fetch: fetchFromBinance,
    priority: 2,
  },
  {
    name: 'Coinbase',
    fetch: fetchFromCoinbase,
    priority: 3,
  },
  {
    name: 'Kraken',
    fetch: fetchFromKraken,
    priority: 4,
  },
  {
    name: 'Coinlore',
    fetch: fetchFromCoinlore,
    priority: 5,
  },
  {
    name: 'CryptoCompare',
    fetch: fetchFromCryptoCompare,
    priority: 6,
  },
  {
    name: 'CoinGecko',
    fetch: fetchFromCoinGecko,
    priority: 7,
  },
  {
    name: 'Gate.io',
    fetch: fetchFromGateIo,
    priority: 8,
  },
];

/**
 * Fetch price with fallback mechanism
 */
async function fetchPriceWithFallback(
  symbol: string,
  currency: string
): Promise<{ price: number; source: string }> {
  // Sort providers by priority
  const sortedProviders = [...providers].sort((a, b) => a.priority - b.priority);

  for (const provider of sortedProviders) {
    try {
      console.log(`Trying ${provider.name} for ${symbol}/${currency}...`);
      const price = await provider.fetch(symbol, currency);

      if (price && price > 0) {
        console.log(`✓ ${provider.name} succeeded: $${price}`);
        return { price, source: provider.name };
      }
    } catch (error) {
      console.warn(
        `✗ ${provider.name} failed:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      continue;
    }
  }

  throw new Error('All price providers failed');
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || 'ETH';
    const currency = searchParams.get('currency') || 'USD';

    // Validate inputs
    if (!/^[A-Z]{2,10}$/i.test(symbol)) {
      return NextResponse.json(
        { success: false, error: 'Invalid symbol format' },
        { status: 400 }
      );
    }

    if (!/^[A-Z]{2,10}$/i.test(currency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid currency format' },
        { status: 400 }
      );
    }

    // Generate cache key including currency parameters
    const cacheKey = getCacheKey('/api/crypto-price', {
      symbol,
      currency,
    });

    // Wrap external API call with cache (10 seconds TTL for rate-limit protection)
    return await cachedFetch(cacheKey, async () => {
    const { price, source } = await fetchPriceWithFallback(symbol, currency);

    return NextResponse.json({
      success: true,
      data: {
        price,
        currency,
        source,
        timestamp: Date.now(),
      },
    });
    }, 10); // 10 seconds TTL for external API rate-limit protection
  } catch (error) {
    console.error('Error fetching crypto price:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch price',
      },
      { status: 500 }
    );
  }
}
