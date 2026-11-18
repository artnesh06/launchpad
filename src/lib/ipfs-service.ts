/**
 * IPFS Upload Service
 * Handles file uploads to IPFS using Pinata
 */

export interface IPFSUploadResult {
  ipfsHash: string;
  ipfsUrl: string;
  gatewayUrl: string;
  fileMapping?: Record<string, string>;
}

/**
 * Folder upload result interface
 */
export interface FolderUploadResult {
  folderCID: string;
  folderUrl: string;
  gatewayUrl: string;
}

/**
 * NFT Metadata interface for Standard Collections
 */
export interface NFTMetadata {
  name: string;
  description: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  [key: string]: unknown;
}

/**
 * Progress callback type for folder upload
 * @param stage - Current upload stage
 * @param current - Current progress (0-100 for upload, or step number)
 * @param total - Total (100 for upload percentage, or total steps)
 * @param uploadedBytes - Optional: actual bytes uploaded
 * @param totalBytes - Optional: total bytes to upload
 */
export type FolderUploadProgressCallback = (
  stage: string,
  current: number,
  total: number,
  uploadedBytes?: number,
  totalBytes?: number
) => void;

/**
 * Validation error for file upload
 */
export interface FileValidationError {
  fileName: string;
  error: string;
}

/**
 * Collection-level metadata for OpenSea/marketplaces
 * This will be saved as collection.json in the folder
 */
export interface CollectionMetadata {
  name: string;
  description: string;
  symbol?: string;
  image?: string; // Cover image URL (IPFS URL from uploaded cover image)
  banner_image?: string; // Banner image URL (IPFS URL from uploaded banner image)
  external_url?: string;
  seller_fee_basis_points: number; // Royalty in basis points (e.g., 500 = 5%)
  fee_recipient: string; // Royalty recipient address
}

export class IPFSService {
  private uploadAuth: { headers: Record<string, string>; expiresAt: number } | null = null;

  /**
   * Wallet-signed authorization for the /api/ipfs/* upload routes.
   * One signature is reused for ~9 minutes so a multi-batch upload prompts only once.
   * Returns {} on the server or when signing is unavailable (an admin session still works).
   */
  private async getUploadAuthHeaders(): Promise<Record<string, string>> {
    if (typeof window === 'undefined') return {};
    if (this.uploadAuth && this.uploadAuth.expiresAt > Date.now()) return this.uploadAuth.headers;
    const { getCreatorAuthHeadersSafe } = await import('@/lib/creator-auth-client');
    const { IPFS_UPLOAD_TARGET } = await import('@/lib/creator-auth-message');
    const headers = await getCreatorAuthHeadersSafe('ipfs:upload', IPFS_UPLOAD_TARGET);
    if (Object.keys(headers).length) {
      this.uploadAuth = { headers, expiresAt: Date.now() + 9 * 60 * 1000 };
    }
    return headers;
  }

  /**
   * Upload FormData with progress tracking using XMLHttpRequest
   * fetch() API doesn't support upload progress, so we use XHR
   * 
   * @param url - Upload URL
   * @param formData - FormData to upload
   * @param onProgress - Progress callback (percentage 0-100)
   * @returns Promise with response JSON
   */
  private async uploadWithProgress<T>(
    url: string,
    formData: FormData,
    onProgress?: (percentage: number, uploadedBytes: number, totalBytes: number) => void
  ): Promise<T> {
    // The listener's upload endpoint requires the creator's wallet signature
    const authHeaders = await this.getUploadAuthHeaders();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open('POST', url, true);
      for (const [name, value] of Object.entries(authHeaders)) {
        xhr.setRequestHeader(name, value);
      }
      
      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          console.log(`📊 Upload progress: ${percentage}% (${(event.loaded / 1024 / 1024).toFixed(2)}MB / ${(event.total / 1024 / 1024).toFixed(2)}MB)`);
          onProgress(percentage, event.loaded, event.total);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Failed to parse response JSON'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || error.message || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };
      
      xhr.ontimeout = () => {
        reject(new Error('Upload timed out'));
      };
      
      // Set a longer timeout for large uploads (10 minutes)
      xhr.timeout = 600000;
      
      xhr.send(formData);
    });
  }

  /**
   * Upload a single file to IPFS via backend API
   * API keys are stored securely on the server
   */
  async uploadFile(file: File): Promise<IPFSUploadResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log(`📤 Uploading to IPFS: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

      // Build absolute URL for server-side fetch
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      const uploadUrl = `${baseUrl}/api/ipfs/upload`;

      // Upload via backend API endpoint (API keys are hidden)
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: await this.getUploadAuthHeaders(),
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();

      console.log(`✅ Uploaded to IPFS: ${result.ipfsHash}`);

      return {
        ipfsHash: result.ipfsHash,
        ipfsUrl: result.ipfsUrl,
        gatewayUrl: result.gatewayUrl
      };

    } catch (error) {
      console.error('❌ IPFS upload error:', error);
      throw error;
    }
  }

  /**
   * Upload JSON data to IPFS via backend API
   */
  async uploadJSON(data: any, filename: string = 'metadata.json'): Promise<IPFSUploadResult> {
    try {
      console.log(`📤 Uploading JSON to IPFS: ${filename}`);

      // Build absolute URL for server-side fetch
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      const uploadUrl = `${baseUrl}/api/ipfs/upload-json`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await this.getUploadAuthHeaders()),
        },
        body: JSON.stringify({ data, filename })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'JSON upload failed');
      }

      const result = await response.json();

      console.log(`✅ Uploaded JSON to IPFS: ${result.ipfsHash}`);

      return {
        ipfsHash: result.ipfsHash,
        ipfsUrl: result.ipfsUrl,
        gatewayUrl: result.gatewayUrl
      };

    } catch (error) {
      console.error('❌ IPFS JSON upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files as a folder to IPFS via Pinata SDK
   * Uses backend API which handles folder creation properly
   */
  async uploadFolder(
    files: File[], 
    folderName: string = 'NFT Metadata Folder',
    onProgress?: (fileName: string, current: number, total: number) => void
  ): Promise<IPFSUploadResult> {
    try {
      console.log(`📤 Preparing ${files.length} files for upload as folder...`);
      
      // Log first 5 files for debugging
      const sampleFiles = files.slice(0, 5);
      console.log('📸 Sample files:');
      sampleFiles.forEach(f => console.log(`  - ${f.name} (${(f.size / 1024).toFixed(2)} KB)`));
      if (files.length > 5) {
        console.log(`  ... and ${files.length - 5} more files`);
      }

      // For single file uploads (like Open Edition metadata.json), upload directly
      if (files.length === 1) {
        console.log('📤 Single file detected, uploading directly...');
        const result = await this.uploadFile(files[0]);
        return {
          ipfsHash: result.ipfsHash,
          ipfsUrl: result.ipfsUrl,
          gatewayUrl: result.gatewayUrl,
          fileMapping: { [files[0].name]: result.ipfsHash }
        };
      }

      // For multiple files, upload via backend API that uses Pinata SDK
      console.log('🔑 Uploading folder via backend API (Pinata SDK)...');

      const formData = new FormData();
      
      // Add all files
      files.forEach((file, index) => {
        formData.append('files', file);
        onProgress?.(file.name, index + 1, files.length);
      });
      
      // Add folder name
      formData.append('folderName', folderName);

      // Build absolute URL for server-side fetch
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      const uploadUrl = `${baseUrl}/api/ipfs/upload-folder`;

      // Upload via backend API
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: await this.getUploadAuthHeaders(),
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Failed to upload folder:', error);
        throw new Error(error.message || 'Failed to upload folder');
      }

      const result = await response.json();

      console.log(`✅ Files uploaded successfully!`);
      console.log(`� Foiles uploaded: ${result.fileCount}`);
      
      if (result.fileMapping) {
        console.log(`📁 Each file has individual IPFS hash (Pinata limitation)`);
        const sampleFiles = Object.entries(result.fileMapping).slice(0, 3);
        sampleFiles.forEach(([name, hash]) => {
          console.log(`   - ${name} → ipfs://${hash}`);
        });
        if (Object.keys(result.fileMapping).length > 3) {
          console.log(`   - ... and ${Object.keys(result.fileMapping).length - 3} more files`);
        }
      }

      return {
        ipfsHash: result.ipfsHash,
        ipfsUrl: result.ipfsUrl,
        gatewayUrl: result.gatewayUrl,
        fileMapping: result.fileMapping // Individual file hashes
      };

    } catch (error) {
      console.error('❌ IPFS folder upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple images in batches and return individual IPFS hashes
   * Returns: { folderHash, imageUrls: Map<filename, ipfs://hash> }
   * 
   * Optimized for Vercel:
   * - Batch size: 5 images per batch (to avoid 4.5MB payload limit)
   * - Parallel uploads: 3 images at a time within each batch
   * - Progress tracking: Real-time updates per image
   */
  async uploadImagesAsFolder(
    images: Map<string, File>,
    folderName: string = 'Images',
    onProgress?: (fileName: string, current: number, total: number) => void
  ): Promise<{
    folderHash: string;
    folderUrl: string;
    imageUrls: Map<string, string>;
  }> {
    const total = images.size;
    console.log(`📤 Uploading ${total} images to IPFS in batches...`);
    console.log(`⚠️  Each image gets individual hash (Pinata limitation)`);

    // Convert images to base64 for batch upload
    // Filter out Mac OS hidden files (._filename) and other invalid files
    const imageArray: Array<{ name: string; file: File }> = [];
    images.forEach((file, name) => {
      // Skip hidden Mac OS files and system files
      if (!name.startsWith('._') && !name.startsWith('.DS_Store')) {
        imageArray.push({ name, file });
      } else {
        console.log(`⚠️  Skipping hidden/system file: ${name}`);
      }
    });
    
    if (imageArray.length < total) {
      console.log(`⚠️  Filtered out ${total - imageArray.length} hidden/system files`);
    }
    
    if (imageArray.length === 0) {
      throw new Error('No valid images to upload after filtering');
    }

    // Upload 1 image per request to avoid 413 Content Too Large error
    const BATCH_SIZE = 1;
    const validTotal = imageArray.length;
    const batches = Math.ceil(validTotal / BATCH_SIZE);
    const imageUrls = new Map<string, string>();
    
    console.log(`📦 Uploading ${validTotal} images one by one to avoid payload size limit`);
    
    for (let i = 0; i < batches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, validTotal);
      const batch = imageArray.slice(start, end);
      
      console.log(`📤 Uploading image ${i + 1}/${validTotal}: ${batch[0]?.name}...`);
      
      try {
        // Convert files to base64
        const imagesData = await Promise.all(
          batch.map(async ({ name, file }) => {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const mimeType = file.type || 'image/png';
            return {
              name,
              data: `data:${mimeType};base64,${base64}`
            };
          })
        );

        // Build absolute URL for server-side fetch
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        const uploadUrl = `${baseUrl}/api/ipfs/upload-images-batch`;

        // Call the batch upload API
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await this.getUploadAuthHeaders()),
          },
          body: JSON.stringify({
            images: imagesData,
            batchNumber: i + 1,
            totalBatches: batches
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `Batch ${i + 1} upload failed`);
        }
        
        const result = await response.json();
        
        console.log(`📦 API response for batch ${i + 1}:`, {
          uploadedImagesCount: result.uploadedImages?.length || 0,
          errorsCount: result.errors?.length || 0
        });
        
        // Store uploaded images in map
        if (result.uploadedImages && Array.isArray(result.uploadedImages)) {
          for (const image of result.uploadedImages) {
            imageUrls.set(image.name, image.ipfsUrl);
            
            // Call progress callback
            if (onProgress) {
              const current = imageUrls.size;
              console.log(`📊 Calling progress callback: ${image.name}, ${current}/${validTotal}`);
              onProgress(image.name, current, validTotal);
            }
          }
          console.log(`✅ Image ${i + 1}/${validTotal} uploaded successfully`);
        } else {
          console.warn(`⚠️ No uploadedImages in API response for batch ${i + 1}`);
        }
        
        // Report errors if any
        if (result.errors && result.errors.length > 0) {
          console.error(`❌ Failed to upload ${batch[0]?.name}:`, result.errors);
        }
        
        // Small delay between uploads to avoid rate limiting
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
      } catch (error: any) {
        console.error(`❌ Image ${i + 1} failed:`, error);
        throw new Error(`Failed to upload image ${i + 1}/${validTotal} (${batch[0]?.name}): ${error.message}`);
      }
    }

    console.log(`✅ All ${imageUrls.size}/${validTotal} images uploaded successfully`);
    
    if (imageUrls.size < validTotal) {
      console.warn(`⚠️  ${validTotal - imageUrls.size} images failed to upload`);
    }

    // Create manifest for images
    const manifest: Record<string, string> = {};
    imageUrls.forEach((ipfsUrl, fileName) => {
      manifest[fileName] = ipfsUrl;
    });

    console.log(`📝 Creating image manifest with ${Object.keys(manifest).length} entries...`);
    
    // Log sample entries for debugging
    const sampleEntries = Object.entries(manifest).slice(0, 3);
    if (sampleEntries.length > 0) {
      console.log('📸 Sample manifest entries:');
      sampleEntries.forEach(([name, url]) => console.log(`   - "${name}": "${url}"`));
    } else {
      console.warn('⚠️ Manifest is empty! No images were uploaded successfully.');
    }

    // Upload manifest
    const manifestResult = await this.uploadJSON(manifest, `${folderName}-manifest.json`);
    
    console.log(`✅ Image manifest uploaded: ${manifestResult.ipfsHash}`);

    return {
      folderHash: manifestResult.ipfsHash,
      folderUrl: manifestResult.ipfsUrl,
      imageUrls
    };
  }

  /**
   * DEPRECATED: Upload images one by one (old method)
   * Use uploadImagesAsFolder() instead for better performance
   */
  async uploadImages(images: Map<string, File>): Promise<Map<string, string>> {
    console.warn('⚠️  uploadImages() is deprecated. Use uploadImagesAsFolder() instead.');

    const result = await this.uploadImagesAsFolder(images, 'Images');
    return result.imageUrls;
  }

  /**
   * Upload metadata files as a folder
   * Each metadata file should be named with its token ID (e.g., "0.json", "1.json")
   * 
   * DEPRECATED: Use uploadMetadataInBatches() instead for better performance
   * and to avoid Vercel timeout/payload limits
   */
  async uploadMetadataFolder(
    metadataFiles: File[], 
    collectionName: string,
    onProgress?: (fileName: string, current: number, total: number) => void
  ): Promise<IPFSUploadResult> {
    console.warn('⚠️  uploadMetadataFolder() is deprecated. Use uploadMetadataInBatches() instead.');
    
    // For small collections (< 20 files), use old method
    if (metadataFiles.length < 20) {
      return this.uploadFolder(metadataFiles, `${collectionName} Metadata`, onProgress);
    }
    
    // For large collections, use batch upload
    console.log(`📦 Large collection detected (${metadataFiles.length} files), using batch upload...`);
    
    // Convert File objects to { name, content } format
    const metadataForBatch = await Promise.all(
      metadataFiles.map(async (file) => ({
        name: file.name,
        content: await file.text()
      }))
    );
    
    // Upload in batches
    const metadataUrlMap = await this.uploadMetadataInBatches(
      metadataForBatch,
      20,
      onProgress
    );
    
    // Create manifest
    const manifest: Record<string, string> = {};
    metadataUrlMap.forEach((ipfsUrl, fileName) => {
      const tokenId = fileName.replace('.json', '');
      manifest[tokenId] = ipfsUrl;
    });
    
    // Upload manifest
    const manifestResult = await this.uploadJSON(manifest, `${collectionName}-manifest.json`);
    
    return {
      ipfsHash: manifestResult.ipfsHash,
      ipfsUrl: manifestResult.ipfsUrl,
      gatewayUrl: manifestResult.gatewayUrl,
      fileMapping: Object.fromEntries(metadataUrlMap)
    };
  }

  /**
   * Batch upload: Upload images first, then metadata with updated image URLs
   * This is the recommended flow for Standard Edition collections
   */
  async uploadCollectionBatch(
    images: Map<string, File>,
    metadataFiles: File[],
    collectionName: string,
    onProgress?: (stage: string, current: number, total: number) => void
  ): Promise<{
    imagesResult: Map<string, string>;
    metadataResult: IPFSUploadResult;
  }> {
    // Step 1: Upload all images
    onProgress?.('Uploading images', 0, images.size);
    const imagesResult = await this.uploadImages(images);
    onProgress?.('Uploading images', images.size, images.size);

    // Step 2: Upload metadata folder
    onProgress?.('Uploading metadata', 0, metadataFiles.length);
    const metadataResult = await this.uploadMetadataFolder(metadataFiles, collectionName);
    onProgress?.('Uploading metadata', metadataFiles.length, metadataFiles.length);

    return {
      imagesResult,
      metadataResult
    };
  }

  /**
   * Create and upload contract-level metadata for OpenSea/Blockscout
   * Uses standard format compatible with most explorers and marketplaces
   */
  async uploadContractMetadata(options: {
    name: string;
    symbol?: string;
    description: string;
    image?: string; // Cover image IPFS URL or HTTP URL
    bannerImage?: string; // Banner image IPFS URL or HTTP URL
    externalLink?: string;
    sellerFeeBasisPoints: number; // Royalty in basis points (e.g., 500 = 5%)
    feeRecipient: string; // Royalty recipient address
  }): Promise<IPFSUploadResult> {
    // Use standard OpenSea collection metadata format
    // Reference: https://docs.opensea.io/docs/metadata-standards
    const metadata: Record<string, any> = {
      name: options.name,
      description: options.description,
      image: options.image || '',
      external_link: options.externalLink || '', // OpenSea uses external_link
      seller_fee_basis_points: options.sellerFeeBasisPoints,
      fee_recipient: options.feeRecipient
    };

    // Add banner_image if provided
    if (options.bannerImage) {
      metadata.banner_image = options.bannerImage;
    }

    // Add symbol if provided (helps some explorers like Blockscout)
    if (options.symbol) {
      metadata.symbol = options.symbol;
    }

    return this.uploadJSON(metadata, 'contract-metadata.json');
  }

  /**
   * Convert IPFS URL to HTTP gateway URL
   */
  static toGatewayUrl(ipfsUrl: string, gateway: string = 'https://eu.orbitor.dev'): string {
    if (ipfsUrl.startsWith('ipfs://')) {
      const hash = ipfsUrl.replace('ipfs://', '');
      return `${gateway}/ipfs/${hash}`;
    }
    return ipfsUrl;
  }

  /**
   * Check if Pinata credentials are configured (always true for API-based approach)
   */
  isConfigured(): boolean {
    return true; // API handles credential validation
  }

  /**
   * Upload metadata files in batches to avoid timeout
   * This is useful for large collections (>100 files) on Vercel with 60s timeout
   * 
   * Optimized strategy:
   * - Batch size: 20 files per batch (to stay under 50s timeout)
   * - Parallel uploads: 5 files at a time within each batch
   * - Progress tracking: Real-time updates per file
   * 
   * @param metadataFiles - Array of metadata files to upload
   * @param batchSize - Number of files per batch (default: 20 for Vercel timeout)
   * @param onProgress - Progress callback (fileName, current, total, batchNumber, totalBatches)
   * @returns Map of filename to IPFS URL
   */
  async uploadMetadataInBatches(
    metadataFiles: Array<{ name: string; content: string }>,
    batchSize: number = 20,
    onProgress?: (fileName: string, current: number, total: number, batchNumber: number, totalBatches: number) => void
  ): Promise<Map<string, string>> {
    const total = metadataFiles.length;
    const batches = Math.ceil(total / batchSize);
    const uploadedMap = new Map<string, string>();
    
    console.log(`📦 Uploading ${total} metadata files in ${batches} batches (${batchSize} files per batch)`);
    console.log(`⏱️  Estimated time: ${Math.ceil(batches * 30 / 60)} minutes`);
    
    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, total);
      const batch = metadataFiles.slice(start, end);
      
      console.log(`📤 Uploading batch ${i + 1}/${batches} (${batch.length} files)...`);
      
      try {
        // Build absolute URL for server-side fetch
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        const uploadUrl = `${baseUrl}/api/ipfs/upload-metadata-batch`;

        // Call the batch upload API
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await this.getUploadAuthHeaders()),
          },
          body: JSON.stringify({
            files: batch,
            batchNumber: i + 1,
            totalBatches: batches
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `Batch ${i + 1} upload failed`);
        }
        
        const result = await response.json();
        
        console.log(`📦 API response for metadata batch ${i + 1}:`, {
          uploadedFilesCount: result.uploadedFiles?.length || 0,
          errorsCount: result.errors?.length || 0
        });
        
        // Store uploaded files in map
        if (result.uploadedFiles && Array.isArray(result.uploadedFiles)) {
          for (const file of result.uploadedFiles) {
            uploadedMap.set(file.name, file.ipfsUrl);
            
            // Call progress callback with batch info
            if (onProgress) {
              const current = uploadedMap.size;
              console.log(`📊 Calling metadata progress callback: ${file.name}, ${current}/${total}, batch ${i + 1}/${batches}`);
              onProgress(file.name, current, total, i + 1, batches);
            }
          }
        } else {
          console.warn(`⚠️ No uploadedFiles in API response for batch ${i + 1}`);
        }
        
        console.log(`✅ Batch ${i + 1}/${batches} complete: ${result.uploadedFiles.length}/${batch.length} successful`);
        
        // Report errors if any
        if (result.errors && result.errors.length > 0) {
          console.warn(`⚠️  ${result.errors.length} files failed in batch ${i + 1}:`, result.errors);
        }
        
        // Small delay between batches to avoid rate limiting
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error: any) {
        console.error(`❌ Batch ${i + 1} failed:`, error);
        throw new Error(`Failed to upload batch ${i + 1}/${batches}: ${error.message}`);
      }
    }
    
    console.log(`✅ All ${uploadedMap.size}/${total} metadata files uploaded successfully`);
    
    if (uploadedMap.size < total) {
      console.warn(`⚠️  ${total - uploadedMap.size} files failed to upload`);
    }
    
    return uploadedMap;
  }

  /**
   * Upload stages for progress tracking
   */
  static readonly UPLOAD_STAGES = {
    PREPARING_IMAGES: 'Preparing images',
    PREPARING_METADATA: 'Preparing metadata',
    UPLOADING_TO_IPFS: 'Uploading to IPFS',
    UPLOAD_COMPLETE: 'Upload complete',
  } as const;

  /**
   * Convert a File to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'png';
  }

  /**
   * Validate files before upload
   * @throws Error with descriptive message if validation fails
   */
  private validateFilesForFolderUpload(
    images: Map<string, File>,
    metadataFiles: Array<{ tokenId: number; metadata: NFTMetadata }>
  ): FileValidationError[] {
    const errors: FileValidationError[] = [];
    const validImageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
    const validImageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

    // Validate images
    if (images.size === 0) {
      errors.push({ fileName: 'images', error: 'No images provided for upload' });
    }

    let imageIndex = 0;
    images.forEach((file, originalName) => {
      // Skip hidden/system files
      if (originalName.startsWith('._') || originalName.startsWith('.DS_Store')) {
        return;
      }

      // Validate file type
      const extension = this.getFileExtension(originalName);
      if (!validImageTypes.includes(file.type) && !validImageExtensions.includes(extension)) {
        errors.push({
          fileName: originalName,
          error: `Invalid image format. Expected: ${validImageExtensions.join(', ')}. Got: ${file.type || extension}`
        });
      }

      // Validate file size (max 100MB per file)
      if (file.size > 100 * 1024 * 1024) {
        errors.push({
          fileName: originalName,
          error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum: 100MB`
        });
      }

      imageIndex++;
    });

    // Validate metadata files
    if (metadataFiles.length === 0) {
      errors.push({ fileName: 'metadata', error: 'No metadata files provided for upload' });
    }

    for (const { tokenId, metadata } of metadataFiles) {
      // Validate required fields
      if (!metadata.name || typeof metadata.name !== 'string') {
        errors.push({
          fileName: `${tokenId}.json`,
          error: 'Missing or invalid "name" field in metadata'
        });
      }

      if (!metadata.description || typeof metadata.description !== 'string') {
        errors.push({
          fileName: `${tokenId}.json`,
          error: 'Missing or invalid "description" field in metadata'
        });
      }

      // Validate tokenId is a valid number
      if (typeof tokenId !== 'number' || tokenId < 0 || !Number.isInteger(tokenId)) {
        errors.push({
          fileName: `${tokenId}.json`,
          error: `Invalid tokenId: ${tokenId}. Must be a non-negative integer`
        });
      }
    }

    // Validate that image count matches metadata count
    const validImageCount = Array.from(images.keys()).filter(
      name => !name.startsWith('._') && !name.startsWith('.DS_Store')
    ).length;

    if (validImageCount !== metadataFiles.length) {
      errors.push({
        fileName: 'collection',
        error: `Image count (${validImageCount}) does not match metadata count (${metadataFiles.length})`
      });
    }

    return errors;
  }

  /**
   * Upload a Standard Collection as a single folder to IPFS
   * 
   * This method uploads all images and metadata files as a single folder with one CID.
   * The folder structure will be:
   * - QmFolderCID/
   *   - 0.json, 1.json, 2.json, ... (metadata files)
   *   - images/
   *     - 0.png, 1.png, 2.png, ... (image files)
   * 
   * Uses two-phase upload:
   * 1. First upload to get the folder CID
   * 2. Re-upload metadata with correct image URLs containing the actual CID
   * 
   * @param images - Map of original filename to File object
   * @param metadataFiles - Array of token metadata with tokenId
   * @param collectionName - Name of the collection for Pinata metadata
   * @param onProgress - Optional progress callback
   * @returns Folder CID, folder URL, and gateway URL
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.5
   */
  async uploadCollectionAsFolder(
    images: Map<string, File>,
    metadataFiles: Array<{ tokenId: number; metadata: NFTMetadata }>,
    collectionName: string,
    onProgress?: FolderUploadProgressCallback,
    collectionMetadata?: CollectionMetadata
  ): Promise<FolderUploadResult> {
    console.log(`📤 Starting folder upload for collection: ${collectionName}`);
    console.log(`📦 Images: ${images.size}, Metadata files: ${metadataFiles.length}`);

    // Step 0: Validate files before upload
    const validationErrors = this.validateFilesForFolderUpload(images, metadataFiles);
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(e => `${e.fileName}: ${e.error}`).join('\n');
      console.error('❌ File validation failed:', validationErrors);
      throw new Error(`File validation failed:\n${errorMessages}`);
    }

    // Step 1: Prepare image files with correct names (images/0.png, images/1.png, etc.)
    onProgress?.(IPFSService.UPLOAD_STAGES.PREPARING_IMAGES, 0, images.size);
    
    const imageFilesForUpload: File[] = [];
    let imageIndex = 0;
    const imageExtensionMap = new Map<number, string>(); // Map tokenId to extension

    // Sort images by their original name to maintain order
    const sortedImages = Array.from(images.entries())
      .filter(([name]) => !name.startsWith('._') && !name.startsWith('.DS_Store'))
      .sort((a, b) => {
        // Try to extract number from filename for sorting
        const numA = parseInt(a[0].match(/\d+/)?.[0] || '0');
        const numB = parseInt(b[0].match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

    for (const [originalName, file] of sortedImages) {
      const extension = this.getFileExtension(originalName);
      const newName = `${imageIndex}.${extension}`;
      
      // Create new File with correct name (no base64 conversion needed)
      const renamedFile = new File([file], newName, { type: file.type });
      imageFilesForUpload.push(renamedFile);
      imageExtensionMap.set(imageIndex, extension);
      
      onProgress?.(IPFSService.UPLOAD_STAGES.PREPARING_IMAGES, imageIndex + 1, sortedImages.length);
      console.log(`📸 Prepared image: ${originalName} → ${newName}`);
      
      imageIndex++;
    }

    console.log(`✅ Prepared ${imageFilesForUpload.length} images`);

    // Step 2: Prepare metadata files with relative image paths
    // Using relative paths (e.g., "./0.png") instead of full IPFS URLs
    // This eliminates the need for two-phase upload since paths are CID-independent
    onProgress?.(IPFSService.UPLOAD_STAGES.PREPARING_METADATA, 0, metadataFiles.length);
    
    const metadataFilesForUpload: File[] = [];

    // Sort metadata by tokenId
    const sortedMetadata = [...metadataFiles].sort((a, b) => a.tokenId - b.tokenId);

    for (let i = 0; i < sortedMetadata.length; i++) {
      const { tokenId, metadata } = sortedMetadata[i];
      const extension = imageExtensionMap.get(tokenId) || 'png';
      
      // Use relative path instead of full IPFS URL
      // This works because all files are in the same folder
      const updatedMetadata: NFTMetadata = {
        ...metadata,
        image: `./${tokenId}.${extension}`,
      };

      const jsonContent = JSON.stringify(updatedMetadata, null, 2);
      const metadataFile = new File([jsonContent], `${tokenId}.json`, { type: 'application/json' });
      metadataFilesForUpload.push(metadataFile);

      onProgress?.(IPFSService.UPLOAD_STAGES.PREPARING_METADATA, i + 1, sortedMetadata.length);
      console.log(`📝 Prepared metadata: ${tokenId}.json with relative image path`);
    }

    console.log(`✅ Prepared ${metadataFilesForUpload.length} metadata files with relative paths`);

    // Step 2.5: Create collection.json with collection-level metadata
    let collectionJsonFile: File | null = null;
    if (collectionMetadata) {
      const firstImageExtension = imageExtensionMap.get(0) || 'png';
      
      // Build collection.json content (OpenSea compatible format)
      // Reference: https://docs.opensea.io/docs/metadata-standards
      const collectionJson = {
        name: collectionMetadata.name,
        description: collectionMetadata.description,
        // Use provided image URL (from uploaded cover image) or fallback to first NFT image
        image: collectionMetadata.image || `./0.${firstImageExtension}`,
        // Use provided banner URL (from uploaded banner image) or fallback to first NFT image
        banner_image: collectionMetadata.banner_image || `./0.${firstImageExtension}`,
        external_link: collectionMetadata.external_url || '',
        seller_fee_basis_points: collectionMetadata.seller_fee_basis_points,
        fee_recipient: collectionMetadata.fee_recipient,
        ...(collectionMetadata.symbol && { symbol: collectionMetadata.symbol })
      };
      
      const collectionJsonContent = JSON.stringify(collectionJson, null, 2);
      collectionJsonFile = new File([collectionJsonContent], 'collection.json', { type: 'application/json' });
      
      console.log(`📝 Created collection.json with OpenSea-compatible format`);
      console.log(`   - Name: ${collectionMetadata.name}`);
      console.log(`   - Description: ${collectionMetadata.description}`);
      console.log(`   - Image: ${collectionJson.image}`);
      console.log(`   - Banner: ${collectionJson.banner_image}`);
      console.log(`   - External Link: ${collectionJson.external_link}`);
      console.log(`   - Royalty: ${collectionMetadata.seller_fee_basis_points / 100}%`);
      console.log(`   - Fee Recipient: ${collectionMetadata.fee_recipient}`);
    }

    // Step 3: Single upload with relative paths (no need for two-phase upload)
    onProgress?.(IPFSService.UPLOAD_STAGES.UPLOADING_TO_IPFS, 0, 100);
    console.log(`📤 Uploading folder with relative paths (single upload)...`);

    // Use backend API for folder upload (nft-listener-service)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://launchpad-api.artnesh.com';
    const uploadUrl = `${backendUrl}/api/ipfs/upload-folder`;
    
    console.log(`📤 Using backend API: ${uploadUrl}`);

    // Prepare FormData for upload
    const formData = new FormData();
    formData.append('folderName', collectionName);
    
    console.log(`📦 Preparing FormData for folder: ${collectionName}`);
    console.log(`   - Images: ${imageFilesForUpload.length}`);
    console.log(`   - Metadata: ${metadataFilesForUpload.length}`);
    console.log(`   - Collection.json: ${collectionJsonFile ? 'Yes' : 'No'}`);
    
    // Add all image files
    for (const file of imageFilesForUpload) {
      formData.append('files', file, file.name);
      console.log(`   📸 Added image: ${file.name} (${(file.size / 1024).toFixed(2)} KB, ${file.type})`);
    }
    
    // Add all metadata files
    for (const file of metadataFilesForUpload) {
      formData.append('files', file, file.name);
      console.log(`   📝 Added metadata: ${file.name} (${(file.size / 1024).toFixed(2)} KB, ${file.type})`);
    }
    
    // Add collection.json if provided
    if (collectionJsonFile) {
      formData.append('files', collectionJsonFile, collectionJsonFile.name);
      console.log(`   📋 Added collection.json (${(collectionJsonFile.size / 1024).toFixed(2)} KB)`);
    }
    
    // Log total files in FormData
    const allFiles = formData.getAll('files');
    console.log(`✅ Total files in FormData: ${allFiles.length}`);
    console.log(`   - Field name: 'files'`);
    console.log(`   - Folder name: '${collectionName}'`);

    // Use XMLHttpRequest for progress tracking (fetch doesn't support upload progress)
    console.log('📤 Starting single upload with progress tracking...');
    
    let result: { folderCID: string; folderUrl: string; gatewayUrl: string; fileCount: number };
    try {
      result = await this.uploadWithProgress<typeof result>(
        uploadUrl,
        formData,
        (percentage, uploadedBytes, totalBytes) => {
          onProgress?.(
            `Uploading files... ${percentage}%`,
            percentage,
            100,
            uploadedBytes,
            totalBytes
          );
        }
      );
    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      if (error.message?.includes('timed out')) {
        throw new Error('Upload timed out. Please try again.');
      }
      throw new Error(`Failed to upload folder: ${error.message || 'Unknown error'}`);
    }
    
    onProgress?.(IPFSService.UPLOAD_STAGES.UPLOAD_COMPLETE, 100, 100);

    console.log(`✅ Folder upload complete!`);
    console.log(`   CID: ${result.folderCID}`);
    console.log(`   URL: ${result.folderUrl}`);
    console.log(`   Gateway: ${result.gatewayUrl}`);
    console.log(`   Files: ${result.fileCount}`);
    console.log(`   ✅ Using relative paths - no second upload needed!`);

    return {
      folderCID: result.folderCID,
      folderUrl: result.folderUrl,
      gatewayUrl: result.gatewayUrl,
    };
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();
