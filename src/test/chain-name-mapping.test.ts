import { describe, it, expect } from 'vitest';
import { getChainName, SUPPORTED_CHAINS, getSupportedChainIds } from '@/config/chains';

describe('Chain Name Mapping', () => {
  it('should return correct chain name for all supported chains', () => {
    const supportedChainIds = getSupportedChainIds();
    
    supportedChainIds.forEach(chainId => {
      const chainName = getChainName(chainId);
      const expectedName = SUPPORTED_CHAINS[chainId].name;
      
      expect(chainName).toBe(expectedName);
      expect(chainName).not.toBe('Unknown Chain');
    });
  });

  it('should return correct name for MegaETH (6343)', () => {
    const chainName = getChainName(6343);
    expect(chainName).toBe('MegaETH');
  });

  it('should return correct name for Base (8453)', () => {
    const chainName = getChainName(8453);
    expect(chainName).toBe('Base');
  });

  it('should return correct name for Ethereum (1)', () => {
    const chainName = getChainName(1);
    expect(chainName).toBe('Ethereum');
  });

  it('should return correct name for Abstract Testnet (42170)', () => {
    const chainName = getChainName(42170);
    expect(chainName).toBe('Abstract Testnet');
  });

  it('should return correct name for Hyperliquid Testnet (7171)', () => {
    const chainName = getChainName(7171);
    expect(chainName).toBe('Hyperliquid Testnet');
  });

  it('should handle unknown chainId gracefully with fallback', () => {
    const unknownChainId = 99999;
    const chainName = getChainName(unknownChainId);
    
    expect(chainName).toBe(`Unknown Chain (${unknownChainId})`);
    expect(chainName).toContain('Unknown Chain');
    expect(chainName).toContain(unknownChainId.toString());
  });

  it('should handle another unknown chainId', () => {
    const unknownChainId = 12345;
    const chainName = getChainName(unknownChainId);
    
    expect(chainName).toBe(`Unknown Chain (${unknownChainId})`);
  });
});
