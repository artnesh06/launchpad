import { authorizeUploader } from '@/lib/creator-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Batch Image Upload API
 * 
 * Upload images in batches to avoid Vercel payload size limit (4.5MB)
 * and timeout issues.
 * 
 * Uses Pinata REST API directly instead of SDK for better reliability.
 * 
 * Request body:
 * - images: Array of { name: string, data: string (base64) } - images to upload
 * - batchNumber: number - current batch number (for logging)
 * - totalBatches: number - total number of batches
 * 
 * Response:
 * - success: boolean
 * - uploadedImages: Array of { name: string, ipfsUrl: string, ipfsHash: string }
 * - batchNumber: number
 * - message: string
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeUploader(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { images, batchNumber = 1, totalBatches = 1 } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    console.log(`📦 Processing image batch ${batchNumber}/${totalBatches} with ${images.length} images`);

    // Get Pinata credentials
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_SECRET_KEY;

    if (!pinataApiKey || !pinataSecretKey) {
      return NextResponse.json(
        { error: 'Pinata credentials not configured' },
        { status: 500 }
      );
    }

    const uploadedImages: Array<{ name: string; ipfsUrl: string; ipfsHash: string }> = [];
    const errors: Array<{ name: string; error: string }> = [];

    // Filter out Mac OS hidden files (._filename)
    const validImages = images.filter((img: { name: string }) => !img.name.startsWith('._'));
    
    if (validImages.length < images.length) {
      console.log(`⚠️  Filtered out ${images.length - validImages.length} hidden Mac OS files`);
    }

    // Upload images sequentially to avoid rate limits
    for (let i = 0; i < validImages.length; i++) {
      const image = validImages[i];
      
      try {
        const { name, data } = image;
        
        console.log(`📤 Uploading image ${i + 1}/${validImages.length}: ${name}`);

        // Convert base64 to buffer
        const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Detect mime type from base64 header or default to png
        let mimeType = 'image/png';
        const mimeMatch = data.match(/^data:(image\/\w+);base64,/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }

        // Create FormData for Pinata REST API
        const formData = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        formData.append('file', blob, name);
        
        // Add pinata metadata
        const pinataMetadata = JSON.stringify({
          name: name
        });
        formData.append('pinataMetadata', pinataMetadata);

        // Upload using Pinata REST API (more reliable than SDK)
        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: {
            'pinata_api_key': pinataApiKey,
            'pinata_secret_api_key': pinataSecretKey,
          },
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Pinata API error for ${name}:`, response.status, errorText);
          throw new Error(`Pinata API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const ipfsHash = result.IpfsHash;
        const ipfsUrl = `ipfs://${ipfsHash}`;

        uploadedImages.push({
          name,
          ipfsUrl,
          ipfsHash
        });

        console.log(`✅ Uploaded ${name}: ${ipfsHash}`);
        
        // Small delay between uploads to avoid rate limiting
        if (i < validImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error: any) {
        console.error(`❌ Failed to upload ${image.name}:`, error.message);
        errors.push({
          name: image.name,
          error: error.message || 'Upload failed'
        });
      }
    }

    const responseData = {
      success: errors.length === 0,
      uploadedImages,
      errors: errors.length > 0 ? errors : undefined,
      batchNumber,
      totalBatches,
      message: `Batch ${batchNumber}/${totalBatches}: ${uploadedImages.length}/${validImages.length} images uploaded successfully`
    };

    console.log(`✅ Batch ${batchNumber}/${totalBatches} complete: ${uploadedImages.length}/${validImages.length} successful`);
    
    if (errors.length > 0) {
      console.error(`❌ ${errors.length} images failed:`, errors);
    }

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('❌ Error in batch image upload:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process batch image upload',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
