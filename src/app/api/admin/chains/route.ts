import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
/**
 * Admin Chain Configuration API Endpoints
 * 
 * Provides CRUD operations for blockchain network configurations.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { verificationDb } from '@/lib/verification-db';
import { configurationValidator } from '@/lib/verification/configuration-validator';
import type { ChainConfig } from '@/lib/verification/configuration-validator';

/**
 * GET /api/admin/chains
 * 
 * Retrieves all configured blockchain networks.
 * 
 * Requirements: 6.1
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const chains = await verificationDb.verificationChain.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: chains,
    });
  } catch (error) {
    console.error('Failed to fetch chains:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch chains',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/chains
 * 
 * Creates a new blockchain network configuration.
 * Validates all required fields and tests RPC endpoint connectivity.
 * 
 * Requirements: 6.2, 6.3, 6.4, 6.6
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { name, networkId, rpcEndpoint, explorerUrl } = body;

    // Prepare chain configuration
    const chainConfig: ChainConfig = {
      name,
      networkId,
      rpcEndpoint,
      explorerUrl,
    };

    // Validate chain configuration
    const validation = await configurationValidator.validateChain(chainConfig);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Create chain in database
    const chain = await verificationDb.verificationChain.create({
      data: {
        name: chainConfig.name,
        networkId: chainConfig.networkId,
        rpcEndpoint: chainConfig.rpcEndpoint,
        explorerUrl: chainConfig.explorerUrl,
      },
    });

    return NextResponse.json({
      success: true,
      data: chain,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create chain:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create chain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
