import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

export async function PUT(request: NextRequest) {
    try {
        // Verify admin authentication
        const authResult = await verifyAdminAuth(request);
        if (!authResult.authenticated) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { feePercentage, treasury } = body;

        // Validate inputs
        if (feePercentage !== undefined) {
            if (typeof feePercentage !== 'number' || feePercentage < 0 || feePercentage > 100) {
                return NextResponse.json(
                    { success: false, error: 'Invalid fee percentage. Must be between 0 and 100.' },
                    { status: 400 }
                );
            }
        }

        if (treasury !== undefined) {
            if (typeof treasury !== 'string' || !treasury.match(/^0x[a-fA-F0-9]{40}$/)) {
                return NextResponse.json(
                    { success: false, error: 'Invalid treasury address format.' },
                    { status: 400 }
                );
            }
        }

        // Update all active factories
        const updateData: any = {};
        
        if (feePercentage !== undefined) {
            // Convert percentage to basis points (e.g., 2.5% = 250)
            updateData.platformFeePercentage = Math.round(feePercentage * 100);
        }
        
        if (treasury !== undefined) {
            updateData.treasury = treasury;
        }

        const result = await prisma.launchpadFactory.updateMany({
            where: { isActive: true },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            data: {
                updated: result.count,
                settings: {
                    feePercentage,
                    treasury
                }
            }
        });

    } catch (error) {
        console.error('Error updating platform fee settings:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to update platform fee settings',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
