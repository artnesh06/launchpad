import { authorizeUploader } from '@/lib/creator-auth';
import { NextRequest, NextResponse } from 'next/server';
import { PinataSDK } from 'pinata';

// Route segment config for App Router - NO LIMITS
export const maxDuration = 300; // 5 minutes timeout
export const dynamic = 'force-dynamic';

/**
 * Validates Pinata credentials from environment variables
 */
function validatePinataCredentials(): { jwt: string; gateway: string } {
  const jwt = process.env.PINATA_JWT;
  const gateway = process.env.PINATA_GATEWAY_URL || process.env.NEXT_PUBLIC_IPFS_GATEWAY;

  if (!jwt) {
    throw new Error('PINATA_JWT environment variable is not configured.');
  }

  if (!gateway) {
    throw new Error('PINATA_GATEWAY_URL environment variable is not configured.');
  }

  return { jwt, gateway };
}

/**
 * API Route for uploading multiple files as a single folder to IPFS via Pinata SDK
 * Uses FormData to handle large file uploads without body size limits
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeUploader(request);
  if (denied) return denied;

  try {
    const { jwt, gateway } = validatePinataCredentials();

    const pinata = new PinataSDK({
      pinataJwt: jwt,
      pinataGateway: gateway.replace('https://', '').replace('http://', ''),
    });

    // Parse FormData - no size limits
    const formData = await request.formData();
    const folderName = formData.get('folderName') as string || 'collection';
    
    // Get all files from FormData
    const fileObjects: File[] = [];
    
    for (const [key, value] of formData.entries()) {
      if (key === 'folderName') continue;
      
      if (value instanceof File) {
        fileObjects.push(value);
      }
    }

    if (fileObjects.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    console.log(`📤 Starting folder upload: ${folderName}`);
    console.log(`📦 Files to upload: ${fileObjects.length}`);

    // Upload files as folder using fileArray method
    const result = await pinata.upload.public.fileArray(fileObjects).name(folderName);

    const folderCID = result.cid;
    const folderUrl = `ipfs://${folderCID}/`;
    const gatewayUrl = `${gateway.replace(/\/$/, '')}/ipfs/${folderCID}/`;

    console.log(`✅ Folder uploaded: CID=${folderCID}, Files=${fileObjects.length}`);

    return NextResponse.json({
      success: true,
      folderCID,
      folderUrl,
      gatewayUrl,
      fileCount: fileObjects.length,
    });

  } catch (error) {
    console.error('❌ Folder upload error:', error);

    if (error instanceof Error && 
        (error.message.includes('timeout') || error.message.includes('ETIMEDOUT'))) {
      return NextResponse.json(
        { error: 'Upload timed out', retryable: true },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
