import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/fix-phase-prices
 * Fix phase prices that are stored in scientific notation
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { contractAddress } = body;

    if (!contractAddress) {
      return NextResponse.json(
        { success: false, error: 'Contract address is required' },
        { status: 400 }
      );
    }

    const normalizedAddress = contractAddress.toLowerCase();

    // Get all phases for this contract
    const phases = await prisma.phase.findMany({
      where: {
        launchpad: {
          contractAddress: normalizedAddress
        }
      }
    });

    console.log(`🔧 Checking ${phases.length} phases for contract ${normalizedAddress}`);

    let fixedCount = 0;
    const updates = [];

    for (const phase of phases) {
      const price = phase.price;
      
      // Check if price contains scientific notation
      if (price.includes('e') || price.includes('E')) {
        console.log(`❌ Found scientific notation in phase "${phase.name}": ${price}`);
        
        const numValue = parseFloat(price);
        let newPrice: string;
        
        if (numValue === 0 || numValue < 0.000001) {
          newPrice = '0';
          console.log(`   Setting to: 0 (value too small)`);
        } else {
          // Convert to proper decimal string
          newPrice = numValue.toFixed(18).replace(/\.?0+$/, '');
          console.log(`   Setting to: ${newPrice}`);
        }
        
        updates.push(
          prisma.phase.update({
            where: { id: phase.id },
            data: { price: newPrice }
          })
        );
        
        fixedCount++;
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`✅ Fixed ${fixedCount} phases`);
    } else {
      console.log(`✅ No phases need fixing`);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalPhases: phases.length,
        fixedCount,
        message: fixedCount > 0 
          ? `Fixed ${fixedCount} phase(s) with scientific notation`
          : 'All phases are already in correct format'
      }
    });

  } catch (error: any) {
    console.error('❌ Error fixing phase prices:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fix phase prices' },
      { status: 500 }
    );
  }
}
