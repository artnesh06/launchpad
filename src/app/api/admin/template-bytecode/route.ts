import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';
import OddsLaunchpadArtifact from '../../../../../abi/OddsLaunchpadArtifact.json';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { chainId } = body;

    console.log('📡 Template bytecode API called with chainId:', chainId);

    if (!chainId) {
      return NextResponse.json({ error: 'chainId is required' }, { status: 400 });
    }

    // Generate cache key including chainId (bytecode is static per chain)
    const cacheKey = getCacheKey('/api/admin/template-bytecode', {
      chainId: chainId.toString(),
    });

    // Wrap bytecode fetch with cache (300 seconds TTL for static bytecode)
    return await cachedFetch(cacheKey, async () => {

    const bytecode = (OddsLaunchpadArtifact as any).bytecode;

    if (!bytecode) {
      console.error('❌ Bytecode not found in artifact');
      return NextResponse.json({ error: 'Bytecode not found in artifact' }, { status: 500 });
    }

    console.log('✅ Returning bytecode, length:', bytecode.length);

    return NextResponse.json({
      success: true,
      bytecode,
      bytecodeLength: bytecode.length
    });
    }, 300); // 300 seconds TTL for static bytecode
  } catch (error) {
    console.error('❌ Error in template-bytecode API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch bytecode',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
