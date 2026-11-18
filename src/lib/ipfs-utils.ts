/**
 * IPFS Utility Functions with Gateway Racing & Caching
 * Optimized for fastest gateway detection with automatic cancellation
 */

// List of IPFS gateways to test
const IPFS_GATEWAYS = [
  'https://ipfs.filebase.io',
  'https://ipfs.orbitor.dev',
  'https://latam.orbitor.dev',
  'https://apac.orbitor.dev',
  'https://eu.orbitor.dev',
  'https://dget.top',
  'https://flk-ipfs.xyz',
  'https://ipfs.cyou',
  'https://dlunar.net',
  'https://storry.tv',
  'https://ipfs.io',
  'https://dweb.link',
  'https://gateway.pinata.cloud',
  'https://hardbin.com',
  'https://ipfs.runfission.com',
  'https://ipfs.eth.aragon.network',
  'https://4everland.io',
  'https://w3s.link',
  'https://trustless-gateway.link',
  'https://ipfs.ecolatam.com',
];

// Known IPFS gateway patterns to detect
const KNOWN_IPFS_GATEWAY_PATTERNS = [
  /https?:\/\/[^\/]*\.ipfs\.[^\/]+\/ipfs\//i,           // subdomain.ipfs.domain.com/ipfs/
  /https?:\/\/[^\/]*ipfs[^\/]*\.[^\/]+\/ipfs\//i,       // ipfs.domain.com/ipfs/ or domain.ipfs.com/ipfs/
  /https?:\/\/gateway\.pinata\.cloud\/ipfs\//i,         // gateway.pinata.cloud/ipfs/
  /https?:\/\/[^\/]*\.mypinata\.cloud\/ipfs\//i,        // custom.mypinata.cloud/ipfs/
  /https?:\/\/cloudflare-ipfs\.com\/ipfs\//i,           // cloudflare-ipfs.com/ipfs/
  /https?:\/\/[^\/]*\.4everland\.io\/ipfs\//i,          // gateway.4everland.io/ipfs/
  /https?:\/\/dweb\.link\/ipfs\//i,                     // dweb.link/ipfs/
  /https?:\/\/w3s\.link\/ipfs\//i,                      // w3s.link/ipfs/
  /https?:\/\/[^\/]*\.infura-ipfs\.io\/ipfs\//i,        // infura-ipfs.io/ipfs/
  /https?:\/\/[^\/]*\.fleek\.co\/ipfs\//i,              // fleek.co/ipfs/
];

// Cache for fastest gateway
let cachedFastestGateway: string | null = null;
let gatewayTestInProgress = false;
let gatewayTestPromise: Promise<string> | null = null;

// Test image hash (small file for quick testing)
const TEST_HASH = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

/**
 * Extract IPFS hash from URL (including path if present)
 * @param url - URL that might contain IPFS hash
 * @returns IPFS hash with path or null
 */
function extractIpfsHash(url: string): string | null {
  // Check if it's an IPFS gateway URL and extract everything after /ipfs/
  const ipfsMatch = url.match(/\/ipfs\/(.+?)(?:\?|#|$)/);
  if (ipfsMatch && ipfsMatch[1]) {
    return ipfsMatch[1];
  }
  return null;
}

/**
 * Check if URL is an IPFS gateway URL
 * @param url - URL to check
 * @returns true if it's an IPFS gateway URL
 */
function isIpfsGatewayUrl(url: string): boolean {
  const isGateway = KNOWN_IPFS_GATEWAY_PATTERNS.some(pattern => pattern.test(url));
  if (isGateway) {
    console.log(`✅ Detected IPFS gateway URL: ${url}`);
  }
  return isGateway;
}

/**
 * Test a single gateway speed with AbortController
 * @param gateway - Gateway URL to test
 * @param testHash - IPFS hash to test with
 * @param timeout - Timeout in ms
 * @param controller - AbortController for cancellation
 * @returns Response time in ms or throws error
 */
async function testGatewaySpeed(
  gateway: string,
  testHash: string = TEST_HASH,
  timeout: number = 5000,
  controller: AbortController
): Promise<{ gateway: string; responseTime: number }> {
  const startTime = performance.now();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${gateway}/ipfs/${testHash}`, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const responseTime = performance.now() - startTime;
      return { gateway, responseTime };
    }

    throw new Error(`Gateway returned ${response.status}`);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Race multiple gateways and cancel losers
 * @param gateways - List of gateways to race
 * @param testHash - IPFS hash to test with
 * @returns Fastest gateway URL
 */
async function raceGateways(
  gateways: string[],
  testHash: string = TEST_HASH
): Promise<string> {
  console.log(`🏁 Racing ${gateways.length} IPFS gateways...`);

  // Create AbortController for each gateway
  const controllers = gateways.map(() => new AbortController());

  // Start all tests simultaneously
  const racePromises = gateways.map((gateway, index) =>
    testGatewaySpeed(gateway, testHash, 5000, controllers[index])
      .catch((error) => {
        // Return null for failed gateways
        return null;
      })
  );

  // Race all promises - first successful one wins
  const winner = await Promise.race(
    racePromises.map(async (promise, index) => {
      const result = await promise;
      if (result) {
        // Cancel all other requests
        controllers.forEach((controller, i) => {
          if (i !== index) {
            controller.abort();
          }
        });
        return result;
      }
      return null;
    })
  );

  if (winner) {
    console.log(`✅ Winner: ${winner.gateway} (${winner.responseTime.toFixed(0)}ms)`);
    return winner.gateway;
  }

  // If race didn't produce winner, wait for any successful result
  const results = await Promise.allSettled(racePromises);
  const successful = results
    .filter((r): r is PromiseFulfilledResult<{ gateway: string; responseTime: number }> => 
      r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value)
    .sort((a, b) => a.responseTime - b.responseTime);

  if (successful.length > 0) {
    const fastest = successful[0];
    console.log(`✅ Fastest gateway: ${fastest.gateway} (${fastest.responseTime.toFixed(0)}ms)`);
    return fastest.gateway;
  }

  // Fallback to first gateway if all failed
  console.warn('⚠️ All gateways failed, using fallback');
  return gateways[0];
}

/**
 * Find fastest IPFS gateway using progressive racing strategy
 * @param gateways - List of gateways to test
 * @returns Fastest gateway URL
 */
async function findFastestGateway(
  gateways: string[] = IPFS_GATEWAYS
): Promise<string> {
  // Strategy: Race first 8 gateways, if all fail, try remaining
  const firstBatch = gateways.slice(0, 8);
  
  try {
    const winner = await raceGateways(firstBatch);
    return winner;
  } catch (error) {
    console.warn('⚠️ First batch failed, trying remaining gateways...');
    
    // Try remaining gateways
    const remainingBatch = gateways.slice(8);
    if (remainingBatch.length > 0) {
      return await raceGateways(remainingBatch);
    }
    
    // Ultimate fallback
    return gateways[0];
  }
}

/**
 * Get fastest gateway (cached or find new one)
 * @returns Promise<string> - Fastest gateway URL
 */
export async function getFastestGateway(): Promise<string> {
  // Return cached gateway if available
  if (cachedFastestGateway) {
    return cachedFastestGateway;
  }

  // If test is already in progress, wait for it
  if (gatewayTestInProgress && gatewayTestPromise) {
    return gatewayTestPromise;
  }

  // Start new test
  gatewayTestInProgress = true;
  gatewayTestPromise = findFastestGateway().then((gateway) => {
    cachedFastestGateway = gateway;
    gatewayTestInProgress = false;
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ipfs_fastest_gateway', gateway);
        localStorage.setItem('ipfs_gateway_timestamp', Date.now().toString());
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    
    return gateway;
  }).catch((error) => {
    console.error('Gateway test failed:', error);
    gatewayTestInProgress = false;
    // Fallback to first gateway
    cachedFastestGateway = IPFS_GATEWAYS[0];
    return IPFS_GATEWAYS[0];
  });

  return gatewayTestPromise;
}

/**
 * Initialize gateway from cache (call this on app start)
 */
export function initializeGatewayCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const cached = localStorage.getItem('ipfs_fastest_gateway');
    const timestamp = localStorage.getItem('ipfs_gateway_timestamp');
    
    // Cache valid for 6 hours (optimal balance)
    // - Long enough: Avoid frequent re-tests
    // - Short enough: Detect gateway issues within reasonable time
    const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
    const now = Date.now();
    
    if (cached && timestamp) {
      const age = now - parseInt(timestamp);
      if (age < CACHE_DURATION) {
        cachedFastestGateway = cached;
        const ageMinutes = Math.floor(age / 1000 / 60);
        console.log(`📦 Using cached IPFS gateway: ${cached} (age: ${ageMinutes}min)`);
      } else {
        console.log('⏰ Gateway cache expired, will test on next request');
        localStorage.removeItem('ipfs_fastest_gateway');
        localStorage.removeItem('ipfs_gateway_timestamp');
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Force re-test gateways (useful if current gateway becomes slow)
 */
export async function retestGateways(): Promise<string> {
  console.log('🔄 Forcing gateway re-test...');
  cachedFastestGateway = null;
  gatewayTestInProgress = false;
  gatewayTestPromise = null;
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('ipfs_fastest_gateway');
      localStorage.removeItem('ipfs_gateway_timestamp');
    } catch (e) {
      // Ignore
    }
  }
  
  return await getFastestGateway();
}

/**
 * Resolve relative image path with tokenUri
 * Handles cases where image is "./0.png" and tokenUri is "ipfs://CID/0.json"
 * @param imagePath - Image path (can be relative like "./0.png")
 * @param tokenUri - Token URI containing the base IPFS path
 * @returns Resolved IPFS URI or original path
 */
export function resolveImagePath(
  imagePath: string | null | undefined,
  tokenUri: string | null | undefined
): string | null {
  if (!imagePath) return null;

  // If image is already absolute (http/https/ipfs), return as-is
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('ipfs://')
  ) {
    return imagePath;
  }

  // If image is relative (starts with ./ or just filename)
  if (imagePath.startsWith('./') || !imagePath.includes('://')) {
    if (!tokenUri) return imagePath;

    // Extract base path from tokenUri
    // Example: "ipfs://bafybeic.../0.json" -> "ipfs://bafybeic.../"
    const tokenUriWithoutFile = tokenUri.replace(/\/[^\/]+\.json$/, '');
    
    // Remove ./ prefix from image path
    const cleanImagePath = imagePath.replace(/^\.\//, '');
    
    // Combine base path with image filename
    return `${tokenUriWithoutFile}/${cleanImagePath}`;
  }

  return imagePath;
}

/**
 * Convert IPFS URI to HTTP URL
 * @param ipfsUri - IPFS URI (ipfs://Qm... or Qm... or gateway URL)
 * @param gateway - IPFS gateway URL (optional)
 * @returns HTTP URL
 */
export function ipfsToHttp(ipfsUri: string | null | undefined, gateway?: string): string | null {
  if (!ipfsUri) return null;

  // Local assets (/images/...) and data/blob URLs are not IPFS content
  if (ipfsUri.startsWith('/') || ipfsUri.startsWith('data:') || ipfsUri.startsWith('blob:')) return ipfsUri;

  // If already HTTP URL, check if it's an IPFS gateway URL
  if (ipfsUri.startsWith('http://') || ipfsUri.startsWith('https://')) {
    // Check if it's an IPFS gateway URL
    if (isIpfsGatewayUrl(ipfsUri)) {
      // Extract hash and use fastest gateway
      const hash = extractIpfsHash(ipfsUri);
      if (hash) {
        const selectedGateway = gateway || cachedFastestGateway || IPFS_GATEWAYS[0];
        return `${selectedGateway}/ipfs/${hash}`;
      }
    }
    // Not an IPFS URL, return as-is
    return ipfsUri;
  }

  // Remove ipfs:// prefix if present
  const hash = ipfsUri.replace('ipfs://', '');

  // Use provided gateway or cached gateway or fallback
  const selectedGateway = gateway || cachedFastestGateway || IPFS_GATEWAYS[0];

  // Return gateway URL
  return `${selectedGateway}/ipfs/${hash}`;
}

/**
 * Convert IPFS URI to HTTP URL with automatic fastest gateway
 * @param ipfsUri - IPFS URI (ipfs://Qm... or Qm... or gateway URL)
 * @returns Promise<string | null> - HTTP URL
 */
export async function ipfsToHttpOptimized(ipfsUri: string | null | undefined): Promise<string | null> {
  if (!ipfsUri) return null;

  // Get fastest gateway first
  const gateway = await getFastestGateway();

  // If already HTTP URL, check if it's an IPFS gateway URL
  if (ipfsUri.startsWith('http://') || ipfsUri.startsWith('https://')) {
    // Check if it's an IPFS gateway URL
    if (isIpfsGatewayUrl(ipfsUri)) {
      // Extract hash and use fastest gateway
      const hash = extractIpfsHash(ipfsUri);
      if (hash) {
        const optimizedUrl = `${gateway}/ipfs/${hash}`;
        console.log(`🔄 IPFS Gateway Replaced:`);
        console.log(`   From: ${ipfsUri}`);
        console.log(`   To:   ${optimizedUrl}`);
        return optimizedUrl;
      }
    }
    // Not an IPFS URL, return as-is
    return ipfsUri;
  }
  
  // Remove ipfs:// prefix if present
  const hash = ipfsUri.replace('ipfs://', '');

  // Return gateway URL
  return `${gateway}/ipfs/${hash}`;
}

/**
 * Check if string is valid IPFS hash
 * @param str - String to check
 * @returns true if valid IPFS hash
 */
export function isValidIpfsHash(str: string): boolean {
  if (!str) return false;

  // Remove ipfs:// prefix if present
  const hash = str.replace('ipfs://', '');

  // Check if starts with Qm (CIDv0) or b (CIDv1)
  return hash.startsWith('Qm') || hash.startsWith('b');
}

/**
 * Get multiple IPFS gateways for fallback
 * @returns Array of gateway URLs
 */
export function getIpfsGateways(): string[] {
  return [...IPFS_GATEWAYS];
}

/**
 * Convert IPFS URI to HTTP URL with fallback gateways
 * @param ipfsUri - IPFS URI
 * @returns Array of HTTP URLs (primary + fallbacks)
 */
export function ipfsToHttpWithFallbacks(ipfsUri: string | null | undefined): string[] {
  if (!ipfsUri) return [];

  const gateways = getIpfsGateways();
  return gateways.map(gateway => ipfsToHttp(ipfsUri, gateway)).filter(Boolean) as string[];
}

/**
 * Convert IPFS URI to HTTP URL menggunakan API endpoint (untuk client-side)
 * @param ipfsUri - IPFS URI (ipfs://Qm... or Qm...)
 * @returns Promise<string | null> - HTTP URL
 */
export async function ipfsToHttpViaApi(ipfsUri: string | null | undefined): Promise<string | null> {
  if (!ipfsUri) return null;

  // Jika sudah HTTP URL, return as-is
  if (ipfsUri.startsWith('http://') || ipfsUri.startsWith('https://')) {
    return ipfsUri;
  }

  try {
    // Use optimized version with fastest gateway
    return await ipfsToHttpOptimized(ipfsUri);
  } catch (error) {
    console.error('Error in ipfsToHttpViaApi:', error);
    // Fallback ke konversi lokal jika error
    return ipfsToHttp(ipfsUri);
  }
}

/**
 * Fetch image with automatic fallback to other gateways
 * @param ipfsUri - IPFS URI
 * @param onProgress - Optional callback for progress updates
 * @returns Promise<string> - Working HTTP URL
 */
export async function fetchIpfsImageWithFallback(
  ipfsUri: string | null | undefined,
  onProgress?: (gateway: string, attempt: number) => void
): Promise<string | null> {
  if (!ipfsUri) return null;

  // If already HTTP URL, return as-is
  if (ipfsUri.startsWith('http://') || ipfsUri.startsWith('https://')) {
    return ipfsUri;
  }

  const hash = ipfsUri.replace('ipfs://', '');
  
  // Try fastest gateway first
  const fastestGateway = await getFastestGateway();
  const primaryUrl = `${fastestGateway}/ipfs/${hash}`;
  
  try {
    const response = await fetch(primaryUrl, { method: 'HEAD' });
    if (response.ok) {
      return primaryUrl;
    }
  } catch (e) {
    console.warn(`Primary gateway failed: ${fastestGateway}`);
  }

  // Fallback to other gateways
  const gateways = IPFS_GATEWAYS.filter(g => g !== fastestGateway);
  
  for (let i = 0; i < gateways.length; i++) {
    const gateway = gateways[i];
    const url = `${gateway}/ipfs/${hash}`;
    
    onProgress?.(gateway, i + 2);
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        console.log(`✅ Fallback successful: ${gateway}`);
        return url;
      }
    } catch (e) {
      // Continue to next gateway
    }
  }

  // If all failed, return primary URL anyway (let browser handle it)
  return primaryUrl;
}
