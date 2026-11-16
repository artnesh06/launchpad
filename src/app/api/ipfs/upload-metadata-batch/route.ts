import { authorizeUploader } from '@/lib/creator-auth';
import { NextRequest, NextResponse } from 'next/server';
import pinataSDK from '@pinata/sdk';

/**
 * Partial/Batch Metadata Upload API
 * 
 * This endpoint handles uploading metadata files in batches to avoid Vercel timeout.
 * It uploads files directly to Pinata without calling other API routes.
 * 
 * Request body:
 * - files: Array of { name: string, content: string } - metadata files to upload
 * - batchNumber: number - current batch number (for logging)
 * - totalBatches: number - total number of batches
 * 
 * Response:
 * - success: boolean
 * - uploadedFiles: Array of { name: string, ipfsUrl: string, ipfsHash: string }
 * - batchNumber: number
 * - message: string
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeUploader(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { files, batchNumber = 1, totalBatches = 1 } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} with ${files.length} files`);

    // Initialize Pinata
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_SECRET_KEY;

    if (!pinataApiKey || !pinataSecretKey) {
      return NextResponse.json(
        { error: 'Pinata credentials not configured' },
        { status: 500 }
      );
    }

    const pinata = new pinataSDK(pinataApiKey, pinataSecretKey);

    const uploadedFiles: Array<{ name: string; ipfsUrl: string; ipfsHash: string }> = [];
    const errors: Array<{ name: string; error: string }> = [];

    // Upload files in parallel (5 at a time to avoid rate limits)
    const CONCURRENT_UPLOADS = 5;
    
    for (let i = 0; i < files.length; i += CONCURRENT_UPLOADS) {
      const chunk = files.slice(i, i + CONCURRENT_UPLOADS);
      
      const uploadPromises = chunk.map(async (file) => {
        try {
          const { name, content } = file;
          
          console.log(`📤 Uploading to IPFS: ${name} (${(content.length / 1024).toFixed(2)} KB)`);

          // Upload directly to Pinata
          const result = await pinata.pinJSONToIPFS(JSON.parse(content), {
            pinataMetadata: {
              name: name
            }
          });

          const ipfsHash = result.IpfsHash;
          const ipfsUrl = `ipfs://${ipfsHash}`;

          uploadedFiles.push({
            name,
            ipfsUrl,
            ipfsHash
          });

          console.log(`✅ Uploaded ${name}: ${ipfsHash}`);
          
          return { success: true, name };
        } catch (error: any) {
          console.error(`❌ Failed to upload ${file.name}:`, error);
          errors.push({
            name: file.name,
            error: error.message || 'Upload failed'
          });
          return { success: false, name: file.name, error: error.message };
        }
      });

      // Wait for this chunk to complete
      await Promise.all(uploadPromises);
      
      // Progress log
      console.log(`📊 Progress: ${Math.min(i + CONCURRENT_UPLOADS, files.length)}/${files.length} files processed`);
    }

    const response = {
      success: errors.length === 0,
      uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      batchNumber,
      totalBatches,
      message: `Batch ${batchNumber}/${totalBatches}: ${uploadedFiles.length}/${files.length} files uploaded successfully`
    };

    console.log(`✅ Batch ${batchNumber}/${totalBatches} complete: ${uploadedFiles.length}/${files.length} successful`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Error in batch upload:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process batch upload',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
