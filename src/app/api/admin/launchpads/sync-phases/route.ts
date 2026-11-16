import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';
import { getChainConfig } from '@/config/chains';
import OddsLaunchpadABI from '../../../../../../abi/OddsLaunchpad.json';

/**
 * POST /api/admin/launchpads/sync-phases
 * Sync mint phases from contract to database
 */
export async function POST(request: NextRequest) {
  let provider: ethers.JsonRpcProvider | null = null;
  
  try {
    const body = await request.json();
    const { contractAddress, chainId = 11155111 } = body;

    if (!contractAddress) {
      return NextResponse.json(
        { success: false, error: 'Contract address is required' },
        { status: 400 }
      );
    }

    // Normalize contract address to lowercase to prevent duplicates
    const normalizedContractAddress = contractAddress.toLowerCase();

    console.log(`🔄 Syncing phases for contract: ${normalizedContractAddress}`);

    // Find all launchpads with this contract address
    const allLaunchpads = await prisma.launchpad.findMany({
      where: {
        contractAddress: {
          equals: normalizedContractAddress,
          mode: 'insensitive'
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (allLaunchpads.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Launchpad not found in database' },
        { status: 404 }
      );
    }

    // Use the most recent launchpad
    const launchpad = allLaunchpads[0];
    console.log(`📌 Using launchpad ID: ${launchpad.id} (found ${allLaunchpads.length} launchpads with this address)`);

    // If there are duplicates, delete phases from old launchpads
    if (allLaunchpads.length > 1) {
      console.log(`⚠️ Found ${allLaunchpads.length} duplicate launchpads, cleaning up old phases...`);
      const oldLaunchpadIds = allLaunchpads.slice(1).map(l => l.id);
      await prisma.launchpadPhase.deleteMany({
        where: {
          launchpadId: {
            in: oldLaunchpadIds
          }
        }
      });
      console.log(`✅ Deleted phases from ${oldLaunchpadIds.length} old launchpads`);
    }

    // Get chain config and create provider
    const chain = getChainConfig(chainId);
    if (!chain) {
      return NextResponse.json(
        { success: false, error: 'Chain not supported' },
        { status: 400 }
      );
    }

    console.log(`📡 Connecting to RPC: ${chain.rpcUrl}`);
    provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    const contract = new ethers.Contract(normalizedContractAddress, OddsLaunchpadABI, provider);

    // Get phase count
    console.log(`📊 Getting phase count...`);
    const phaseCount = await contract.getMintPhasesCount();
    const count = Number(phaseCount);
    console.log(`📊 Total phases in contract: ${count}`);
    
    // Get each phase
    const contractPhases = [];
    for (let i = 0; i < count; i++) {
      try {
        console.log(`📋 Getting phase ${i}...`);
        const phase = await contract.getMintPhase(i);
        
        // Debug: log raw price value from contract
        console.log(`   Phase ${i} raw price (Wei):`, phase.price.toString());
        
        // Store price in Wei format (as string) to maintain precision
        const priceInWei = phase.price.toString();
        console.log(`   Phase ${i} price stored (Wei):`, priceInWei);
        
        contractPhases.push({
          index: i,
          name: phase.name,
          startTime: Number(phase.startTime),
          endTime: Number(phase.endTime),
          price: priceInWei, // Store as Wei string
          maxSupply: Number(phase.maxSupply),
          maxPerWallet: Number(phase.maxPerWallet),
          maxPerTransaction: Number(phase.maxPerTransaction),
          merkleRoot: phase.merkleRoot,
          isActive: phase.isActive,
          requiresWhitelist: phase.requiresWhitelist,
          currentSupply: Number(phase.currentSupply)
        });
      } catch (error) {
        console.error(`Failed to get phase ${i}:`, error);
      }
    }

    console.log(`📋 Found ${contractPhases.length} phases in contract`);

    // NEW: Validate sequential indices
    const hasGaps = contractPhases.some((phase, idx) => phase.index !== idx);
    if (hasGaps) {
      const phaseDetails = contractPhases.map(p => ({ index: p.index, name: p.name }));
      console.error(`❌ Contract phases have non-sequential indices!`);
      console.error(`   Collection: ${normalizedContractAddress}`);
      console.error(`   Phases:`, phaseDetails);
      
      return NextResponse.json({
        success: false,
        error: 'Contract phases have non-sequential indices',
        details: {
          message: 'Phase indices must be sequential starting from 0 (e.g., 0, 1, 2, 3...)',
          contractAddress: normalizedContractAddress,
          phases: phaseDetails,
          expectedIndices: contractPhases.map((_, idx) => idx),
          actualIndices: contractPhases.map(p => p.index)
        }
      }, { status: 500 });
    }

    // Get total max supply and minted count from contract
    const totalMaxSupply = await contract.totalMaxSupply();
    const currentSupply = await contract.currentSupply();
    console.log(`📊 Total Max Supply: ${totalMaxSupply}, Current Supply: ${currentSupply}`);

    // Update launchpad with correct supply info
    await prisma.launchpad.update({
      where: { id: launchpad.id },
      data: {
        totalMaxSupply: Number(totalMaxSupply),
        mintedCount: Number(currentSupply)
      }
    });
    console.log(`✅ Updated launchpad supply info`);

    // Delete existing phases in database
    await prisma.launchpadPhase.deleteMany({
      where: {
        launchpadId: launchpad.id
      }
    });

    // Insert new phases from contract
    const phasesToCreate = contractPhases.map((phase: any) => ({
      launchpadId: launchpad.id,
      phaseIndex: phase.index,  // Store smart contract phase index
      name: phase.name,
      phaseType: phase.requiresWhitelist ? 'ALLOWLIST' : 'PUBLIC',
      startTime: new Date(phase.startTime * 1000),
      endTime: new Date(phase.endTime * 1000),
      price: phase.price,
      totalLimit: phase.maxSupply,
      maxMintPerWallet: phase.maxPerWallet,
      merkleRoot: phase.merkleRoot,
      isActive: phase.isActive,
      mintedCount: phase.currentSupply || 0
    }));

    console.log(`📝 Creating ${phasesToCreate.length} phases:`, JSON.stringify(phasesToCreate, null, 2));

    await prisma.launchpadPhase.createMany({
      data: phasesToCreate
    });

    console.log(`✅ Synced ${phasesToCreate.length} phases to database`);
    
    // Verify phases were created
    const createdPhases = await prisma.launchpadPhase.findMany({
      where: { launchpadId: launchpad.id },
      orderBy: { phaseIndex: 'asc' }
    });
    console.log(`🔍 Verification: Found ${createdPhases.length} phases in database for launchpad ${launchpad.id}`);

    // NEW: Verify phases have correct sequential indices
    const verificationFailed = createdPhases.some((phase, idx) => 
      phase.phaseIndex !== idx
    );
    
    if (verificationFailed) {
      const phaseDetails = createdPhases.map(p => ({ 
        phaseIndex: p.phaseIndex, 
        name: p.name 
      }));
      console.error(`❌ Phase verification failed after sync!`);
      console.error(`   Collection: ${normalizedContractAddress}`);
      console.error(`   Created phases:`, phaseDetails);
      
      return NextResponse.json({
        success: false,
        error: 'Phase verification failed after sync',
        details: {
          message: 'Database phases do not have sequential indices after sync',
          contractAddress: normalizedContractAddress,
          phases: phaseDetails,
          expectedIndices: createdPhases.map((_, idx) => idx),
          actualIndices: createdPhases.map(p => p.phaseIndex)
        }
      }, { status: 500 });
    }

    console.log(`✅ Verification passed: All phases have correct sequential indices`);

    return NextResponse.json({
      success: true,
      data: {
        phasesSynced: phasesToCreate.length,
        contractAddress: normalizedContractAddress,
        verified: true,
        phases: createdPhases.map(p => ({
          phaseIndex: p.phaseIndex,
          name: p.name,
          phaseType: p.phaseType
        }))
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to sync phases:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync phases'
      },
      { status: 500 }
    );
  } finally {
    // Clean up provider connection
    if (provider) {
      try {
        provider.destroy();
      } catch (e) {
        console.warn('⚠️ Error destroying provider:', e);
      }
    }
  }
}
