import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
/**
 * Admin Chain Configuration API Endpoints (Single Chain)
 * 
 * Provides update and delete operations for specific blockchain network configurations.
 * 
 * Requirements: 6.3, 6.4, 6.5, 6.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { verificationDb } from '@/lib/verification-db';
import { configurationValidator } from '@/lib/verification/configuration-validator';
import type { ChainConfig } from '@/lib/verification/configuration-validator';

/**
 * PUT /api/admin/chains/:id
 * 
 * Updates an existing blockchain network configuration.
 * Validates all fields and tests RPC endpoint connectivity.
 * 
 * Requirements: 6.3, 6.4, 6.6
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { id } = params;
    const body = await request.json();
    const { name, networkId, rpcEndpoint, explorerUrl } = body;

    // Check if chain exists
    const existingChain = await verificationDb.verificationChain.findUnique({
      where: { id },
    });

    if (!existingChain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chain not found',
        },
        { status: 404 }
      );
    }

    // Prepare chain configuration
    const chainConfig: ChainConfig = {
      name,
      networkId,
      rpcEndpoint,
      explorerUrl,
    };

    // Validate chain configuration
    // Note: We need to temporarily exclude the current chain from uniqueness check
    const validation = await configurationValidator.validateChain(chainConfig);

    // Filter out network ID uniqueness error if it's the same chain
    if (!validation.valid) {
      const filteredErrors = validation.errors.filter(error => {
        if (error.includes('Network ID') && error.includes('already in use')) {
          // Check if the network ID belongs to the current chain
          return existingChain.networkId !== networkId;
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

    // Update chain in database
    const updatedChain = await verificationDb.verificationChain.update({
      where: { id },
      data: {
        name: chainConfig.name,
        networkId: chainConfig.networkId,
        rpcEndpoint: chainConfig.rpcEndpoint,
        explorerUrl: chainConfig.explorerUrl,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedChain,
    });
  } catch (error) {
    console.error('Failed to update chain:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update chain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/chains/:id
 * 
 * Deletes a blockchain network configuration.
 * Checks for dependencies (collections) before deletion.
 * 
 * Requirements: 6.5
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { id } = params;

    // Check if chain exists
    const existingChain = await verificationDb.verificationChain.findUnique({
      where: { id },
    });

    if (!existingChain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chain not found',
        },
        { status: 404 }
      );
    }

    // Check for dependencies
    const dependencyCheck = await configurationValidator.checkDependencies('chain', id);

    if (dependencyCheck.hasDependencies) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete chain with dependencies',
          dependencies: dependencyCheck.dependencies,
          message: `This chain is referenced by ${dependencyCheck.dependencies.length} collection(s). Please remove or reassign these collections before deleting the chain.`,
        },
        { status: 409 }
      );
    }

    // Delete chain
    await verificationDb.verificationChain.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Chain deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete chain:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete chain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
