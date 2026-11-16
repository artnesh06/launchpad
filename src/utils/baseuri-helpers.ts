/**
 * BaseURI Resolution Helper Functions
 * 
 * Utility functions for generating, resolving, and validating baseURIs
 * for NFT collections (both Standard and Open Edition types).
 * 
 * Requirements: 1.1, 1.2, 3.1, 3.5
 */

/**
 * Collection type enum
 */
export type CollectionType = 'standard' | 'open';

/**
 * Generate temporary baseURI for deployment
 * 
 * For Standard Collections: Returns a temporary placeholder that will be updated
 * after deployment with the actual contract address.
 * 
 * For Open Editions: Returns the direct IPFS URL to the metadata JSON.
 * 
 * @param collectionType - Type of collection ('standard' or 'open')
 * @param ipfsUrl - IPFS URL for Open Edition metadata (optional)
 * @returns Temporary baseURI for deployment
 * 
 * @example
 * // Standard Collection
 * const tempUri = generateTemporaryBaseURI('standard');
 * // Returns: 'ipfs://temporary/'
 * 
 * @example
 * // Open Edition
 * const tempUri = generateTemporaryBaseURI('open', 'ipfs://QmHash123');
 * // Returns: 'ipfs://QmHash123'
 */
export function generateTemporaryBaseURI(
  collectionType: CollectionType,
  ipfsUrl?: string
): string {
  if (collectionType === 'standard') {
    // Standard Collection: Use temporary placeholder
    return 'ipfs://temporary/';
  } else {
    // Open Edition: Use direct IPFS URL
    if (!ipfsUrl) {
      throw new Error('IPFS URL is required for Open Edition collections');
    }
    return ipfsUrl;
  }
}

/**
 * Resolve baseURI with actual contract address
 * 
 * For Standard Collections: Replaces placeholder with actual contract address
 * to create the metadata resolver API URL.
 * 
 * For Open Editions: Returns the direct IPFS URL unchanged.
 * 
 * @param collectionType - Type of collection ('standard' or 'open')
 * @param contractAddress - Deployed contract address (0x...)
 * @param apiBaseUrl - Base URL for the metadata resolver API (for Standard Collections)
 * @param ipfsUrl - Direct IPFS URL (for Open Editions)
 * @returns Resolved baseURI with actual contract address
 * 
 * @example
 * // Standard Collection
 * const resolved = resolveBaseURI(
 *   'standard',
 *   '0x1234567890123456789012345678901234567890',
 *   'https://example.com'
 * );
 * // Returns: 'https://example.com/api/metadata/0x1234567890123456789012345678901234567890/'
 * 
 * @example
 * // Open Edition
 * const resolved = resolveBaseURI(
 *   'open',
 *   '0x1234567890123456789012345678901234567890',
 *   undefined,
 *   'ipfs://QmHash123'
 * );
 * // Returns: 'ipfs://QmHash123'
 */
export function resolveBaseURI(
  collectionType: CollectionType,
  contractAddress: string,
  apiBaseUrl?: string,
  ipfsUrl?: string
): string {
  // Validate contract address format
  if (!isValidContractAddress(contractAddress)) {
    throw new Error(`Invalid contract address format: ${contractAddress}`);
  }

  if (collectionType === 'standard') {
    // Standard Collection: Use metadata resolver API
    if (!apiBaseUrl) {
      throw new Error('API base URL is required for Standard Collection');
    }
    
    // Ensure apiBaseUrl doesn't end with slash
    const cleanBaseUrl = apiBaseUrl.endsWith('/') 
      ? apiBaseUrl.slice(0, -1) 
      : apiBaseUrl;
    
    return `${cleanBaseUrl}/api/metadata/${contractAddress}/`;
  } else {
    // Open Edition: Use direct IPFS URL
    if (!ipfsUrl) {
      throw new Error('IPFS URL is required for Open Edition');
    }
    return ipfsUrl;
  }
}

/**
 * Validate baseURI to check for placeholders
 * 
 * Ensures that the baseURI doesn't contain any placeholder values
 * like "CONTRACT_ADDRESS" or "temporary" that should have been replaced.
 * 
 * @param baseURI - BaseURI to validate
 * @param contractAddress - Expected contract address (optional, for additional validation)
 * @returns true if valid, false if contains placeholders
 * 
 * @example
 * // Valid baseURI
 * validateBaseURI('https://example.com/api/metadata/0x1234.../');
 * // Returns: true
 * 
 * @example
 * // Invalid baseURI with placeholder
 * validateBaseURI('https://example.com/api/metadata/CONTRACT_ADDRESS/');
 * // Returns: false
 * 
 * @example
 * // Invalid baseURI with temporary placeholder
 * validateBaseURI('ipfs://temporary/');
 * // Returns: false
 */
export function validateBaseURI(
  baseURI: string,
  contractAddress?: string
): boolean {
  if (!baseURI || baseURI.trim() === '') {
    return false;
  }

  // Check for placeholder strings
  const placeholders = ['CONTRACT_ADDRESS', 'temporary', 'PLACEHOLDER'];
  const hasPlaceholder = placeholders.some(placeholder => 
    baseURI.toUpperCase().includes(placeholder.toUpperCase())
  );

  if (hasPlaceholder) {
    return false;
  }

  // If contract address is provided, verify it's in the baseURI for Standard Collections
  if (contractAddress && baseURI.includes('/api/metadata/')) {
    // For Standard Collections, the contract address should be in the URL
    if (!baseURI.includes(contractAddress)) {
      return false;
    }
  }

  // Check that baseURI starts with valid protocol
  const validProtocols = ['http://', 'https://', 'ipfs://'];
  const hasValidProtocol = validProtocols.some(protocol => 
    baseURI.startsWith(protocol)
  );

  if (!hasValidProtocol) {
    return false;
  }

  return true;
}

/**
 * Check if baseURI contains placeholder values
 * 
 * @param baseURI - BaseURI to check
 * @returns true if contains placeholder, false otherwise
 * 
 * @example
 * hasPlaceholder('https://example.com/api/metadata/CONTRACT_ADDRESS/');
 * // Returns: true
 * 
 * @example
 * hasPlaceholder('ipfs://temporary/');
 * // Returns: true
 * 
 * @example
 * hasPlaceholder('https://example.com/api/metadata/0x1234.../');
 * // Returns: false
 */
export function hasPlaceholder(baseURI: string): boolean {
  if (!baseURI) {
    return false;
  }

  const placeholders = ['CONTRACT_ADDRESS', 'temporary', 'PLACEHOLDER'];
  return placeholders.some(placeholder => 
    baseURI.toUpperCase().includes(placeholder.toUpperCase())
  );
}

/**
 * Validate Ethereum contract address format
 * 
 * Checks if the address is in valid Ethereum format:
 * - Starts with '0x'
 * - Followed by exactly 40 hexadecimal characters
 * 
 * @param address - Address to validate
 * @returns true if valid Ethereum address format, false otherwise
 * 
 * @example
 * isValidContractAddress('0x1234567890123456789012345678901234567890');
 * // Returns: true
 * 
 * @example
 * isValidContractAddress('0x123'); // Too short
 * // Returns: false
 * 
 * @example
 * isValidContractAddress('1234567890123456789012345678901234567890'); // Missing 0x
 * // Returns: false
 */
export function isValidContractAddress(address: string): boolean {
  if (!address) {
    return false;
  }

  // Must start with 0x and be followed by exactly 40 hex characters
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
}

/**
 * Validate baseURI format
 * 
 * Checks if the baseURI has a valid format:
 * - Starts with http://, https://, or ipfs://
 * - For Standard Collections: should contain /api/metadata/
 * - For Open Editions: should be a direct IPFS URL
 * 
 * @param baseURI - BaseURI to validate
 * @param collectionType - Type of collection (optional, for stricter validation)
 * @returns true if valid format, false otherwise
 * 
 * @example
 * isValidBaseURIFormat('https://example.com/api/metadata/0x1234.../');
 * // Returns: true
 * 
 * @example
 * isValidBaseURIFormat('ipfs://QmHash123');
 * // Returns: true
 * 
 * @example
 * isValidBaseURIFormat('invalid-url');
 * // Returns: false
 */
export function isValidBaseURIFormat(
  baseURI: string,
  collectionType?: CollectionType
): boolean {
  if (!baseURI || baseURI.trim() === '') {
    return false;
  }

  // Check valid protocol
  const validProtocols = ['http://', 'https://', 'ipfs://'];
  const hasValidProtocol = validProtocols.some(protocol => 
    baseURI.startsWith(protocol)
  );

  if (!hasValidProtocol) {
    return false;
  }

  // Type-specific validation
  if (collectionType === 'standard') {
    // Standard Collections should use the metadata resolver API
    return baseURI.includes('/api/metadata/');
  } else if (collectionType === 'open') {
    // Open Editions should use direct IPFS URLs
    return baseURI.startsWith('ipfs://');
  }

  // If no collection type specified, just check protocol
  return true;
}

/**
 * Get API base URL from window location or environment variable
 * 
 * Helper function to get the correct API base URL for metadata resolver.
 * Prioritizes window.location.origin in browser, falls back to env variable.
 * 
 * @returns API base URL
 * 
 * @example
 * // In browser
 * getAPIBaseURL();
 * // Returns: 'https://example.com'
 * 
 * @example
 * // In server-side or when window is not available
 * getAPIBaseURL();
 * // Returns: process.env.NEXT_PUBLIC_BASE_URL or 'http://localhost:3000'
 */
export function getAPIBaseURL(): string {
  // In browser, use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback to environment variable
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

/**
 * Extract contract address from baseURI
 * 
 * Extracts the contract address from a Standard Collection baseURI.
 * Useful for validation and debugging.
 * 
 * @param baseURI - BaseURI containing contract address
 * @returns Contract address or null if not found
 * 
 * @example
 * extractContractAddress('https://example.com/api/metadata/0x1234567890123456789012345678901234567890/');
 * // Returns: '0x1234567890123456789012345678901234567890'
 * 
 * @example
 * extractContractAddress('ipfs://QmHash123');
 * // Returns: null
 */
export function extractContractAddress(baseURI: string): string | null {
  if (!baseURI || !baseURI.includes('/api/metadata/')) {
    return null;
  }

  // Extract address from URL pattern: /api/metadata/{address}/
  const match = baseURI.match(/\/api\/metadata\/(0x[a-fA-F0-9]{40})\//);
  
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Format baseURI for logging
 * 
 * Truncates long baseURIs for cleaner log output while preserving
 * important parts (protocol, contract address, etc.)
 * 
 * @param baseURI - BaseURI to format
 * @param maxLength - Maximum length (default: 80)
 * @returns Formatted baseURI
 * 
 * @example
 * formatBaseURIForLogging('https://very-long-domain-name.com/api/metadata/0x1234567890123456789012345678901234567890/');
 * // Returns: 'https://very-long-domain-name.com/api/metadata/0x1234...7890/'
 */
export function formatBaseURIForLogging(
  baseURI: string,
  maxLength: number = 80
): string {
  if (!baseURI || baseURI.length <= maxLength) {
    return baseURI;
  }

  // Try to preserve contract address if present
  const contractAddress = extractContractAddress(baseURI);
  
  if (contractAddress) {
    // Truncate contract address in the middle
    const truncatedAddress = `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;
    return baseURI.replace(contractAddress, truncatedAddress);
  }

  // Otherwise, just truncate the middle
  const start = baseURI.slice(0, maxLength / 2);
  const end = baseURI.slice(-(maxLength / 2));
  return `${start}...${end}`;
}
