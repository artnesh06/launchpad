import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { ContractService } from '@/lib/contract-service';

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { chainId } = body;

    if (!chainId) {
      return NextResponse.json({
        success: false,
        error: 'Chain ID is required'
      }, { status: 400 });
    }

    console.log(`📝 Approving OddsLaunchpad template for chain ${chainId}...`);

    const contractService = new ContractService();
    const txHash = await contractService.approveOddsLaunchpadTemplate(chainId);

    if (txHash === 'already-approved') {
      return NextResponse.json({
        success: true,
        message: 'Template already approved with matching bytecode hash',
        alreadyApproved: true
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Template approved successfully',
      txHash,
      alreadyApproved: false
    });

  } catch (error) {
    console.error('Error approving template:', error);
    
    let errorMessage = 'Failed to approve template';
    let errorCode = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('NotAdmin') || error.message.includes('not admin')) {
        errorCode = 'NOT_ADMIN';
        errorMessage = 'Only factory admin can approve templates';
      } else if (error.message.includes('user rejected')) {
        errorCode = 'USER_REJECTED';
        errorMessage = 'Transaction rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorCode = 'INSUFFICIENT_FUNDS';
        errorMessage = 'Insufficient funds for gas';
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorCode,
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get('chainId') || '11155111');

    const contractService = new ContractService();
    
    // Get template address
    const { getChainConfig } = await import('@/config/chains');
    const chainConfig = getChainConfig(chainId);
    
    if (!chainConfig?.oddsTemplateAddress) {
      return NextResponse.json({
        success: false,
        error: 'Template address not configured for this chain'
      }, { status: 404 });
    }

    const templateAddress = chainConfig.oddsTemplateAddress;

    // Check if approved
    const isApproved = await contractService.isTemplateApproved(chainId, templateAddress);
    
    let bytecodeHash = null;
    if (isApproved) {
      bytecodeHash = await contractService.getTemplateBytecodeHash(chainId, templateAddress);
    }

    return NextResponse.json({
      success: true,
      data: {
        chainId,
        templateAddress,
        isApproved,
        bytecodeHash
      }
    });

  } catch (error) {
    console.error('Error checking template approval:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check template approval status'
    }, { status: 500 });
  }
}
