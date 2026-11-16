import { ethers } from 'ethers';
import { getChainConfig, getRpcUrl, getFactoryAddress, type NetworkType } from '@/config/blockchain';

/**
 * Membuat provider untuk chain tertentu
 */
export function createProvider(chain: string, network: NetworkType = 'testnet') {
  const rpcUrl = getRpcUrl(chain, network);
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Membuat contract instance
 */
export function createFactoryContract(
  chain: string,
  network: NetworkType = 'testnet',
  abi: any[]
) {
  const provider = createProvider(chain, network);
  const factoryAddress = getFactoryAddress(chain, network);
  return new ethers.Contract(factoryAddress, abi, provider);
}

/**
 * Mendapatkan informasi lengkap chain
 */
export function getChainInfo(chain: string, network: NetworkType = 'testnet') {
  const config = getChainConfig(chain, network);
  return {
    ...config,
    chain,
    network,
  };
}

/**
 * Validasi apakah chain dan network valid
 */
export function isValidChainNetwork(chain: string, network: string): boolean {
  try {
    getChainConfig(chain, network as NetworkType);
    return true;
  } catch {
    return false;
  }
}
