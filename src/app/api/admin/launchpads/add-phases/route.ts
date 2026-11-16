import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { ContractService } from '@/lib/contract-service';
import { prisma } from '@/lib/prisma';
import { formatEtherSafe } from '@/lib/format-utils';

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { chainId, contractAddress } = body;

    if (!chainId || !contractAddress) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: chainId, contractAddress'
      }, { status: 400 });
    }

    // Normalize contract address to lowercase to prevent duplicates
    const normalizedContractAddress = contractAddress.toLowerCase();

    // Get launchpad and its phases from database
    const launchpad = await prisma.launchpad.findUnique({
      where: { contractAddress: normalizedContractAddress },
      include: {
        phases: {
          where: { isActive: true },
          orderBy: { phaseIndex: 'asc' } as any  // Order by phaseIndex to match smart contract
        }
      }
    });

    if (!launchpad) {
      return NextResponse.json({
        success: false,
        error: 'Launchpad not found'
      }, { status: 404 });
    }

    if (!launchpad.phases || launchpad.phases.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No phases found for this launchpad'
      }, { status: 400 });
    }

    console.log(`📋 Adding ${launchpad.phases.length} phases to contract ${normalizedContractAddress}`);

    const contractService = new ContractService();
    const results = [];

    // Add each phase to the contract
    for (const phase of launchpad.phases) {
      try {
        const ethers = await import('ethers');
        
        const phaseConfig = {
          name: phase.name,
          description: phase.name, // Use name as description if not available
          startTime: Math.floor(new Date(phase.startTime).getTime() / 1000),
          endTime: phase.endTime ? Math.floor(new Date(phase.endTime).getTime() / 1000) : Math.floor(Date.now() / 1000) + (86400 * 365), // 1 year if no end
          price: phase.price, // Already in ETH format from database
          maxSupply: phase.totalLimit || 10000,
          maxPerWallet: phase.maxMintPerWallet || 10,
          maxPerTransaction: phase.maxMintPerWallet || 10,
          merkleRoot: phase.merkleRoot || '0x0000000000000000000000000000000000000000000000000000000000000000',
          requiresWhitelist: !!phase.merkleRoot,
          paymentType: 0, // ETH
          paymentToken: '0x0000000000000000000000000000000000000000',
          minimumRaise: 0,
          refundEnabled: false
        };

        console.log(`Adding phase: ${phase.name} with price ${phaseConfig.price} ETH`);

        const txHash = await contractService.addMintPhase(
          chainId,
          normalizedContractAddress,
          phaseConfig
        );

        results.push({
          phaseName: phase.name,
          success: true,
          txHash
        });

        console.log(`✅ Phase "${phase.name}" added successfully: ${txHash}`);

        // Wait a bit between transactions
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Failed to add phase "${phase.name}":`, error);
        results.push({
          phaseName: phase.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      message: `Added ${successCount} phases successfully, ${failCount} failed`,
      results
    });

  } catch (error) {
    console.error('Error adding phases to contract:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add phases to contract',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
