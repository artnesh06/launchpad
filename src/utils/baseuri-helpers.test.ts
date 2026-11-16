import { describe, it, expect } from 'vitest';
import {
  generateTemporaryBaseURI,
  resolveBaseURI,
  validateBaseURI,
  hasPlaceholder,
  isValidContractAddress,
  isValidBaseURIFormat,
  extractContractAddress,
  formatBaseURIForLogging,
  getAPIBaseURL,
  type CollectionType
} from './baseuri-helpers';

describe('BaseURI Helper Functions', () => {
  const validContractAddress = '0x1234567890123456789012345678901234567890';
  const validIpfsUrl = 'ipfs://QmHash123456789';
  const apiBaseUrl = 'https://example.com';

  describe('generateTemporaryBaseURI', () => {
    it('should generate temporary baseURI for standard collection', () => {
      const result = generateTemporaryBaseURI('standard');
      expect(result).toBe('ipfs://temporary/');
    });

    it('should return IPFS URL for open edition', () => {
      const result = generateTemporaryBaseURI('open', validIpfsUrl);
      expect(result).toBe(validIpfsUrl);
    });

    it('should throw error for open edition without IPFS URL', () => {
      expect(() => generateTemporaryBaseURI('open')).toThrow(
        'IPFS URL is required for Open Edition collections'
      );
    });
  });

  describe('resolveBaseURI', () => {
    it('should resolve baseURI for standard collection', () => {
      const result = resolveBaseURI('standard', validContractAddress, apiBaseUrl);
      expect(result).toBe(`${apiBaseUrl}/api/metadata/${validContractAddress}/`);
    });

    it('should handle API base URL with trailing slash', () => {
      const result = resolveBaseURI('standard', validContractAddress, `${apiBaseUrl}/`);
      expect(result).toBe(`${apiBaseUrl}/api/metadata/${validContractAddress}/`);
    });

    it('should return IPFS URL for open edition', () => {
      const result = resolveBaseURI('open', validContractAddress, undefined, validIpfsUrl);
      expect(result).toBe(validIpfsUrl);
    });

    it('should throw error for standard collection without API base URL', () => {
      expect(() => resolveBaseURI('standard', validContractAddress)).toThrow(
        'API base URL is required for Standard Collection'
      );
    });

    it('should throw error for open edition without IPFS URL', () => {
      expect(() => resolveBaseURI('open', validContractAddress)).toThrow(
        'IPFS URL is required for Open Edition'
      );
    });

    it('should throw error for invalid contract address', () => {
      expect(() => resolveBaseURI('standard', 'invalid', apiBaseUrl)).toThrow(
        'Invalid contract address format'
      );
    });
  });

  describe('validateBaseURI', () => {
    it('should validate correct standard collection baseURI', () => {
      const baseURI = `${apiBaseUrl}/api/metadata/${validContractAddress}/`;
      expect(validateBaseURI(baseURI, validContractAddress)).toBe(true);
    });

    it('should validate correct open edition baseURI', () => {
      expect(validateBaseURI(validIpfsUrl)).toBe(true);
    });

    it('should reject empty baseURI', () => {
      expect(validateBaseURI('')).toBe(false);
      expect(validateBaseURI('   ')).toBe(false);
    });

    it('should reject baseURI with CONTRACT_ADDRESS placeholder', () => {
      const baseURI = `${apiBaseUrl}/api/metadata/CONTRACT_ADDRESS/`;
      expect(validateBaseURI(baseURI)).toBe(false);
    });

    it('should reject baseURI with temporary placeholder', () => {
      expect(validateBaseURI('ipfs://temporary/')).toBe(false);
    });

    it('should reject baseURI with PLACEHOLDER text', () => {
      const baseURI = `${apiBaseUrl}/api/metadata/PLACEHOLDER/`;
      expect(validateBaseURI(baseURI)).toBe(false);
    });

    it('should reject baseURI without valid protocol', () => {
      expect(validateBaseURI('invalid-url')).toBe(false);
      expect(validateBaseURI('ftp://example.com')).toBe(false);
    });

    it('should reject baseURI with wrong contract address', () => {
      const wrongAddress = '0x9999999999999999999999999999999999999999';
      const baseURI = `${apiBaseUrl}/api/metadata/${wrongAddress}/`;
      expect(validateBaseURI(baseURI, validContractAddress)).toBe(false);
    });

    it('should be case-insensitive for placeholder detection', () => {
      expect(validateBaseURI('https://example.com/contract_address/')).toBe(false);
      expect(validateBaseURI('ipfs://TEMPORARY/')).toBe(false);
    });
  });

  describe('hasPlaceholder', () => {
    it('should detect CONTRACT_ADDRESS placeholder', () => {
      expect(hasPlaceholder('https://example.com/api/metadata/CONTRACT_ADDRESS/')).toBe(true);
    });

    it('should detect temporary placeholder', () => {
      expect(hasPlaceholder('ipfs://temporary/')).toBe(true);
    });

    it('should detect PLACEHOLDER text', () => {
      expect(hasPlaceholder('https://example.com/PLACEHOLDER/')).toBe(true);
    });

    it('should return false for valid baseURI', () => {
      expect(hasPlaceholder(`${apiBaseUrl}/api/metadata/${validContractAddress}/`)).toBe(false);
      expect(hasPlaceholder(validIpfsUrl)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasPlaceholder('')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(hasPlaceholder('https://example.com/contract_address/')).toBe(true);
      expect(hasPlaceholder('ipfs://TEMPORARY/')).toBe(true);
    });
  });

  describe('isValidContractAddress', () => {
    it('should validate correct Ethereum address', () => {
      expect(isValidContractAddress(validContractAddress)).toBe(true);
    });

    it('should accept lowercase hex characters', () => {
      expect(isValidContractAddress('0xabcdef1234567890abcdef1234567890abcdef12')).toBe(true);
    });

    it('should accept uppercase hex characters', () => {
      expect(isValidContractAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
    });

    it('should accept mixed case hex characters', () => {
      expect(isValidContractAddress('0xAbCdEf1234567890aBcDeF1234567890AbCdEf12')).toBe(true);
    });

    it('should reject address without 0x prefix', () => {
      expect(isValidContractAddress('1234567890123456789012345678901234567890')).toBe(false);
    });

    it('should reject address that is too short', () => {
      expect(isValidContractAddress('0x123')).toBe(false);
    });

    it('should reject address that is too long', () => {
      expect(isValidContractAddress('0x12345678901234567890123456789012345678901')).toBe(false);
    });

    it('should reject address with non-hex characters', () => {
      expect(isValidContractAddress('0x123456789012345678901234567890123456789g')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidContractAddress('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(isValidContractAddress(null as any)).toBe(false);
      expect(isValidContractAddress(undefined as any)).toBe(false);
    });
  });

  describe('isValidBaseURIFormat', () => {
    it('should validate HTTP URL', () => {
      expect(isValidBaseURIFormat('http://example.com/api/metadata/0x123/')).toBe(true);
    });

    it('should validate HTTPS URL', () => {
      expect(isValidBaseURIFormat('https://example.com/api/metadata/0x123/')).toBe(true);
    });

    it('should validate IPFS URL', () => {
      expect(isValidBaseURIFormat('ipfs://QmHash123')).toBe(true);
    });

    it('should reject invalid protocol', () => {
      expect(isValidBaseURIFormat('ftp://example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidBaseURIFormat('')).toBe(false);
      expect(isValidBaseURIFormat('   ')).toBe(false);
    });

    it('should validate standard collection format', () => {
      const baseURI = `${apiBaseUrl}/api/metadata/${validContractAddress}/`;
      expect(isValidBaseURIFormat(baseURI, 'standard')).toBe(true);
    });

    it('should reject standard collection without /api/metadata/', () => {
      expect(isValidBaseURIFormat('https://example.com/other/', 'standard')).toBe(false);
    });

    it('should validate open edition format', () => {
      expect(isValidBaseURIFormat(validIpfsUrl, 'open')).toBe(true);
    });

    it('should reject open edition without ipfs:// protocol', () => {
      expect(isValidBaseURIFormat('https://example.com/metadata.json', 'open')).toBe(false);
    });
  });

  describe('extractContractAddress', () => {
    it('should extract contract address from standard collection baseURI', () => {
      const baseURI = `${apiBaseUrl}/api/metadata/${validContractAddress}/`;
      expect(extractContractAddress(baseURI)).toBe(validContractAddress);
    });

    it('should return null for IPFS URL', () => {
      expect(extractContractAddress(validIpfsUrl)).toBe(null);
    });

    it('should return null for URL without /api/metadata/', () => {
      expect(extractContractAddress('https://example.com/other/')).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(extractContractAddress('')).toBe(null);
    });

    it('should return null for malformed URL', () => {
      expect(extractContractAddress('https://example.com/api/metadata/invalid/')).toBe(null);
    });
  });

  describe('formatBaseURIForLogging', () => {
    it('should not truncate short baseURI', () => {
      const shortURI = 'ipfs://QmHash';
      expect(formatBaseURIForLogging(shortURI)).toBe(shortURI);
    });

    it('should truncate long baseURI with contract address', () => {
      const longURI = `https://very-long-domain-name-example.com/api/metadata/${validContractAddress}/`;
      const result = formatBaseURIForLogging(longURI, 60);
      
      expect(result).toContain('0x1234');
      expect(result).toContain('7890');
      expect(result).toContain('...');
      expect(result.length).toBeLessThan(longURI.length);
    });

    it('should truncate long baseURI without contract address', () => {
      const longURI = 'ipfs://QmVeryLongHashThatExceedsTheMaximumLengthForLoggingPurposes123456789';
      const result = formatBaseURIForLogging(longURI, 40);
      
      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(43); // 40 + '...'
    });

    it('should handle empty string', () => {
      expect(formatBaseURIForLogging('')).toBe('');
    });
  });

  describe('getAPIBaseURL', () => {
    it('should return fallback URL in Node environment', () => {
      // In test environment (Node), window is not defined
      const result = getAPIBaseURL();
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      // Should be either env variable or default
      expect(result).toMatch(/^https?:\/\//);
    });
  });
});
