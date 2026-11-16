import { NextRequest, NextResponse } from 'next/server';
import { BlockchainService } from '@/lib/blockchain/blockchain-service';
import { prisma } from '@/lib/prisma';

const contractService = new BlockchainService();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { chainId, contractAddress } = body;

        if (!chainId || !contractAddress) {
            return NextResponse.json({
                success: false,
                error: 'Chain ID and contract address are required'
            }, { status: 400 });
        }

        // Normalize contract address to lowercase to prevent duplicates
        const normalizedContractAddress = contractAddress.toLowerCase();

        console.log(`🔄 Syncing single launchpad: ${normalizedContractAddress} on chain ${chainId}`);

        // Get launchpad data from blockchain
        const launchpadData = await contractService.getLaunchpadInfo(chainId, normalizedContractAddress);

        if (!launchpadData) {
            return NextResponse.json({
                success: false,
                error: `No data found for ${contractAddress}`
            }, { status: 404 });
        }

        // Find factory for this chain
        const factory = await prisma.launchpadFactory.findFirst({
            where: { chainId }
        });

        if (!factory) {
            return NextResponse.json({
                success: false,
                error: `Factory not found for chain ${chainId}`
            }, { status: 404 });
        }

        // Save to database
        const launchpad = await prisma.launchpad.upsert({
            where: { contractAddress: normalizedContractAddress },
            update: {
                name: launchpadData.name,
                symbol: launchpadData.symbol,
                totalMaxSupply: launchpadData.totalSupply,
                royaltyRecipient: launchpadData.royaltyRecipient,
                royaltyPercentage: launchpadData.royaltyPercentage,
                updatedAt: new Date()
            },
            create: {
                chainId,
                factoryId: factory.id,
                contractAddress: normalizedContractAddress,
                creator: launchpadData.creator,
                name: launchpadData.name,
                symbol: launchpadData.symbol,
                totalMaxSupply: launchpadData.totalSupply,
                treasury: launchpadData.creator,
                royaltyRecipient: launchpadData.royaltyRecipient,
                royaltyPercentage: launchpadData.royaltyPercentage,
                status: 'ACTIVE',
                createdAt: new Date(launchpadData.createdAt)
            }
        });

        console.log(`✅ Successfully synced: ${launchpadData.name} (${normalizedContractAddress})`);

        return NextResponse.json({
            success: true,
            data: {
                message: `Successfully synced ${launchpadData.name}`,
                launchpad
            }
        });

    } catch (error) {
        console.error('❌ Sync error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred during sync'
        }, { status: 500 });
    }
}
