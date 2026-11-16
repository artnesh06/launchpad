/**
 * Cached JSON-RPC Provider
 * 
 * Extends ethers JsonRpcProvider with client-side caching
 * to reduce redundant RPC calls
 */

import { ethers } from 'ethers';
import { cachedRpcFetch } from './rpc-cache';

/**
 * Custom FetchRequest that uses our caching layer
 */
class CachedFetchRequest extends ethers.FetchRequest {
  async send(): Promise<ethers.FetchResponse> {
    try {
      const response = await cachedRpcFetch(this.url, {
        method: 'POST',
        headers: this.headers as any,
        body: this.body ? new TextDecoder().decode(this.body) : undefined,
      });
      
      const body = await response.arrayBuffer();
      return new ethers.FetchResponse(
        response.status,
        response.statusText,
        Object.fromEntries(response.headers.entries()),
        new Uint8Array(body),
        this
      );
    } catch (error) {
      throw error;
    }
  }
}

/**
 * JSON-RPC Provider with built-in caching
 */
export class CachedJsonRpcProvider extends ethers.JsonRpcProvider {
  constructor(url: string, network?: ethers.Networkish, options?: any) {
    super(url, network, options);
  }

  // Override _send to use cached fetch
  async _send(payload: any): Promise<any> {
    const request = new CachedFetchRequest(this._getConnection().url);
    request.body = JSON.stringify(payload);
    request.setHeader('Content-Type', 'application/json');

    const response = await request.send();
    const result = response.bodyJson;

    return result;
  }
}

/**
 * Create a cached provider instance
 */
export function createCachedProvider(
  url: string,
  network?: ethers.Networkish
): CachedJsonRpcProvider {
  return new CachedJsonRpcProvider(url, network);
}
