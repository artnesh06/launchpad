import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BlockchainService } from '@/lib/blockchain/blockchain-service';

const contractService = new BlockchainService();

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    const [operations, total] = await Promise.all([
      prisma.bulkOperation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.bulkOperation.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        operations,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Error fetching bulk operations:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bulk operations'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { action, type, data, createdBy } = body;

    if (action === 'create') {
      // Create a new bulk operation
      const operation = await prisma.bulkOperation.create({
        data: {
          name: `Bulk ${type.replace('_', ' ')} Operation`,
          type: type.toUpperCase(),
          total: Array.isArray(data) ? data.length : 1,
          data: JSON.stringify(data),
          createdBy
        }
      });

      // Start processing in background
      processBulkOperation(operation.id);

      return NextResponse.json({
        success: true,
        data: operation
      });
    }

    if (action === 'update') {
      const { operationId, status } = body;
      
      const operation = await prisma.bulkOperation.update({
        where: { id: operationId },
        data: { 
          status: status.toUpperCase(),
          ...(status === 'RUNNING' ? { startedAt: new Date() } : {}),
          ...(status === 'COMPLETED' || status === 'FAILED' ? { completedAt: new Date() } : {})
        }
      });

      return NextResponse.json({
        success: true,
        data: operation
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
  } catch (error) {
    console.error('Error in bulk operations POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Background processing function
async function processBulkOperation(operationId: string) {
  try {
    const operation = await prisma.bulkOperation.findUnique({
      where: { id: operationId }
    });

    if (!operation) return;

    await prisma.bulkOperation.update({
      where: { id: operationId },
      data: { status: 'RUNNING', startedAt: new Date() }
    });

    const data = JSON.parse(operation.data as string);
    const results = [];
    const errors = [];
    let processed = 0;

    for (let i = 0; i < data.length; i++) {
      try {
        let result;
        
        switch (operation.type) {
          case 'CREATE_LAUNCHPADS':
            result = await processBulkLaunchpadCreation(data[i]);
            break;
          case 'UPDATE_FEES':
            result = await processBulkFeeUpdate(data[i]);
            break;
          case 'EXPORT_DATA':
            result = await processDataExport(data[i]);
            break;
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }

        results.push(result);
        processed++;

        // Update progress
        await prisma.bulkOperation.update({
          where: { id: operationId },
          data: {
            processed,
            progress: Math.round((processed / operation.total) * 100)
          }
        });

        // Add small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errors.push(`Error processing item ${i + 1}: ${error}`);
        processed++;
      }
    }

    // Mark as completed
    await prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: errors.length > 0 ? 'COMPLETED' : 'COMPLETED',
        completedAt: new Date(),
        processed,
        progress: 100,
        errors,
        result: JSON.stringify(results)
      }
    });

  } catch (error) {
    console.error('Bulk operation processing error:', error);
    await prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errors: [`Processing failed: ${error}`]
      }
    });
  }
}

async function processBulkLaunchpadCreation(data: any) {
  // This is a mock implementation
  // In reality, this would need to interact with the blockchain
  return {
    success: true,
    data: {
      name: data.name,
      symbol: data.symbol,
      mockAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      processed: true
    }
  };
}

async function processBulkFeeUpdate(data: any) {
  // Mock fee update processing
  return {
    success: true,
    data: {
      contractAddress: data.contractAddress,
      oldFee: data.oldFee,
      newFee: data.newFee,
      processed: true
    }
  };
}

async function processDataExport(data: any) {
  // Mock data export processing
  return {
    success: true,
    data: {
      type: data.type,
      records: data.records || 100,
      exportUrl: '/api/exports/mock-export.csv',
      processed: true
    }
  };
}