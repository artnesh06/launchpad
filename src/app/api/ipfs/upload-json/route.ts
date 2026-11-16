import { authorizeUploader } from '@/lib/creator-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route untuk upload JSON data ke IPFS via Pinata
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

    // Parse JSON body
    const body = await request.json();
    const { data, filename = 'metadata.json' } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      );
    }

    // Convert JSON to blob
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const file = new File([blob], filename, { type: 'application/json' });

    // Buat form data untuk Pinata
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
      name: filename,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        type: 'json'
      }
    });
    formData.append('pinataMetadata', metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1
    });
    formData.append('pinataOptions', options);

    // Upload ke Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey
      },
      body: formData
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
    console.error('Upload JSON API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
