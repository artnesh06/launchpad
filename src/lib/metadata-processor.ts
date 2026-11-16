/**
 * Metadata Processing Service
 * Handles ZIP extraction, metadata generation, and processing for NFT collections
 */

import JSZip from 'jszip';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  [key: string]: any;
}

export interface ProcessedMetadata {
  metadata: NFTMetadata;
  fileName: string;
  tokenId: number;
}

export interface ProcessedCollection {
  metadataFiles: ProcessedMetadata[];
  imageFiles: Map<string, File>;
  totalItems: number;
}

export class MetadataProcessor {
  /**
   * Extract and process ZIP file for Standard Edition collections
   */
  async extractAndProcessZIP(zipFile: File): Promise<ProcessedCollection> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipFile);

    const metadataFiles: ProcessedMetadata[] = [];
    const imageFiles = new Map<string, File>();

    // Process all files in ZIP
    const files = Object.keys(zipContent.files);

    for (const fileName of files) {
      const file = zipContent.files[fileName];

      // Skip directories
      if (file.dir) continue;

      const fileNameLower = fileName.toLowerCase();

      // Process JSON metadata files
      if (fileNameLower.endsWith('.json')) {
        const content = await file.async('text');
        try {
          const metadata = JSON.parse(content) as NFTMetadata;

          // Extract just the filename without path (e.g., "metadata/1.json" -> "1.json")
          const baseName = fileName.split('/').pop() || fileName;
          
          // Extract token ID from filename (e.g., "1.json" -> 1)
          const tokenId = this.extractTokenIdFromFilename(baseName);

          metadataFiles.push({
            metadata,
            fileName: baseName,
            tokenId
          });
        } catch (error) {
          console.warn(`Failed to parse JSON file: ${fileName}`, error);
        }
      }

      // Process image files
      else if (this.isImageFile(fileNameLower)) {
        // Extract just the filename without path (e.g., "images/1.png" -> "1.png")
        const baseName = fileName.split('/').pop() || fileName;
        
        // Skip Mac OS hidden files and system files
        if (baseName.startsWith('._') || baseName.startsWith('.DS_Store') || baseName === '__MACOSX') {
          console.log(`⚠️  Skipping hidden/system file: ${baseName}`);
          continue;
        }
        
        const blob = await file.async('blob');
        const imageFile = new File([blob], baseName, { type: this.getImageMimeType(fileNameLower) });
        imageFiles.set(baseName, imageFile);
      }
    }

    // Sort metadata files by token ID
    metadataFiles.sort((a, b) => a.tokenId - b.tokenId);

    console.log(`📦 Extracted ZIP: ${metadataFiles.length} metadata files, ${imageFiles.size} images`);
    
    // Log first few image files for debugging
    if (imageFiles.size > 0) {
      const firstFive = Array.from(imageFiles.entries()).slice(0, 5);
      console.log('📸 Sample images:', firstFive.map(([name, file]) => 
        `${name} (${(file.size / 1024).toFixed(2)} KB, ${file.type})`
      ));
    }

    return {
      metadataFiles,
      imageFiles,
      totalItems: metadataFiles.length
    };
  }

  /**
   * Update metadata files with IPFS image URLs
   */
  updateMetadataWithIPFSImages(
    metadataFiles: ProcessedMetadata[],
    imageUrlMap: Map<string, string>
  ): ProcessedMetadata[] {
    console.log(`🔄 Updating ${metadataFiles.length} metadata files with IPFS image URLs...`);
    console.log(`📸 Available images in map: ${imageUrlMap.size}`);
    
    // Log sample of imageUrlMap for debugging
    if (imageUrlMap.size > 0) {
      const sampleEntries = Array.from(imageUrlMap.entries()).slice(0, 3);
      console.log('📸 Sample imageUrlMap entries:');
      sampleEntries.forEach(([name, url]) => console.log(`   - "${name}" → "${url}"`));
    }

    return metadataFiles.map(item => {
      const metadata = { ...item.metadata };
      const tokenId = item.tokenId;
      let foundMatch = false;

      // Check if metadata already has image reference
      if (metadata.image) {
        // Extract filename from image path (handle various formats)
        const imagePath = metadata.image;
        const imageFileName = imagePath.split('/').pop() || imagePath;
        
        // Try exact match first
        let ipfsUrl = imageUrlMap.get(imageFileName);
        
        // If not found, try case-insensitive match
        if (!ipfsUrl) {
          const lowerFileName = imageFileName.toLowerCase();
          for (const [key, value] of imageUrlMap.entries()) {
            if (key.toLowerCase() === lowerFileName) {
              ipfsUrl = value;
              break;
            }
          }
        }
        
        // If still not found, try matching by base name (without extension)
        if (!ipfsUrl) {
          const baseName = imageFileName.replace(/\.[^/.]+$/, ''); // Remove extension
          for (const [key, value] of imageUrlMap.entries()) {
            const keyBaseName = key.replace(/\.[^/.]+$/, '');
            if (keyBaseName === baseName || keyBaseName.toLowerCase() === baseName.toLowerCase()) {
              ipfsUrl = value;
              break;
            }
          }
        }

        if (ipfsUrl) {
          metadata.image = ipfsUrl;
          foundMatch = true;
        }
      }

      // If no match found from existing image field, try to find by token ID
      if (!foundMatch) {
        const possibleImageNames = [
          `${tokenId}.png`,
          `${tokenId}.jpg`,
          `${tokenId}.jpeg`,
          `${tokenId}.gif`,
          `${tokenId}.webp`,
          `image${tokenId}.png`,
          `image${tokenId}.jpg`,
          `token_${tokenId}.png`,
          `token_${tokenId}.jpg`,
          `nft${tokenId}.png`,
          `nft${tokenId}.jpg`,
        ];

        for (const imageName of possibleImageNames) {
          // Try exact match
          let ipfsUrl = imageUrlMap.get(imageName);
          
          // Try case-insensitive match
          if (!ipfsUrl) {
            const lowerImageName = imageName.toLowerCase();
            for (const [key, value] of imageUrlMap.entries()) {
              if (key.toLowerCase() === lowerImageName) {
                ipfsUrl = value;
                break;
              }
            }
          }
          
          if (ipfsUrl) {
            metadata.image = ipfsUrl;
            foundMatch = true;
            break;
          }
        }
      }

      // Fallback: use first available image if no match found
      if (!foundMatch && imageUrlMap.size > 0) {
        const firstImage = Array.from(imageUrlMap.values())[0];
        metadata.image = firstImage;
        console.warn(`⚠️ No matching image found for token ${tokenId} (original: "${item.metadata.image}"), using first available image`);
      }

      // Log if image was not updated (still has original non-IPFS value)
      // Note: Relative paths (e.g., "./0.png") are valid for folder uploads
      if (metadata.image && !metadata.image.startsWith('ipfs://') && !metadata.image.startsWith('./')) {
        console.warn(`⚠️ Token ${tokenId}: Image not updated to IPFS URL or relative path. Current value: "${metadata.image}"`);
      }

      return {
        ...item,
        metadata
      };
    });
  }

  /**
   * Generate metadata for Open Edition with full NFT metadata format
   */
  generateOpenEditionMetadata(
    collectionName: string,
    description: string,
    imageUrl: string,
    symbol: string,
    externalLink?: string,
    attributes?: Array<{ trait_type: string; value: string | number }>,
    sellerFeeBasisPoints?: number,
    creators?: Array<{ address: string; share: number }>
  ): NFTMetadata {
    // Extract image filename from URL for properties
    const imageFileName = imageUrl.split('/').pop() || 'image.png';
    const imageExtension = imageFileName.split('.').pop()?.toLowerCase() || 'png';
    const mimeType = `image/${imageExtension === 'jpg' ? 'jpeg' : imageExtension}`;

    return {
      name: collectionName,
      symbol: symbol,
      description,
      seller_fee_basis_points: sellerFeeBasisPoints || 0,
      image: imageUrl,
      external_url: externalLink || '',
      attributes: attributes || [],
      properties: {
        files: [
          {
            uri: imageUrl,
            type: mimeType
          }
        ],
        category: 'image',
        creators: creators || []
      }
    };
  }

  /**
   * Validate metadata structure
   */
  validateMetadata(metadata: NFTMetadata): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('Metadata must have a valid "name" field');
    }

    if (!metadata.description || typeof metadata.description !== 'string') {
      errors.push('Metadata must have a valid "description" field');
    }

    if (!metadata.image || typeof metadata.image !== 'string') {
      errors.push('Metadata must have a valid "image" field');
    }

    if (metadata.attributes && !Array.isArray(metadata.attributes)) {
      errors.push('Metadata "attributes" must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate collection structure
   * Supports metadata starting from 0 or 1
   */
  validateCollection(collection: ProcessedCollection, expectedSupply: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (collection.metadataFiles.length === 0) {
      errors.push('Collection must have at least one metadata file');
    }

    // Allow more metadata files than expected supply (will be trimmed later)
    if (collection.metadataFiles.length < expectedSupply) {
      errors.push(`Collection has ${collection.metadataFiles.length} metadata files but expected at least ${expectedSupply}`);
    }

    // Check for duplicate token IDs
    const tokenIds = collection.metadataFiles.map(m => m.tokenId);
    const uniqueTokenIds = new Set(tokenIds);
    if (uniqueTokenIds.size !== tokenIds.length) {
      errors.push('Collection has duplicate token IDs');
    }

    // Auto-detect if metadata starts from 0 or 1
    const sortedIds = [...tokenIds].sort((a, b) => a - b);
    const startsFromZero = sortedIds[0] === 0;
    const startsFromOne = sortedIds[0] === 1;

    if (!startsFromZero && !startsFromOne) {
      errors.push(`Token IDs must start from 0 or 1. Found starting ID: ${sortedIds[0]}`);
    } else {
      // Check for sequential token IDs
      const startingId = startsFromZero ? 0 : 1;
      for (let i = 0; i < sortedIds.length; i++) {
        if (sortedIds[i] !== startingId + i) {
          errors.push(`Token IDs must be sequential. Missing or invalid ID at position ${i} (expected ${startingId + i}, got ${sortedIds[i]})`);
          break;
        }
      }
    }

    // Validate each metadata (only check first expectedSupply items)
    const itemsToValidate = collection.metadataFiles.slice(0, expectedSupply);
    itemsToValidate.forEach((item, index) => {
      const validation = this.validateMetadata(item.metadata);
      if (!validation.isValid) {
        errors.push(`Metadata file ${item.fileName}: ${validation.errors.join(', ')}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract token ID from filename
   */
  private extractTokenIdFromFilename(fileName: string): number {
    // Remove path and extension
    const baseName = fileName.split('/').pop()?.replace(/\.(json|png|jpg|jpeg|gif|webp)$/i, '') || '0';

    // Try to extract number from filename
    const match = baseName.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if file is an image
   */
  private isImageFile(fileName: string): boolean {
    return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileName);
  }

  /**
   * Get MIME type for image file
   */
  private getImageMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };

    return mimeTypes[ext || ''] || 'image/png';
  }

  /**
   * Create metadata files as JSON blobs
   * Auto-converts to 0-based indexing to match ERC721A standard
   * Supports input metadata starting from 0 or 1
   */
  createMetadataFiles(metadataItems: ProcessedMetadata[], expectedSupply?: number): File[] {
    // Sort by tokenId to ensure correct order
    const sortedItems = [...metadataItems].sort((a, b) => a.tokenId - b.tokenId);
    
    // Detect if metadata starts from 0 or 1
    const startsFromOne = sortedItems.length > 0 && sortedItems[0].tokenId === 1;
    
    // Trim to expected supply if provided
    const itemsToUse = expectedSupply ? sortedItems.slice(0, expectedSupply) : sortedItems;
    
    console.log(`📝 Creating metadata files:`);
    console.log(`   - Total items: ${itemsToUse.length}`);
    console.log(`   - Starts from: ${startsFromOne ? '1 (will convert to 0-based)' : '0 (already 0-based)'}`);
    
    return itemsToUse.map((item, index) => {
      const jsonString = JSON.stringify(item.metadata, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Always use 0-based index for output files (0.json, 1.json, 2.json, etc.)
      // This matches ERC721A tokenId which starts from 0
      const outputFileName = `${index}.json`;
      
      if (index < 3 || index === itemsToUse.length - 1) {
        console.log(`   - ${item.fileName} (tokenId: ${item.tokenId}) → ${outputFileName}`);
      } else if (index === 3) {
        console.log(`   - ... (${itemsToUse.length - 4} more files)`);
      }
      
      return new File([blob], outputFileName, { type: 'application/json' });
    });
  }

  /**
   * Generate preview data for UI
   */
  generatePreview(collection: ProcessedCollection, limit: number = 5) {
    return {
      totalItems: collection.totalItems,
      totalImages: collection.imageFiles.size,
      preview: collection.metadataFiles.slice(0, limit).map(item => ({
        tokenId: item.tokenId,
        name: item.metadata.name,
        description: item.metadata.description?.substring(0, 100) + (item.metadata.description?.length > 100 ? '...' : ''),
        hasImage: !!item.metadata.image,
        attributeCount: item.metadata.attributes?.length || 0
      }))
    };
  }
}

// Export singleton instance
export const metadataProcessor = new MetadataProcessor();
