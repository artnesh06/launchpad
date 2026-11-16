import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

const PINATA_GATEWAY = 'https://eu.orbitor.dev';

/**
 * API endpoint untuk konversi IPFS hash ke HTTP URL
 * 
 * GET /api/ipfs/QmXxxx...
 * atau
 * GET /api/ipfs/ipfs://QmXxxx...
 * Cache TTL: 300s (5 minutes) - IPFS content is immutable
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params;

    if (!hash) {
      return NextResponse.json(
        { error: 'IPFS hash diperlukan' },
        { status: 400 }
      );
    }

    // Generate cache key with IPFS hash
    const cacheKey = getCacheKey(`/api/ipfs/${hash}`, {});

    // Wrap IPFS conversion with cache (300s TTL for immutable IPFS content)
    return await cachedFetch(cacheKey, async () => {
      // Jika sudah HTTP URL, redirect ke URL tersebut
      if (hash.startsWith('http://') || hash.startsWith('https://')) {
        return NextResponse.redirect(hash);
      }

      // Remove ipfs:// prefix jika ada
      const cleanHash = hash.replace('ipfs://', '');

      // Build gateway URL
      const httpUrl = `${PINATA_GATEWAY}/ipfs/${cleanHash}`;

      // Return JSON response
      return NextResponse.json({
        success: true,
        ipfsHash: cleanHash,
        httpUrl,
        gateway: PINATA_GATEWAY,
      });
    }, 300); // Cache for 300 seconds (5 minutes) - IPFS content is immutable
  } catch (error) {
    console.error('Error converting IPFS to HTTP:', error);
    return NextResponse.json(
      { error: 'Gagal mengkonversi IPFS hash' },
      { status: 500 }
    );
  }
}
