import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
/**
 * Admin Collection Configuration API Endpoints
 * 
 * Provides CRUD operations for NFT collection configurations.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { verificationDb } from '@/lib/verification-db';
import { configurationValidator } from '@/lib/verification/configuration-validator';
import type { CollectionConfig } from '@/lib/verification/configuration-validator';

/**
 * GET /api/admin/collections
 * 
 * Retrieves all configured NFT collections.
 * 
 * Requirements: 7.1
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const collections = await verificationDb.verificationNFTCollection.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        chain: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: collections,
    });
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch collections',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/collections
 * 
 * Creates a new NFT collection configuration.
 * Validates all required fields and contract address format.
 * 
 * Requirements: 7.2, 7.3, 7.4, 7.6
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { name, contractAddress, chainId, description } = body;

    // Prepare collection configuration
    const collectionConfig: CollectionConfig = {
      name,
      contractAddress,
      chainId,
      description,
    };

    // Validate collection configuration
    const validation = await configurationValidator.validateCollection(collectionConfig);

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

    // Create collection in database
    const collection = await verificationDb.verificationNFTCollection.create({
      data: {
        name: collectionConfig.name,
        contractAddress: collectionConfig.contractAddress,
        chainId: collectionConfig.chainId,
        description: collectionConfig.description,
      },
      include: {
        chain: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: collection,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create collection:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create collection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
