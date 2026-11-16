import { ethers } from 'ethers';

/**
 * Format volume from wei (string) to ETH with proper formatting
 */
export function formatVolume(volumeWei: string | null | undefined, decimals: number = 4): string {
  if (!volumeWei || volumeWei === '0') {
    return '0';
  }

  try {
    const volumeInETH = ethers.formatEther(volumeWei);
    const parsed = parseFloat(volumeInETH);
    
    if (parsed === 0) {
      return '0';
    }
    
    // Format with specified decimals
    return parsed.toFixed(decimals);
  } catch (error) {
    console.error('Error formatting volume:', error);
    return '0';
  }
}

/**
 * Format volume to display with ETH suffix
 */
export function formatVolumeWithUnit(volumeWei: string | null | undefined, decimals: number = 4): string {
  const formatted = formatVolume(volumeWei, decimals);
  return `${formatted} ETH`;
}

/**
 * Format volume to compact notation (K, M, B)
 */
export function formatVolumeCompact(volumeWei: string | null | undefined): string {
  if (!volumeWei || volumeWei === '0') {
    return '0 ETH';
  }

  try {
    const volumeInETH = parseFloat(ethers.formatEther(volumeWei));
    
    if (volumeInETH === 0) {
      return '0 ETH';
    }
    
    if (volumeInETH >= 1_000_000_000) {
      return `${(volumeInETH / 1_000_000_000).toFixed(2)}B ETH`;
    }
    
    if (volumeInETH >= 1_000_000) {
      return `${(volumeInETH / 1_000_000).toFixed(2)}M ETH`;
    }
    
    if (volumeInETH >= 1_000) {
      return `${(volumeInETH / 1_000).toFixed(2)}K ETH`;
    }
    
    return `${volumeInETH.toFixed(4)} ETH`;
  } catch (error) {
    console.error('Error formatting volume:', error);
    return '0 ETH';
  }
}

/**
 * Parse volume from ETH to wei (string)
 */
export function parseVolumeToWei(volumeETH: string | number): string {
  try {
    const volumeStr = typeof volumeETH === 'number' ? volumeETH.toString() : volumeETH;
    return ethers.parseEther(volumeStr).toString();
  } catch (error) {
    console.error('Error parsing volume to wei:', error);
    return '0';
  }
}

/**
 * Compare two volume values (in wei)
 */
export function compareVolumes(volumeA: string, volumeB: string): number {
  try {
    const a = BigInt(volumeA || '0');
    const b = BigInt(volumeB || '0');
    
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  } catch (error) {
    console.error('Error comparing volumes:', error);
    return 0;
  }
}

/**
 * Sort array of items by volume (descending)
 */
export function sortByVolume<T extends { volume?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const volumeA = a.volume || '0';
    const volumeB = b.volume || '0';
    return compareVolumes(volumeB, volumeA); // Descending order
  });
}
