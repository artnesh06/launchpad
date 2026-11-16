import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
/**
 * Admin Collection Configuration API Endpoints (Single Collection)
 * 
 * Provides update and delete operations for specific NFT collection configurations.
 * 
 * Requirements: 7.3, 7.4, 7.5, 7.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { verificationDb } from '@/lib/verification-db';
import { configurationValidator } from '@/lib/verification/configuration-validator';
import type { CollectionConfig } from '@/lib/verification/configuration-validator';

/**
 * PUT /api/admin/collections/:id
 * 
 * Updates an existing NFT collection configuration.
 * Validates all fields and contract address format.
 * 
 * Requirements: 7.3, 7.4, 7.6
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { id } = params;
    const body = await request.json();
    const { name, contractAddress, chainId, description } = body;

    // Check if collection exists
    const existingCollection = await verificationDb.verificationNFTCollection.findUnique({
      where: { id },
    });

    if (!existingCollection) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection not found',
        },
        { status: 404 }
      );
    }

    // Prepare collection configuration
    const collectionConfig: CollectionConfig = {
      name,
      contractAddress,
      chainId,
      description,
    };

    // Validate collection configuration
    const validation = await configurationValidator.validateCollection(collectionConfig);

    // Filter out uniqueness error if it's the same collection
    if (!validation.valid) {
      const filteredErrors = validation.errors.filter(error => {
        if (error.includes('already exists on this chain')) {
          // Check if the contract address and chain belong to the current collection
          return !(existingCollection.contractAddress === contractAddress && 
                   existingCollection.chainId === chainId);
        }
        return true;
      });

      if (filteredErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            errors: filteredErrors,
          },
          { status: 400 }
        );
      }
    }

    // Update collection in database
    const updatedCollection = await verificationDb.verificationNFTCollection.update({
      where: { id },
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
      data: updatedCollection,
    });
  } catch (error) {
    console.error('Failed to update collection:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update collection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/collections/:id
 * 
 * Deletes an NFT collection configuration.
 * Checks for dependencies (role rules) before deletion.
 * 
 * Requirements: 7.5
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { id } = params;

    // Check if collection exists
    const existingCollection = await verificationDb.verificationNFTCollection.findUnique({
      where: { id },
    });

    if (!existingCollection) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection not found',
        },
        { status: 404 }
      );
    }

    // Check for dependencies
    const dependencyCheck = await configurationValidator.checkDependencies('collection', id);

    if (dependencyCheck.hasDependencies) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete collection with dependencies',
          dependencies: dependencyCheck.dependencies,
          message: `This collection is referenced by ${dependencyCheck.dependencies.length} role rule(s). Please remove or reassign these role rules before deleting the collection.`,
        },
        { status: 409 }
      );
    }

    // Delete collection
    await verificationDb.verificationNFTCollection.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Collection deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete collection:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete collection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
