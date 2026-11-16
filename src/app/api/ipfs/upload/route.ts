import { authorizeUploader } from '@/lib/creator-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route untuk upload file ke IPFS via Pinata
 * Endpoint ini menyembunyikan API keys dari frontend
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeUploader(request);
  if (denied) return denied;

  try {
    // Validasi API keys dari environment variables (server-side only)
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_SECRET_KEY;

    if (!pinataApiKey || !pinataSecretKey) {
      return NextResponse.json(
        { 
          error: 'Pinata credentials not configured on server',
          message: 'Please add PINATA_API_KEY and PINATA_SECRET_KEY to .env file'
        },
        { status: 500 }
      );
    }

    // Parse form data dari request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Buat form data baru untuk Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);

    // Add metadata with safe size handling
    const fileSize = file.size ?? 0;
    const fileName = file.name || 'unnamed-file';
    
    const metadata = JSON.stringify({
      name: fileName,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        originalName: fileName,
        size: fileSize.toString()
      }
    });
    pinataFormData.append('pinataMetadata', metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1
    });
    pinataFormData.append('pinataOptions', options);

    // Upload ke Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey
      },
      body: pinataFormData
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Pinata upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload to Pinata', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    const ipfsHash = result.IpfsHash;

    return NextResponse.json({
      success: true,
      ipfsHash,
      ipfsUrl: `ipfs://${ipfsHash}`,
      gatewayUrl: `https://eu.orbitor.dev/ipfs/${ipfsHash}`
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
