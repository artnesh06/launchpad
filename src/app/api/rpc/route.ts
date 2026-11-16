import { NextRequest, NextResponse } from 'next/server';
import { getRpcUrlByChainId, blockchainConfig } from '@/config/blockchain';

// Build supported chain IDs list from blockchain config
const SUPPORTED_CHAIN_IDS: number[] = [];
Object.values(blockchainConfig).forEach((config) => {
  if (config.mainnet.chainId) SUPPORTED_CHAIN_IDS.push(config.mainnet.chainId);
  if (config.testnet.chainId) SUPPORTED_CHAIN_IDS.push(config.testnet.chainId);
});

// Rate limiting (simple in-memory, consider Redis for production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = parseInt(process.env.RPC_RATE_LIMIT || '100'); // Reduced from 1000 to 100 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// Request logging (only log errors and rate limits to reduce noise)
const ENABLE_DEBUG_LOGGING = process.env.RPC_DEBUG_LOGGING === 'true';

// Simple in-memory cache for RPC responses
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds cache for read-only methods

// Request deduplication - prevent multiple identical requests at the same time
const pendingRequests = new Map<string, Promise<any>>();

function debugLog(message: string, data?: any) {
  if (ENABLE_DEBUG_LOGGING) {
    console.log(`[RPC Proxy] ${message}`, data || '');
  }
}

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  
  // Clean rate limit map
  const rateLimitEntries = Array.from(rateLimitMap.entries());
  for (const [ip, record] of rateLimitEntries) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
  
  // Clean response cache
  const cacheEntries = Array.from(responseCache.entries());
  for (const [key, record] of cacheEntries) {
    if (now - record.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      debugLog('Rate limit exceeded', { ip });
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body - handle empty body gracefully
    let body: any = {};
    
    try {
      const text = await request.text();
      if (text && text.trim().length > 0) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      // If body is empty or invalid, continue with empty object
      // This is common for health checks from wallet providers
    }
    
    // Get chainId from query params or body
    const chainIdParam = request.nextUrl.searchParams.get('chainId');
    const chainId = chainIdParam ? parseInt(chainIdParam) : body.chainId;

    if (!chainId) {
      return NextResponse.json(
        { error: 'Chain ID is required' },
        { status: 400 }
      );
    }

    // Get RPC endpoint for the chain
    const rpcUrl = getRpcUrlByChainId(chainId);
    
    if (!rpcUrl) {
      return NextResponse.json(
        { 
          error: `Unsupported chain ID: ${chainId}`,
          supportedChainIds: SUPPORTED_CHAIN_IDS 
        },
        { status: 400 }
      );
    }

    // Handle empty body (health checks from wallet providers)
    if (!body || Object.keys(body).length === 0) {
      debugLog('Health check request', { chainId });
      // Return a simple success response for health checks
      return NextResponse.json(
        { 
          jsonrpc: '2.0',
          id: 1,
          result: 'ok'
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=10', // Cache health checks for 10 seconds
          },
        }
      );
    }

    debugLog('RPC request', { chainId, method: body.method });

    // Check cache for read-only methods
    const cacheKey = `${chainId}:${body.method}:${JSON.stringify(body.params || [])}`;
    const readOnlyMethods = [
      'eth_blockNumber',
      'eth_getBalance',
      'eth_getCode',
      'eth_call',
      'eth_estimateGas',
      'eth_gasPrice',
      'eth_getBlockByNumber',
      'eth_getBlockByHash',
      'eth_getTransactionByHash',
      'eth_getTransactionReceipt',
      'net_version',
      'eth_chainId',
    ];
    
    if (body.method && readOnlyMethods.includes(body.method)) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        debugLog('Cache hit', { chainId, method: body.method });
        return NextResponse.json(cached.data, {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=5',
            'X-Cache': 'HIT',
          },
        });
      }
      
      // Check if there's already a pending request for this exact call
      const pendingRequest = pendingRequests.get(cacheKey);
      if (pendingRequest) {
        debugLog('Request deduplication', { chainId, method: body.method });
        const data = await pendingRequest;
        return NextResponse.json(data, {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=5',
            'X-Cache': 'DEDUP',
          },
        });
      }
    }

    // Create the fetch promise
    const fetchPromise = (async () => {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return response.json();
    })();

    // Store pending request for deduplication
    if (body.method && readOnlyMethods.includes(body.method)) {
      pendingRequests.set(cacheKey, fetchPromise);
      
      // Clean up pending request after it completes
      fetchPromise.finally(() => {
        pendingRequests.delete(cacheKey);
      });
    }

    // Forward the request to the actual RPC endpoint
    const data = await fetchPromise;

    // Cache read-only methods
    if (body.method && readOnlyMethods.includes(body.method)) {
      responseCache.set(cacheKey, { data, timestamp: Date.now() });
    }

    // Determine cache strategy based on RPC method
    let cacheControl = 'no-store, max-age=0';
    if (body.method && readOnlyMethods.includes(body.method)) {
      cacheControl = 'public, max-age=5'; // Cache for 5 seconds
    }

    // Return the response
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': cacheControl,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    // Only log actual errors, not parsing issues from empty bodies
    if (error instanceof Error && !error.message.includes('JSON')) {
      console.error('RPC Proxy Error:', error);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Support GET for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'RPC Proxy is running',
    supportedChainIds: SUPPORTED_CHAIN_IDS,
    chains: Object.entries(blockchainConfig).map(([name, config]) => ({
      name,
      mainnet: {
        chainId: config.mainnet.chainId,
        name: config.mainnet.name,
      },
      testnet: {
        chainId: config.testnet.chainId,
        name: config.testnet.name,
      },
    })),
  });
}
