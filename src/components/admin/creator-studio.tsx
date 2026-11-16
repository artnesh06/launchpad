'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload01Icon, Tick01Icon, Loading01Icon } from '@hugeicons/core-free-icons';
import { SUPPORTED_CHAINS, getDefaultChain, type ChainConfig } from '@/config/chains';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { type CollectionData, type MintPhase } from './simple-collection-creator';
import { CustomInput } from '@/components/ui/custom-input';
import { CustomSelect } from '@/components/ui/custom-select';
import { FileUpload } from '@/components/ui/file-upload';
import { MetadataCard } from '@/components/ui/metadata-card';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { SingleDateTimePicker } from '@/components/ui/single-date-time-picker';
import { NetworkGuard, useNetworkGuard } from '@/components/network-guard';
import { triggerConfetti } from '@/lib/confetti';
import { getCreatorAuthHeadersSafe } from '@/lib/creator-auth-client';

interface CreatorStudioProps {
  onSubmit?: (data: CollectionData) => void;
  factoryInfo?: {
    creationFee: string;
    platformFeePercentage: number;
  };
}

export default function CreatorStudio({ onSubmit, factoryInfo }: CreatorStudioProps) {
  const defaultChain = getDefaultChain();
  const [selectedChainId, setSelectedChainId] = useState(defaultChain?.id || 6343);
  const [collectionType, setCollectionType] = useState<'standard' | 'open'>('open');

  const [collectionData, setCollectionData] = useState<CollectionData>({
    // Basic Info (Required)
    name: '',
    symbol: '',
    description: '',
    baseURI: '',
    unrevealedURI: '',
    contractURI: '',
    externalLink: '',
    totalMaxSupply: 0,
    treasury: '', // Will be set to deployer's wallet address
    royaltyRecipient: '', // Will be set to deployer's wallet address
    royaltyPercentage: 0, // 0% in basis points

    // Collection Configuration
    chainId: defaultChain?.id || 6343,
    isRevealed: false,

    // Platform Fee Configuration
    platformFeePercentage: factoryInfo?.platformFeePercentage || 250, // 2.5%
    freeMintPlatformFee: '0',
    platformTreasury: '',
    platformFeeEnabled: true,

    // Operator Filtering
    operatorFilteringEnabled: true,
    blockedOperators: [],

    // Access Control
    adminAddresses: [],
    operatorAddresses: [],
    minterAddresses: [],

    // Emergency Controls
    pausable: false,

    // Mint Phases
    mintPhases: []
  });

  const selectedChain = SUPPORTED_CHAINS[selectedChainId] || defaultChain;

  // Prepare chain options for select
  const chainOptions = Object.values(SUPPORTED_CHAINS).map(chain => ({
    value: chain.id.toString(),
    label: chain.name,
    icon: chain.icon
  }));

  // Mint phases state - default hanya public phase
  const [whitelistPhases, setWhitelistPhases] = useState<Array<{
    id: string;
    name: string;
    startDate: Date | undefined;
    endDate: Date | undefined;
    startEndTime: string;
    price: string;
    maxPerAddress: string;
    addressCount: number;
    csvFile: File | null;
  }>>([]);

  const [publicPhase, setPublicPhase] = useState({
    name: 'Public Mint',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    startEndTime: 'dd/mm/yyyy - dd/mm/yyyy. 7 PM UTC',
    price: '',
    maxPerAddress: ''
  });

  // Network guard hook
  const { isWrongNetwork } = useNetworkGuard(selectedChainId);

  // File upload states
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Upload tracking state - to prevent re-upload on retry
  const [uploadedData, setUploadedData] = useState<{
    imagesUploaded: boolean;
    metadataUploaded: boolean;
    coverImageUrl?: string;
    bannerImageUrl?: string;
    finalBaseURI?: string;
    finalContractURI?: string;
    manifestHash?: string;
    imageManifestHash?: string;
  } | null>(null);

  // Handle CSV file upload for specific whitelist phase
  const handleCsvUpload = (phaseId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      // Parse CSV to count addresses
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        setWhitelistPhases(prev => prev.map(phase =>
          phase.id === phaseId
            ? { ...phase, csvFile: file, addressCount: lines.length - 1 }
            : phase
        ));
      };
      reader.readAsText(file);
    }
  };

  // Add new whitelist phase
  const addWhitelistPhase = () => {
    if (whitelistPhases.length >= 3) return; // Max 3 whitelist phases

    const newPhase = {
      id: `whitelist-${Date.now()}`,
      name: '',
      startDate: undefined as Date | undefined,
      endDate: undefined as Date | undefined,
      startEndTime: 'dd/mm/yyyy - dd/mm/yyyy. 7 PM UTC',
      price: '',
      maxPerAddress: '',
      addressCount: 0,
      csvFile: null as File | null
    };

    setWhitelistPhases(prev => [...prev, newPhase]);
  };

  // Remove whitelist phase
  const removeWhitelistPhase = (phaseId: string) => {
    // Allow removing all whitelist phases (can have 0 phases)
    setWhitelistPhases(prev => prev.filter(phase => phase.id !== phaseId));
  };

  // Helper function to normalize price input (convert comma to dot)
  const normalizePriceInput = (value: string): string => {
    // Replace comma with dot for decimal separator
    return value.replace(',', '.');
  };

  // Update whitelist phase
  const updateWhitelistPhase = (phaseId: string, field: string, value: string | Date | undefined) => {
    // Normalize price input if field is 'price'
    const normalizedValue = field === 'price' && typeof value === 'string'
      ? normalizePriceInput(value)
      : value;

    setWhitelistPhases(prev => prev.map(phase =>
      phase.id === phaseId
        ? { ...phase, [field]: normalizedValue }
        : phase
    ));
  };

  // Update whitelist phase dates
  const updateWhitelistPhaseDate = (phaseId: string, field: 'startDate' | 'endDate', date: Date | undefined) => {
    setWhitelistPhases(prev => prev.map(phase => {
      if (phase.id === phaseId) {
        const updatedPhase = { ...phase, [field]: date };

        // Update the combined startEndTime string when dates change
        if (updatedPhase.startDate && updatedPhase.endDate) {
          updatedPhase.startEndTime = `${updatedPhase.startDate.toLocaleDateString('en-GB')} - ${updatedPhase.endDate.toLocaleDateString('en-GB')}. 7 PM UTC`;
        }

        return updatedPhase;
      }
      return phase;
    }));
  };

  // Update public phase dates
  const updatePublicPhaseDate = (field: 'startDate' | 'endDate', date: Date | undefined) => {
    setPublicPhase(prev => {
      const updatedPhase = { ...prev, [field]: date };

      // Update the combined startEndTime string when dates change
      if (updatedPhase.startDate && updatedPhase.endDate) {
        updatedPhase.startEndTime = `${updatedPhase.startDate.toLocaleDateString('en-GB')} - ${updatedPhase.endDate.toLocaleDateString('en-GB')}. 7 PM UTC`;
      }

      return updatedPhase;
    });
  };

  // Form validation and loading states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
    percentage: number;
    uploadedMB?: number;
    totalMB?: number;
  } | null>(null);

  const validateForm = (): { isValid: boolean; errors: Record<string, string>; message?: string } => {
    const newErrors: Record<string, string> = {};
    const missingFields: string[] = [];

    // Basic validation with detailed messages
    if (!collectionData.name.trim()) {
      newErrors.name = 'Collection name is required';
      missingFields.push('Collection Name');
    }
    if (!collectionData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
      missingFields.push('Symbol');
    }
    if (!collectionData.description.trim()) {
      newErrors.description = 'Description is required';
      missingFields.push('Description');
    }
    if (collectionData.totalMaxSupply <= 0) {
      newErrors.totalMaxSupply = 'Max supply must be greater than 0';
      missingFields.push('Max Supply');
    }
    
    // Special validation for Open Edition
    if (collectionType === 'open' && collectionData.totalMaxSupply < 1) {
      newErrors.totalMaxSupply = 'Open Edition requires at least 1 max supply';
      missingFields.push('Max Supply (minimum 100 for Open Edition)');
    }
    
    // Royalty address will be automatically set to deployer's wallet address
    // No validation needed here

    // File validation
    if (!coverImage) {
      newErrors.coverImage = 'Cover image is required';
      missingFields.push('Cover Image (800×800px)');
    }
    if (!bannerImage) {
      newErrors.bannerImage = 'Banner image is required';
      missingFields.push('Banner Image (1000×300px)');
    }

    // Metadata/Image file validation based on collection type
    if (!metadataFile) {
      if (collectionType === 'open') {
        newErrors.metadataFile = 'Open Edition image is required';
        missingFields.push('Open Edition Image (1 image for all NFTs)');
      } else {
        newErrors.metadataFile = 'Metadata collection file is required';
        missingFields.push('Metadata Collection File (ZIP/folder)');
      }
    } else {
      // Validate file type based on collection type
      if (collectionType === 'open') {
        // Open Edition: must be image
        if (!metadataFile.type.startsWith('image/')) {
          newErrors.metadataFile = 'Open Edition requires an image file';
          missingFields.push('Valid Image File (jpg, png, etc)');
        }
      } else {
        // Standard Collection: should be ZIP
        const isZip = metadataFile.type === 'application/zip' ||
          metadataFile.type === 'application/x-zip-compressed' ||
          metadataFile.name.endsWith('.zip');

        if (!isZip && !metadataFile.type.startsWith('image/') && !metadataFile.type.includes('json')) {
          newErrors.metadataFile = 'Standard Collection requires ZIP file containing metadata';
          missingFields.push('Valid ZIP File (containing metadata)');
        }
      }
    }

    setErrors(newErrors);

    const isValid = Object.keys(newErrors).length === 0;
    let message = '';

    if (!isValid) {
      if (missingFields.length === 1) {
        message = `Please fill in: ${missingFields[0]}`;
      } else if (missingFields.length === 2) {
        message = `Please fill in: ${missingFields[0]} and ${missingFields[1]}`;
      } else if (missingFields.length > 2) {
        message = `Please fill in ${missingFields.length} required fields:\n• ${missingFields.slice(0, 5).join('\n• ')}${missingFields.length > 5 ? `\n• ...and ${missingFields.length - 5} more` : ''}`;
      }
    }

    return { isValid, errors: newErrors, message };
  };

  // Helper function to parse CSV and generate merkle root
  const generateMerkleRoot = async (csvFile: File): Promise<{ root: string; addresses: string[] }> => {
    const { WhitelistManager } = await import('@/lib/contract-service');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());

          const whitelistManager = new WhitelistManager();
          const addresses: string[] = [];

          // Parse CSV (expecting format: address,allocation or just address)
          lines.forEach((line, index) => {
            if (index === 0 && line.toLowerCase().includes('address')) return; // Skip header

            const parts = line.split(',').map(p => p.trim());
            const address = parts[0];
            const allocation = parts[1] ? parseInt(parts[1]) : 1;

            if (address && address.startsWith('0x')) {
              whitelistManager.addAddress(address, allocation);
              addresses.push(address);
            }
          });

          const merkleRoot = whitelistManager.generateMerkleTree();
          console.log('✅ Merkle root generated:', merkleRoot);
          console.log('📋 Whitelisted addresses:', addresses.length);

          resolve({ root: merkleRoot, addresses });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(csvFile);
    });
  };

  // Helper function to upload files to IPFS
  const uploadToIPFS = async (file: File, filename?: string): Promise<string> => {
    const { ipfsService } = await import('@/lib/ipfs-service');

    try {
      const result = await ipfsService.uploadFile(file);
      console.log('✅ File uploaded to IPFS:', result.ipfsUrl);
      return result.ipfsUrl;
    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      throw new Error(`Failed to upload ${filename || file.name} to IPFS`);
    }
  };

  // Helper function to convert date to Unix timestamp (UTC)
  const dateToUnixTimestamp = (dateString: string | Date | undefined, isEndTime: boolean = false): number => {
    if (!dateString) {
      // If no date provided, use current time + offset
      const now = Math.floor(Date.now() / 1000);
      if (isEndTime) {
        // End time: current time + 30 days
        return now + (30 * 24 * 60 * 60);
      } else {
        // Start time: current time
        return now;
      }
    }
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    // Use getTime() which returns UTC milliseconds since epoch
    return Math.floor(date.getTime() / 1000);
  };

  const handleSubmit = async () => {
    // Check network first
    if (isWrongNetwork) {
      toast.error('Wrong Network', {
        description: 'Please switch to the correct network before creating a collection.',
        duration: 5000,
        id: TOAST_ID
      });
      return;
    }

    const validation = validateForm();

    if (!validation.isValid) {
      toast.error('Validation Failed', {
        description: validation.message,
        duration: 5000,
        id: TOAST_ID
      });
      return;
    }

    setIsSubmitting(true);
    setLoadingProgress(0);

    try {
      // Import required services
      const { ContractService } = await import('@/lib/contract-service');
      const { ipfsService } = await import('@/lib/ipfs-service');
      const { metadataProcessor } = await import('@/lib/metadata-processor');

      const contractService = new ContractService();

      // Get deployer's wallet address early to use for treasury and royaltyRecipient
      const ethers = (await import('ethers')).ethers;
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const creatorAddress = await signer.getAddress();

      console.log('🚀 Starting NFT Collection creation with Creator Studio...');
      console.log(`📋 Collection Type: ${collectionType === 'standard' ? 'Standard Edition' : 'Open Edition'}`);
      console.log(`👤 Deployer Address: ${creatorAddress}`);
      console.log(`💰 Treasury & Royalty Recipient will be set to: ${creatorAddress}`);

      // ===== STEP 1: Upload Files to IPFS =====
      setLoadingStep('Processing and uploading files to IPFS...');
      setLoadingProgress(10);
      console.log('📤 Step 1: Processing files...');

      let finalBaseURI = collectionData.baseURI;
      let finalContractURI = collectionData.contractURI;
      let coverImageUrl = '';
      let bannerImageUrl = '';
      let manifestHash = ''; // Store manifest hash for database
      let imageManifestHash = ''; // Store image manifest hash for image URL resolution

      // Check if we already have uploaded data from previous attempt
      if (uploadedData && uploadedData.imagesUploaded && uploadedData.metadataUploaded) {
        console.log('✅ Using previously uploaded data (skipping re-upload)');
        console.log('   This saves time and prevents duplicate uploads!');

        finalBaseURI = uploadedData.finalBaseURI || '';
        finalContractURI = uploadedData.finalContractURI || '';
        coverImageUrl = uploadedData.coverImageUrl || '';
        bannerImageUrl = uploadedData.bannerImageUrl || '';
        manifestHash = uploadedData.manifestHash || '';
        imageManifestHash = uploadedData.imageManifestHash || '';

        setLoadingStep('✅ Using cached upload data...');
        setLoadingProgress(70);
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('📋 Cached data:');
        console.log('   - Base URI:', finalBaseURI);
        console.log('   - Contract URI:', finalContractURI);
        console.log('   - Manifest Hash:', manifestHash);
        console.log('   - Image Manifest Hash:', imageManifestHash);
      } else if (collectionType === 'standard' && metadataFile) {
        // ===== STANDARD EDITION: Process ZIP file and upload as TRUE FOLDER =====
        // Uses Pinata SDK fileArray to upload all files as a single folder with ONE CID
        // 
        // OPTIMIZATION: Uses relative paths in metadata (e.g., "./0.png") instead of full IPFS URLs
        // This eliminates the need for two-phase upload:
        // - Old approach: Upload twice (once to get CID, then re-upload with correct URLs)
        // - New approach: Upload once with relative paths (CID-independent)
        // 
        // Benefits:
        // - 50% faster upload (single upload instead of double)
        // - Less bandwidth usage
        // - Simpler code flow
        // - IPFS gateways automatically resolve relative paths
        // 
        // Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3, 6.4
        console.log('📦 Processing Standard Edition ZIP file...');
        console.log('📁 Using TRUE FOLDER upload method (single CID for all files)');
        console.log('✅ Using relative paths - single upload optimization enabled');

        setLoadingStep('Extracting ZIP file...');
        setLoadingProgress(15);

        const processedCollection = await metadataProcessor.extractAndProcessZIP(metadataFile);
        console.log(`✅ Extracted: ${processedCollection.totalItems} metadata files, ${processedCollection.imageFiles.size} images`);

        setLoadingStep('Validating collection structure...');
        setLoadingProgress(20);

        // Validate collection
        const validation = metadataProcessor.validateCollection(processedCollection, collectionData.totalMaxSupply);
        if (!validation.isValid) {
          // Task 4.4: Show descriptive error messages for validation failures
          const errorDetails = validation.errors.join('\n• ');
          console.error('❌ Collection validation failed:', validation.errors);
          throw new Error(`Collection validation failed:\n• ${errorDetails}\n\nPlease fix the issues and try again.`);
        }

        // Validate file counts match
        const imageCount = processedCollection.imageFiles.size;
        const metadataCount = processedCollection.metadataFiles.length;
        if (imageCount !== metadataCount) {
          throw new Error(`File count mismatch: ${imageCount} images but ${metadataCount} metadata files. Each NFT needs exactly one image and one metadata file.`);
        }

        // Task 4.1: Detect collection type - Standard Collection uses folder upload
        console.log('🔍 Collection type detected: Standard Edition');
        console.log('📁 Using uploadCollectionAsFolder for true folder upload');

        setLoadingStep('Preparing files for folder upload...');
        setLoadingProgress(25);

        // Prepare metadata files array for uploadCollectionAsFolder
        // Convert Map to Array format expected by the method
        const metadataFilesArray: Array<{ tokenId: number; metadata: any }> = [];

        // Sort metadata files by token ID (0-based)
        // metadataFiles is already an array of ProcessedMetadata with tokenId
        const sortedMetadataEntries = [...processedCollection.metadataFiles]
          .sort((a, b) => a.tokenId - b.tokenId);

        // Convert to 0-based token IDs and prepare for upload
        sortedMetadataEntries.forEach((item, index) => {
          // Use 0-based index as tokenId
          metadataFilesArray.push({
            tokenId: index,
            metadata: {
              ...item.metadata, // Include any other fields first
              name: item.metadata.name || `${collectionData.name} #${index}`,
              description: item.metadata.description || collectionData.description,
              attributes: item.metadata.attributes || []
            }
          });
        });

        console.log(`📝 Prepared ${metadataFilesArray.length} metadata files for folder upload`);

        // Task 4.2: Use uploadCollectionAsFolder for true folder upload
        setLoadingStep('Uploading collection as folder to IPFS...');
        setLoadingProgress(30);

        const totalFiles = imageCount + metadataCount;
        const estimatedMinutes = Math.ceil(totalFiles * 0.3 / 60); // ~0.3s per file

        // Calculate total file size in MB
        let totalSizeBytes = 0;
        processedCollection.imageFiles.forEach((file) => {
          totalSizeBytes += file.size;
        });
        const totalSizeMB = totalSizeBytes / (1024 * 1024);

        setUploadProgress({
          current: 0,
          total: totalFiles,
          fileName: `Preparing ${totalFiles} files for folder upload... (est. ${estimatedMinutes} min)`,
          percentage: 0,
          uploadedMB: 0,
          totalMB: totalSizeMB
        });

        try {
          // Call the new uploadCollectionAsFolder method
          const folderUploadResult = await ipfsService.uploadCollectionAsFolder(
            processedCollection.imageFiles,
            metadataFilesArray,
            collectionData.name,
            (stage: string, current: number, total: number, uploadedBytes?: number, totalBytes?: number) => {
              // Use actual percentage from callback (0-100)
              const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

              // Calculate uploaded MB from actual bytes if available, otherwise estimate from percentage
              let uploadedMB: number;
              let actualTotalMB: number;

              if (uploadedBytes !== undefined && totalBytes !== undefined && totalBytes > 0) {
                // Use actual bytes from XMLHttpRequest progress
                uploadedMB = uploadedBytes / (1024 * 1024);
                actualTotalMB = totalBytes / (1024 * 1024);
              } else {
                // Fallback: estimate from percentage
                uploadedMB = (percentage / 100) * totalSizeMB;
                actualTotalMB = totalSizeMB;
              }

              console.log(`📊 Folder upload progress: ${stage} - ${percentage}% - ${uploadedMB.toFixed(2)}MB / ${actualTotalMB.toFixed(2)}MB`);

              setUploadProgress({
                current,
                total,
                fileName: stage,
                percentage,
                uploadedMB,
                totalMB: actualTotalMB
              });

              // Update main progress bar (30% to 65% range for folder upload)
              const progressInRange = 30 + (percentage * 0.35);
              setLoadingProgress(Math.round(progressInRange));
            },
            // Collection metadata for collection.json
            {
              name: collectionData.name,
              description: collectionData.description,
              symbol: collectionData.symbol,
              image: coverImageUrl, // Use uploaded cover image URL
              banner_image: bannerImageUrl, // Use uploaded banner image URL
              external_url: collectionData.externalLink,
              seller_fee_basis_points: collectionData.royaltyPercentage, // Already in basis points (e.g., 500 = 5%)
              fee_recipient: creatorAddress // Use deployer's wallet address
            }
          );

          console.log('');
          console.log('🎉 STANDARD EDITION - TRUE FOLDER UPLOAD COMPLETE:');
          console.log(`   📁 Folder CID: ${folderUploadResult.folderCID}`);
          console.log(`   🔗 Folder URL: ${folderUploadResult.folderUrl}`);
          console.log(`   🌐 Gateway URL: ${folderUploadResult.gatewayUrl}`);
          console.log('');
          console.log('✅ All files uploaded as a single folder with ONE CID');
          console.log('✅ No manifest needed - direct IPFS folder access');
          console.log('✅ Using relative paths - single upload (2x faster than old method)');
          console.log('✅ Metadata accessible at: ipfs://{CID}/0.json, ipfs://{CID}/1.json, etc.');
          console.log('✅ Images accessible at: ipfs://{CID}/0.png, ipfs://{CID}/1.png, etc.');
          console.log('✅ Image URLs in metadata use relative paths (e.g., "./0.png")');
          console.log('');

          // Task 4.2: Set baseURI to folder URL (ipfs://{FolderCID}/)
          finalBaseURI = folderUploadResult.folderUrl;

          // Task 4.3: No manifest needed for folder uploads
          manifestHash = ''; // Empty - not needed for folder uploads
          imageManifestHash = ''; // Empty - not needed for folder uploads

          console.log(`📍 BaseURI set to: ${finalBaseURI}`);
          console.log('   ✅ Direct IPFS folder URL - no resolver API needed');
          console.log('   ✅ manifestHash: null (not needed for folder uploads)');
          console.log('   ✅ imageManifestHash: null (not needed for folder uploads)');

          // Clear upload progress after completion
          setUploadProgress(null);
          setLoadingProgress(65);

          // Save uploaded data to state to prevent re-upload on retry
          setUploadedData({
            imagesUploaded: true,
            metadataUploaded: true,
            finalBaseURI,
            manifestHash: '', // null for folder uploads
            imageManifestHash: '' // null for folder uploads
          });

          console.log('💾 Upload data cached for retry protection');

        } catch (uploadError: any) {
          // Task 4.4: Handle folder upload errors with descriptive messages
          console.error('❌ Folder upload failed:', uploadError);

          // Parse error message for user-friendly display
          let userMessage = uploadError.message || 'Unknown error during folder upload';

          if (userMessage.includes('File validation failed')) {
            // Show which files are invalid
            throw new Error(`Invalid files detected:\n${userMessage}\n\nPlease fix the invalid files and try again.`);
          } else if (userMessage.includes('timed out') || userMessage.includes('timeout')) {
            // Suggest retry on network issues
            throw new Error(`Upload timed out. This may be due to network issues or large file sizes.\n\nSuggestions:\n• Check your internet connection\n• Try uploading fewer files\n• Try again in a few minutes`);
          } else if (userMessage.includes('413') || userMessage.includes('payload')) {
            throw new Error(`Files too large for upload. Please reduce the size of your images or split into smaller batches.`);
          } else {
            throw new Error(`Folder upload failed: ${userMessage}\n\nPlease try again. If the problem persists, contact support.`);
          }
        }

      } else if (collectionType === 'open' && metadataFile) {
        // ===== OPEN EDITION: Single image =====
        console.log('🖼️ Processing Open Edition single image...');

        setLoadingStep('Preparing image upload...');
        setLoadingProgress(15);
        await new Promise(resolve => setTimeout(resolve, 200));

        setLoadingStep('Uploading image to IPFS...');
        setLoadingProgress(20);

        // Upload the single image
        const imageResult = await ipfsService.uploadFile(metadataFile);
        console.log(`✅ Image uploaded to IPFS: ${imageResult.ipfsUrl}`);
        console.log(`📁 Image IPFS Hash: ${imageResult.ipfsHash}`);

        setLoadingStep('Generating metadata...');
        setLoadingProgress(40);

        // Generate metadata for Open Edition with full NFT metadata format
        const metadata = metadataProcessor.generateOpenEditionMetadata(
          collectionData.name,
          collectionData.description,
          imageResult.ipfsUrl, // Image IPFS URL
          collectionData.symbol,
          collectionData.externalLink,
          [], // attributes - can be customized later
          collectionData.royaltyPercentage, // seller_fee_basis_points
          [{ address: creatorAddress, share: 100 }] // creators
        );

        setLoadingStep('Validating metadata...');
        setLoadingProgress(50);

        // Validate metadata
        const validation = metadataProcessor.validateMetadata(metadata);
        if (!validation.isValid) {
          throw new Error(`Metadata validation failed:\n${validation.errors.join('\n')}`);
        }

        setLoadingStep('Uploading metadata JSON to IPFS...');
        setLoadingProgress(60);

        // For Open Edition, upload metadata.json as a single file
        // This creates URL: ipfs://bafkrei... (direct file hash)
        // Use uploadJSON for direct JSON upload (no FormData, no payload limit issue)
        const metadataResult = await ipfsService.uploadJSON(
          metadata,
          'metadata.json'
        );

        console.log(`✅ Metadata file uploaded to IPFS: ${metadataResult.ipfsUrl}`);
        console.log(`📁 Metadata IPFS Hash: ${metadataResult.ipfsHash}`);
        console.log('');
        console.log('🎉 OPEN EDITION - 2 IPFS HASHES:');
        console.log(`   1. Image File:    ipfs://${imageResult.ipfsHash}`);
        console.log(`   2. Metadata File: ipfs://${metadataResult.ipfsHash}`);
        console.log('');
        console.log('📝 Open Edition: All tokens will share the same metadata');
        console.log('   Full metadata URL: ${metadataResult.ipfsUrl}');
        console.log('');

        // For Open Edition, baseURI should be the direct IPFS hash of metadata.json
        // Contract will use this exact URL for all tokens (no appending)
        finalBaseURI = metadataResult.ipfsUrl;

        // Save uploaded data to state to prevent re-upload on retry
        setUploadedData({
          imagesUploaded: true,
          metadataUploaded: true,
          finalBaseURI
        });

        console.log('💾 Upload data cached for retry protection');
      }

      // Upload cover and banner images (for contract metadata)
      // Skip if already uploaded in previous attempt
      if ((coverImage || bannerImage) && !uploadedData?.coverImageUrl && !uploadedData?.bannerImageUrl) {
        setLoadingStep('Uploading cover and banner images...');
        setLoadingProgress(70);

        if (coverImage) {
          console.log('Uploading cover image...');
          coverImageUrl = await uploadToIPFS(coverImage, `${collectionData.symbol}-cover`);
          setLoadingProgress(72);
        }

        if (bannerImage) {
          console.log('Uploading banner image...');
          bannerImageUrl = await uploadToIPFS(bannerImage, `${collectionData.symbol}-banner`);
          setLoadingProgress(74);
        }

        // Create and upload contract metadata if images are provided
        if (coverImageUrl && !finalContractURI) {
          setLoadingStep('Creating contract metadata...');
          console.log('Creating contract metadata...');

          const contractMetadata = await ipfsService.uploadContractMetadata({
            name: collectionData.name,
            symbol: collectionData.symbol, // Include symbol for better explorer compatibility
            description: collectionData.description,
            image: coverImageUrl,
            bannerImage: bannerImageUrl, // Include banner image
            externalLink: collectionData.externalLink,
            sellerFeeBasisPoints: collectionData.royaltyPercentage,
            feeRecipient: creatorAddress // Use deployer's wallet address
          });

          finalContractURI = contractMetadata.ipfsUrl;
          console.log('✅ Contract metadata uploaded:', finalContractURI);
          console.log('   - Cover Image:', coverImageUrl);
          console.log('   - Banner Image:', bannerImageUrl);
        }

        // Update cached data with cover/banner URLs
        setUploadedData(prev => ({
          ...prev!,
          coverImageUrl,
          bannerImageUrl,
          finalContractURI
        }));

        console.log('💾 Cover/banner data cached');

        setLoadingProgress(75);
      } else if (uploadedData?.coverImageUrl || uploadedData?.bannerImageUrl) {
        // Use cached cover/banner data
        console.log('✅ Using cached cover/banner images');
        coverImageUrl = uploadedData.coverImageUrl || '';
        bannerImageUrl = uploadedData.bannerImageUrl || '';
        finalContractURI = uploadedData.finalContractURI || '';
        setLoadingProgress(75);
      } else {
        // Skip to 75% if no images to upload
        setLoadingProgress(75);
      }

      // ===== STEP 2: Process Whitelist & Generate Merkle Roots =====
      setLoadingStep('Processing whitelists and generating merkle roots...');
      setLoadingProgress(78);
      console.log('🌳 Step 2: Processing whitelists and generating merkle roots...');

      const processedWhitelistPhases = await Promise.all(
        whitelistPhases.map(async (phase) => {
          if (!phase.csvFile) {
            return { ...phase, merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000' };
          }

          try {
            const { root, addresses } = await generateMerkleRoot(phase.csvFile);
            console.log(`✅ Generated merkle root for ${phase.name}: ${root}`);
            console.log(`   Addresses: ${addresses.length}`);
            return { ...phase, merkleRoot: root, addressCount: addresses.length };
          } catch (error) {
            console.error(`❌ Failed to generate merkle root for ${phase.name}:`, error);
            throw error;
          }
        })
      );

      // ===== STEP 3: Create Collection via LaunchpadFactory =====
      setLoadingStep('Preparing collection deployment...');
      setLoadingProgress(80);
      console.log('📝 Step 3: Preparing collection deployment...');

      // Small delay to show the step
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoadingStep('Checking network...');
      setLoadingProgress(80);
      console.log('🔗 Checking network...');

      // Check if user is on the correct chain and auto-switch if needed
      if (window.ethereum) {
        const ethers = (await import('ethers')).ethers;
        const provider = new ethers.BrowserProvider(window.ethereum as any);
        const network = await provider.getNetwork();
        const currentChainId = Number(network.chainId);

        if (currentChainId !== selectedChainId) {
          console.log(`⚠️ Wrong network detected. Current: ${currentChainId}, Expected: ${selectedChainId}`);

          setLoadingStep('Switching network...');
          setLoadingProgress(81);

          try {
            // Try to switch to the correct network
            const chainIdHex = `0x${selectedChainId.toString(16)}`;

            await (window.ethereum as any).request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: chainIdHex }],
            });

            console.log('✅ Network switched successfully');
            toast.success('Network Switched', {
              id: TOAST_ID,
              description: `Switched to ${selectedChain.name}`,
              duration: 3000
            });

            // Wait a bit for the switch to complete
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              console.log('⚠️ Network not found in wallet, adding it...');

              try {
                await (window.ethereum as any).request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: `0x${selectedChainId.toString(16)}`,
                      chainName: selectedChain.name,
                      nativeCurrency: {
                        name: selectedChain.nativeCurrency.name,
                        symbol: selectedChain.nativeCurrency.symbol,
                        decimals: selectedChain.nativeCurrency.decimals,
                      },
                      rpcUrls: [selectedChain.rpcUrl],
                      blockExplorerUrls: [selectedChain.blockExplorer],
                    },
                  ],
                });

                console.log('✅ Network added and switched successfully');
                toast.success('Network Added', {
                  id: TOAST_ID,
                  description: `${selectedChain.name} has been added to your wallet`,
                  duration: 3000
                });

                // Wait a bit for the addition to complete
                await new Promise(resolve => setTimeout(resolve, 1000));

              } catch (addError) {
                console.error('❌ Failed to add network:', addError);
                throw new Error(
                  `Failed to add ${selectedChain.name} to your wallet. Please add it manually.`
                );
              }
            } else if (switchError.code === 4001) {
              // User rejected the request
              throw new Error('Network switch rejected. Please switch to the correct network manually.');
            } else {
              console.error('❌ Failed to switch network:', switchError);
              throw new Error(
                `Failed to switch network. Please switch to ${selectedChain.name} (Chain ID: ${selectedChainId}) manually.`
              );
            }
          }
        } else {
          console.log('✅ Already on the correct network');
        }
      }

      setLoadingStep('Preparing mint phases...');
      setLoadingProgress(78);
      console.log('📋 Preparing mint phases for deployment...');

      // Prepare phases array for contract
      const phasesForContract: any[] = [];

      // Add whitelist phases
      for (const phase of processedWhitelistPhases) {
        if (!phase.name) continue;

        // VALIDATION: Whitelist phase MUST have CSV uploaded
        const hasWhitelist = phase.csvFile && phase.merkleRoot && phase.merkleRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        if (!hasWhitelist) {
          toast.error(`Whitelist phase "${phase.name}" requires CSV file`, {
            description: 'Please upload a CSV file with wallet addresses or remove this phase',
            id: 'whitelist-csv-required'
          });
          throw new Error(`Whitelist phase "${phase.name}" requires CSV file with wallet addresses`);
        }

        const startTime = dateToUnixTimestamp(phase.startDate, false);
        const endTime = dateToUnixTimestamp(phase.endDate, true);

        // Ensure endTime is after startTime
        const validEndTime = endTime > startTime ? endTime : startTime + (7 * 24 * 60 * 60); // +7 days if invalid

        // IMPORTANT: Use reasonable maxSupply that doesn't exceed collection totalMaxSupply
        // For whitelist phases, use the smaller of: addressCount or totalMaxSupply
        const phaseMaxSupply = Math.min(phase.addressCount || 1000, collectionData.totalMaxSupply);

        phasesForContract.push({
          name: phase.name,
          startTime: startTime,
          endTime: validEndTime,
          price: phase.price.replace(' ETH', '') || '0', // Send as ETH string, not Wei
          maxSupply: phaseMaxSupply,
          maxPerWallet: parseInt(phase.maxPerAddress) || 10,
          maxPerTransaction: parseInt(phase.maxPerAddress) || 10,
          merkleRoot: phase.merkleRoot,
          requiresWhitelist: true // Whitelist phases ALWAYS require whitelist
        });

        console.log(`✅ Whitelist phase "${phase.name}": ${new Date(startTime * 1000).toISOString()} → ${new Date(validEndTime * 1000).toISOString()}`);
        console.log(`   Phase maxSupply: ${phaseMaxSupply} (capped at collection totalMaxSupply: ${collectionData.totalMaxSupply})`);
        console.log(`   Whitelist addresses: ${phase.addressCount}`);
        console.log(`   requiresWhitelist: true (WHITELIST PHASE)`);
      }

      // Add public phase - always add if price or dates are set, use default name if empty
      const hasPublicPhaseData = publicPhase.price || publicPhase.startDate || publicPhase.endDate || publicPhase.maxPerAddress;
      if (publicPhase.name || hasPublicPhaseData) {
        const startTime = dateToUnixTimestamp(publicPhase.startDate, false);
        const endTime = dateToUnixTimestamp(publicPhase.endDate, true);

        // Ensure endTime is after startTime
        const validEndTime = endTime > startTime ? endTime : startTime + (30 * 24 * 60 * 60); // +30 days if invalid

        const phaseName = publicPhase.name || 'Public Mint'; // Default name if empty

        // IMPORTANT: Use totalMaxSupply from collection data, not hardcoded value
        // This ensures phase maxSupply doesn't exceed collection totalMaxSupply
        const phaseMaxSupply = collectionData.totalMaxSupply;

        phasesForContract.push({
          name: phaseName,
          startTime: startTime,
          endTime: validEndTime,
          price: publicPhase.price.replace(' ETH', '') || '0', // Send as ETH string, not Wei
          maxSupply: phaseMaxSupply,
          maxPerWallet: parseInt(publicPhase.maxPerAddress) || 10,
          maxPerTransaction: parseInt(publicPhase.maxPerAddress) || 10,
          merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
          requiresWhitelist: false // Public phases NEVER require whitelist
        });

        console.log(`✅ Public phase "${phaseName}": ${new Date(startTime * 1000).toISOString()} → ${new Date(validEndTime * 1000).toISOString()}`);
        console.log(`   Phase maxSupply: ${phaseMaxSupply} (matches collection totalMaxSupply)`);
        console.log(`   requiresWhitelist: false (PUBLIC PHASE)`);
      }

      console.log(`📊 Prepared ${phasesForContract.length} mint phase(s) for deployment`);

      if (phasesForContract.length === 0) {
        console.warn('⚠️ No phases prepared! Check if you filled in the phase forms.');
        console.log('Whitelist phases:', whitelistPhases);
        console.log('Public phase:', publicPhase);
      } else {
        console.log('✅ Phases ready:', phasesForContract.map(p => p.name).join(', '));
        
        // Validate: Sum of all phase maxSupply should not exceed collection totalMaxSupply
        const totalPhaseSupply = phasesForContract.reduce((sum, phase) => sum + phase.maxSupply, 0);
        console.log(`📊 Total phase supply: ${totalPhaseSupply}`);
        console.log(`📊 Collection max supply: ${collectionData.totalMaxSupply}`);
        
        if (totalPhaseSupply > collectionData.totalMaxSupply) {
          const errorMsg = `Total phase supply (${totalPhaseSupply}) exceeds collection max supply (${collectionData.totalMaxSupply}). Please adjust your phase limits or increase the collection max supply.`;
          console.error('❌ Validation failed:', errorMsg);
          
          toast.error('Phase Supply Exceeds Collection Supply', {
            description: errorMsg,
            duration: 8000,
            id: TOAST_ID
          });
          
          throw new Error(errorMsg);
        }
        
        console.log('✅ Phase supply validation passed');
      }

      setLoadingStep('Submitting transaction to blockchain...');
      setLoadingProgress(82);
      console.log('🔗 Submitting transaction with phases to blockchain...');
      console.log(`   - Collection will be deployed, then ${phasesForContract.length} phases added in batch!`);

      // ===== SUBTASK 7.1: Add validation before deployment =====
      console.log('🔍 Step 7.1: Validating baseURI before deployment...');

      // Validate baseURI before deployment
      if (!finalBaseURI || finalBaseURI.trim() === '') {
        const errorMsg = 'BaseURI is empty! Metadata upload may have failed. Please try again.';
        console.error('❌ Validation failed:', errorMsg);

        toast.error('Validation Failed', {
          description: errorMsg,
          duration: 5000,
          id: TOAST_ID
        });

        throw new Error(errorMsg);
      }

      // Task 4.4: Additional validation for folder uploads - ensure CID is valid
      if (collectionType === 'standard' && !manifestHash) {
        // This is a folder upload - validate the IPFS folder URL format
        if (!finalBaseURI.startsWith('ipfs://') || !finalBaseURI.endsWith('/')) {
          const errorMsg = `Invalid folder URL format: ${finalBaseURI}. Expected format: ipfs://{CID}/`;
          console.error('❌ Validation failed:', errorMsg);

          toast.error('Validation Failed', {
            description: 'Folder upload produced an invalid URL. Please try uploading again.',
            duration: 5000,
            id: TOAST_ID
          });

          throw new Error(errorMsg);
        }

        // Extract and validate CID
        const cidMatch = finalBaseURI.match(/^ipfs:\/\/([a-zA-Z0-9]+)\/$/);
        if (!cidMatch || cidMatch[1].length < 10) {
          const errorMsg = `Invalid folder CID in URL: ${finalBaseURI}. The CID appears to be malformed.`;
          console.error('❌ Validation failed:', errorMsg);

          toast.error('Validation Failed', {
            description: 'Folder upload produced an invalid CID. Please try uploading again.',
            duration: 5000,
            id: TOAST_ID
          });

          throw new Error(errorMsg);
        }

        console.log('✅ Folder CID validation passed:', cidMatch[1]);
      }

      console.log('✅ BaseURI validation passed:', finalBaseURI);

      // ===== SUBTASK 3.1: Set deploymentBaseURI based on collection type =====
      let deploymentBaseURI: string;

      // Check if this is a folder upload (manifestHash is empty and baseURI is IPFS folder URL)
      const isFolderUploadDeployment = collectionType === 'standard' && !manifestHash && finalBaseURI.startsWith('ipfs://') && finalBaseURI.endsWith('/');

      // Only need baseURI update for legacy Standard Collections (not folder uploads)
      const needsBaseURIUpdate = collectionType === 'standard' && !isFolderUploadDeployment;

      if (isFolderUploadDeployment) {
        // Standard Collection with Folder Upload: Use direct IPFS folder URL
        // Requirements: 4.1, 4.2 - Deploy with ipfs://FolderCID/ directly
        deploymentBaseURI = finalBaseURI;
        console.log('📋 Deployment Configuration (Standard Collection - Folder Upload):');
        console.log('  - Collection Type: Standard Edition (Folder Upload)');
        console.log('  - Deployment baseURI:', deploymentBaseURI);
        console.log('  - Manifest Hash: N/A (not needed for folder uploads)');
        console.log('  - ✅ Using direct IPFS folder URL (no update needed after deployment)');
      } else if (collectionType === 'standard') {
        // Standard Collection with Legacy Upload: Use temporary baseURI for deployment
        deploymentBaseURI = 'ipfs://temporary/';
        console.log('📋 Deployment Configuration (Standard Collection - Legacy):');
        console.log('  - Collection Type: Standard Edition (Legacy Upload)');
        console.log('  - Deployment baseURI: ipfs://temporary/');
        console.log('  - Manifest Hash:', manifestHash || 'N/A');
        console.log('  - Note: BaseURI will be updated after deployment with resolver API URL');
      } else {
        // Open Edition: Use direct IPFS URL
        deploymentBaseURI = finalBaseURI;
        console.log('📋 Deployment Configuration (Open Edition):');
        console.log('  - Collection Type: Open Edition');
        console.log('  - Deployment baseURI:', deploymentBaseURI);
        console.log('  - Note: Using direct IPFS URL (no update needed)');
      }

      console.log('  - contractURI:', finalContractURI || 'Not set');
      console.log('  - isRevealed: true (metadata is ready)');
      console.log('  - isOpenEdition:', collectionType === 'open');

      const createTxHash = await contractService.createLaunchpadWithPhases(selectedChainId, {
        name: collectionData.name,
        symbol: collectionData.symbol,
        description: collectionData.description,
        baseURI: deploymentBaseURI,
        unrevealedURI: collectionData.unrevealedURI || '',
        contractURI: finalContractURI || '',
        externalLink: collectionData.externalLink || '',
        totalMaxSupply: collectionData.totalMaxSupply,
        treasury: creatorAddress, // Use deployer's wallet address
        royaltyRecipient: creatorAddress, // Use deployer's wallet address
        royaltyPercentage: collectionData.royaltyPercentage,
        isOpenEdition: collectionType === 'open'
      }, phasesForContract);

      console.log('✅ Collection creation transaction submitted!');
      console.log('🔍 Transaction Hash:', createTxHash);

      // ===== STEP 4: Wait for Transaction & Get Collection Address =====
      let receipt: any = null;
      let collectionAddress = '';

      // REAL TRANSACTION: Wait for blockchain confirmation
      setLoadingStep('Waiting for transaction confirmation...');
      setLoadingProgress(85);
      console.log('⏳ Waiting for transaction to be mined...');
      console.log('🔗 Transaction Hash:', createTxHash);
      console.log('🌐 You can check the transaction on the block explorer');

      try {
        // Note: This requires ethers provider to wait for transaction
        const ethers = (await import('ethers')).ethers;
        if (!window.ethereum) throw new Error('Ethereum provider not found');
        const provider = new ethers.BrowserProvider(window.ethereum as any);

        // Add timeout to prevent infinite waiting
        const TIMEOUT_MS = 180000; // 3 minutes timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transaction confirmation timeout. Please check the transaction manually.')), TIMEOUT_MS)
        );

        console.log('⏳ Waiting for transaction receipt...');
        receipt = await Promise.race([
          provider.waitForTransaction(createTxHash, 1, TIMEOUT_MS),
          timeoutPromise
        ]) as any;

        console.log('✅ Transaction mined!');
        console.log('📦 Block number:', receipt?.blockNumber);
        console.log('📄 Receipt logs count:', receipt?.logs?.length || 0);

        // ===== SUBTASK 3.2: Parse logs to get the deployed collection address =====
        // LaunchpadCreated event: event LaunchpadCreated(address indexed launchpadAddress, address indexed creator, string name, string symbol, uint256 totalSupply, uint256 indexed timestamp)
        console.log('🔍 Step 3.2: Extracting contract address from transaction logs...');
        console.log('📄 Receipt logs count:', receipt?.logs?.length || 0);

        if (receipt?.logs && receipt.logs.length > 0) {
          try {
            // Import the MasterContractFactory ABI to parse events
            console.log('🔍 Parsing transaction logs for ContractDeployed event...');
            const MasterContractFactoryABI = await import('@/../abi/OddsLaunchpadFactory.json');
            const iface = new ethers.Interface(MasterContractFactoryABI.default);

            // Find and parse the ContractDeployed event
            for (const log of receipt.logs) {
              try {
                const parsedLog = iface.parseLog({
                  topics: log.topics as string[],
                  data: log.data
                });

                if (parsedLog && parsedLog.name === 'ContractDeployed') {
                  collectionAddress = parsedLog.args.contractAddress;
                  console.log('✅ Found ContractDeployed event!');
                  console.log('🎨 Collection Address:', collectionAddress);
                  console.log('📋 Template:', parsedLog.args.template);
                  console.log('👤 Deployer:', parsedLog.args.deployer);
                  console.log('🔢 Nonce:', parsedLog.args.nonce);
                  break;
                }
              } catch (e) {
                // Not a LaunchpadFactory event, continue to next log
                continue;
              }
            }

            if (!collectionAddress) {
              console.warn('⚠️ ContractDeployed event not found in logs');
            }
          } catch (error) {
            console.error('❌ Error parsing logs:', error);
            console.error('Error details:', error);
          }

          // Fallback: Get all deployed collections and take the latest one
          if (!collectionAddress) {
            console.log('⚠️ Could not parse collection address from logs');
            console.log('🔄 Attempting fallback: Fetching from contract...');
            try {
              const allLaunchpads = await contractService.getAllLaunchpads(selectedChainId);
              if (allLaunchpads && allLaunchpads.length > 0) {
                const lastLaunchpad = allLaunchpads[allLaunchpads.length - 1];
                collectionAddress = typeof lastLaunchpad === 'string' ? lastLaunchpad : lastLaunchpad.contractAddress;
                console.log('✅ Fallback successful! Got collection address:', collectionAddress);
              } else {
                console.error('❌ Fallback failed: No launchpads found');
              }
            } catch (fallbackError) {
              console.error('❌ Fallback failed:', fallbackError);
            }
          }
        } else {
          console.warn('⚠️ No logs found in transaction receipt');
          console.log('Receipt details:', JSON.stringify(receipt, null, 2));
        }

        if (!collectionAddress) {
          // ===== SUBTASK 7.2: Improve contract address retrieval error handling =====
          const blockExplorerUrl = `${selectedChain.blockExplorer}/tx/${createTxHash}`;
          const errorMsg = `Failed to get collection address from transaction.\n\nTransaction Hash: ${createTxHash}\n\nPlease check the transaction on the block explorer to verify the deployment and get the contract address manually.`;

          console.error('❌', errorMsg);
          console.error('🔗 Block Explorer:', blockExplorerUrl);

          toast.error('Contract Address Not Found', {
            description: (
              <div className="space-y-2">
                <p>Failed to retrieve the contract address from the transaction.</p>
                <p className="font-mono text-xs break-all">TX: {createTxHash}</p>
                <a
                  href={blockExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline block"
                >
                  View on Block Explorer →
                </a>
                <p className="text-xs text-gray-400">You can verify the deployment manually and get the contract address from the transaction.</p>
              </div>
            ),
            duration: 10000,
            id: TOAST_ID
          });

          throw new Error(errorMsg);
        }

        console.log('🎨 Successfully retrieved Collection Address:', collectionAddress);

      } catch (waitError: any) {
        console.error('❌ Error waiting for transaction:', waitError);
        throw new Error(`Transaction confirmation failed: ${waitError.message || 'Unknown error'}`);
      }

      // ===== STEP 5: Save to Database =====
      setLoadingStep('Saving to database...');
      setLoadingProgress(95);
      console.log('💾 Saving collection data to database...');

      try {
        // Prepare phases for database (convert from contract format to DB format)
        const ethers = (await import('ethers')).ethers;
        const phasesForDB = phasesForContract.map((phase, index) => ({
          name: phase.name,
          phaseType: phase.requiresWhitelist ? 'WHITELIST' : 'PUBLIC',
          startTime: new Date(phase.startTime * 1000).toISOString(),
          endTime: phase.endTime ? new Date(phase.endTime * 1000).toISOString() : null,
          price: phase.price, // Already in ETH string format (e.g., "0.0001")
          maxMintPerWallet: phase.maxPerWallet,
          totalLimit: phase.maxSupply,
          isActive: true,
          merkleRoot: phase.merkleRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000'
            ? phase.merkleRoot
            : null
        }));

        // Prepare whitelist data for database
        const whitelistsForDB: Array<{ phaseId: number; address: string; allocation: number }> = [];

        for (let i = 0; i < processedWhitelistPhases.length; i++) {
          const phase = processedWhitelistPhases[i];
          if (phase.csvFile && phase.merkleRoot && phase.merkleRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            // Parse CSV to get addresses and allocations
            try {
              const text = await phase.csvFile.text();
              const lines = text.split('\n').filter(line => line.trim());

              lines.forEach((line, lineIndex) => {
                if (lineIndex === 0 && line.toLowerCase().includes('address')) return; // Skip header

                const parts = line.split(',').map(p => p.trim());
                const address = parts[0];
                const allocation = parts[1] ? parseInt(parts[1]) : 1;

                if (address && address.startsWith('0x')) {
                  whitelistsForDB.push({
                    phaseId: i,
                    address: address.toLowerCase(),
                    allocation
                  });
                }
              });
            } catch (csvError) {
              console.error(`Failed to parse CSV for phase ${i}:`, csvError);
            }
          }
        }

        console.log(`📋 Prepared ${whitelistsForDB.length} whitelist entries for database`);

        // ===== SUBTASK 3.3: Implement baseURI resolution after deployment =====
        console.log('🔄 Step 3.3: Resolving baseURI with actual contract address...');

        // Determine final baseURI based on collection type and upload method
        let finalResolverBaseURI: string;

        // Check if this is a folder upload (manifestHash is empty for folder uploads)
        const isFolderUpload = collectionType === 'standard' && !manifestHash && finalBaseURI.startsWith('ipfs://') && finalBaseURI.endsWith('/');

        if (collectionType === 'open') {
          // Open Edition: Use direct IPFS URL (already set in finalBaseURI)
          finalResolverBaseURI = finalBaseURI;
          console.log('📍 Open Edition - BaseURI Resolution:');
          console.log('  - Type: Direct IPFS URL');
          console.log('  - BaseURI:', finalResolverBaseURI);
          console.log('  - No update needed (already correct)');
        } else if (isFolderUpload) {
          // Standard Collection with Folder Upload: Use direct IPFS folder URL
          // Requirements: 4.1, 4.2, 4.3 - Use ipfs://FolderCID/ as baseURI
          finalResolverBaseURI = finalBaseURI;
          console.log('📍 Standard Collection (Folder Upload) - BaseURI Resolution:');
          console.log('  - Type: Direct IPFS Folder URL');
          console.log('  - BaseURI:', finalResolverBaseURI);
          console.log('  - Manifest Hash: N/A (not needed for folder uploads)');
          console.log('  - ✅ Using direct IPFS folder access (no resolver API needed)');
          console.log('  - ✅ Metadata accessible at: ipfs://{CID}/0.json, ipfs://{CID}/1.json, etc.');
        } else {
          // Standard Collection with Legacy Upload: Use custom resolver API with actual contract address
          const apiBaseUrl = typeof window !== 'undefined'
            ? window.location.origin
            : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

          finalResolverBaseURI = `${apiBaseUrl}/api/metadata/${collectionAddress}/`;

          console.log('📍 Standard Collection (Legacy Upload) - BaseURI Resolution:');
          console.log('  - Type: Custom Resolver API');
          console.log('  - Old BaseURI: ipfs://temporary/');
          console.log('  - New BaseURI:', finalResolverBaseURI);
          console.log('  - Contract Address:', collectionAddress);
          console.log('  - Manifest Hash:', manifestHash || 'N/A');

          // Validate resolved baseURI has no placeholder
          if (finalResolverBaseURI.includes('CONTRACT_ADDRESS')) {
            const errorMsg = 'BaseURI still contains placeholder "CONTRACT_ADDRESS". This should not happen!';
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
          }

          console.log('✅ BaseURI validated: No placeholder found');
        }

        // ===== SUBTASK 3.4: Update BaseURI on Smart Contract (for Standard Collection) =====
        if (needsBaseURIUpdate) {
          setLoadingStep('Updating baseURI on smart contract...');
          setLoadingProgress(93);
          console.log('');
          console.log('🔄 Step 3.4: Updating baseURI on smart contract...');
          console.log('  - Collection Type: Standard');
          console.log('  - Contract Address:', collectionAddress);
          console.log('  - Old baseURI: ipfs://temporary/');
          console.log('  - New baseURI:', finalResolverBaseURI);

          try {
            const updateBaseURITx = await contractService.setBaseURI(
              selectedChainId,
              collectionAddress,
              finalResolverBaseURI
            );

            console.log('✅ BaseURI update transaction submitted:', updateBaseURITx);
            console.log('⏳ Waiting for baseURI update confirmation...');

            // Wait for the transaction to be mined
            const ethers = (await import('ethers')).ethers;
            const provider = new ethers.BrowserProvider(window.ethereum as any);
            await provider.waitForTransaction(updateBaseURITx, 1);

            console.log('✅ BaseURI updated successfully on smart contract!');
            console.log('  - Transaction Hash:', updateBaseURITx);
            console.log('  - Confirmed: Yes');

            // Update finalBaseURI for the final data
            finalBaseURI = finalResolverBaseURI;
          } catch (updateError: any) {
            // ===== SUBTASK 7.3: Handle baseURI update failures =====
            console.error('❌ Failed to update baseURI on smart contract:', updateError);
            console.error('  - Error details:', updateError.message || 'Unknown error');
            console.warn('⚠️  Collection was created but baseURI update failed');
            console.warn('  - You can update it manually later using the admin panel');
            console.warn('  - Contract Address:', collectionAddress);

            toast.warning('BaseURI Update Failed', {
              description: (
                <div className="space-y-2">
                  <p>Your collection was created successfully on-chain, but the baseURI update failed.</p>
                  <p className="font-mono text-xs break-all">Contract: {collectionAddress}</p>
                  <p className="text-xs text-gray-400">You can update the baseURI manually later using the admin panel or by calling setBaseURI directly on the contract.</p>
                </div>
              ),
              id: TOAST_ID,
              duration: 8000,
            });

            // Don't throw error, continue with database save
          }
        } else {
          console.log('✅ Step 3.4: Skipped (Open Edition - no baseURI update needed)');
        }

        // ===== SUBTASK 6.4: Add logging for database save =====
        console.log('');
        console.log('💾 Step 6.4: Preparing database save payload...');
        console.log('  - Contract Address:', collectionAddress);
        console.log('  - BaseURI:', finalResolverBaseURI);

        // Check if this is a folder upload (manifestHash is empty and baseURI is IPFS folder URL)
        const isFolderUploadSave = !manifestHash && finalResolverBaseURI.startsWith('ipfs://') && finalResolverBaseURI.endsWith('/');

        if (isFolderUploadSave) {
          console.log('  - Upload Type: Folder Upload (single CID)');
          console.log('  - Manifest Hash: null (not needed for folder uploads)');
          console.log('  - Image Manifest Hash: null (not needed for folder uploads)');
        } else if (collectionType === 'open') {
          console.log('  - Upload Type: Open Edition (single file)');
          console.log('  - Manifest Hash: N/A (Open Edition)');
          console.log('  - Image Manifest Hash: N/A (Open Edition)');
        } else {
          console.log('  - Upload Type: Legacy Upload (manifest-based)');
          console.log('  - Manifest Hash:', manifestHash || 'N/A');
          console.log('  - Image Manifest Hash:', imageManifestHash || 'N/A');
        }

        console.log('  - Collection Type:', collectionType === 'standard' ? 'Standard' : 'Open Edition');
        console.log('  - Phases Count:', phasesForDB.length);
        console.log('  - Whitelists Count:', whitelistsForDB.length);

        // Prepare payload for database save
        // Task 4.3: For folder uploads, set manifestHash and imageManifestHash to null
        const databasePayload = {
          chainId: selectedChainId,
          contractAddress: collectionAddress,
          creator: creatorAddress, // Deployer's wallet address
          name: collectionData.name,
          symbol: collectionData.symbol,
          description: collectionData.description,
          baseURI: finalResolverBaseURI, // Use appropriate baseURI based on collection type
          unrevealedURI: collectionData.unrevealedURI || '',
          contractURI: finalContractURI,
          externalLink: collectionData.externalLink || '',
          totalMaxSupply: collectionData.totalMaxSupply,
          treasury: creatorAddress, // Use deployer's wallet address
          royaltyRecipient: creatorAddress, // Use deployer's wallet address
          royaltyPercentage: collectionData.royaltyPercentage,
          deployTxHash: createTxHash,
          // Task 4.3: Set manifestHash to null for folder uploads (Requirements: 4.4, 4.5, 8.1, 8.2, 8.3)
          manifestHash: manifestHash || null, // null for folder uploads and Open Edition
          imageManifestHash: imageManifestHash || null, // null for folder uploads and Open Edition
          metadata: {
            image: coverImageUrl || null,
            bannerImage: bannerImageUrl || null,
            website: collectionData.externalLink || '',
          },
          phases: phasesForDB,
          whitelists: whitelistsForDB,
        };

        console.log('📋 Database Save Payload:');
        console.log(JSON.stringify(databasePayload, null, 2));

        // Save launchpad data to database via API
        const authHeaders = await getCreatorAuthHeadersSafe('launchpad:save', collectionAddress);
        const saveResponse = await fetch('/api/admin/launchpads/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(databasePayload),
        });

        if (saveResponse.ok) {
          console.log('✅ Database save successful!');
          console.log('  - Status: Success');
          console.log('  - Contract Address:', collectionAddress);
          console.log('  - BaseURI:', finalResolverBaseURI);
          console.log('  - Manifest Hash:', manifestHash || 'N/A');
        } else {
          // ===== SUBTASK 7.4: Handle database save failures =====
          const errorText = await saveResponse.text();
          console.error('❌ Database save failed!');
          console.error('  - Status:', saveResponse.status, saveResponse.statusText);
          console.error('  - Error:', errorText);
          console.warn('⚠️ Collection was created on-chain but not saved to database');
          console.warn('  - Contract Address:', collectionAddress);

          toast.warning('Database Save Failed', {
            description: (
              <div className="space-y-2">
                <p>Your collection was successfully created on the blockchain, but failed to save to the database.</p>
                <p className="font-semibold">Contract Address:</p>
                <p className="font-mono text-xs break-all">{collectionAddress}</p>
                <p className="text-xs text-gray-400">The collection is live on-chain. You may need to manually add it to the database or contact support.</p>
              </div>
            ),
            duration: 10000,
            id: TOAST_ID
          });
        }
      } catch (dbError) {
        console.error('❌ Database save error:', dbError);
        // Don't fail the whole process if database save fails
      }

      // ===== STEP 7: Final Callback & Success Message =====
      setLoadingStep('Finalizing collection...');
      setLoadingProgress(97);
      await new Promise(resolve => setTimeout(resolve, 500));

      const finalData: CollectionData = {
        ...collectionData,
        chainId: selectedChainId,
        baseURI: finalBaseURI,
        contractURI: finalContractURI
      };

      // Call the success callback
      onSubmit?.(finalData);

      setLoadingProgress(99);
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoadingProgress(100);
      setLoadingStep('Collection created successfully!');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Trigger confetti celebration
      triggerConfetti({ duration: 2000 });

      // Show success toast
      // ===== SUBTASK 7.5: Improve success message =====
      const totalPhases = processedWhitelistPhases.filter(p => p.name).length + (publicPhase.name ? 1 : 0);

      toast.success('Collection Created Successfully! 🎉', {
        description: (
          <div className="space-y-2 mt-2">
            <div>
              <p className="font-semibold text-sm">Contract Address:</p>
              <p className="font-mono text-xs break-all bg-black/30 p-2 rounded">{collectionAddress}</p>
            </div>
            <div>
              <p className="font-semibold text-sm">Transaction Hash:</p>
              <p className="font-mono text-xs break-all bg-black/30 p-2 rounded">{createTxHash}</p>
            </div>
            <div className="pt-2 border-t border-white/20">
              <p className="text-sm">
                <span className="font-semibold">Collection Type:</span> {collectionType === 'standard' ? 'Standard Edition' : 'Open Edition'}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Mint Phases:</span> {totalPhases} phase{totalPhases !== 1 ? 's' : ''} configured
              </p>
              <p className="text-sm">
                <span className="font-semibold">Max Supply:</span> {collectionData.totalMaxSupply.toLocaleString()} NFTs
              </p>
            </div>
            <a
              href={`${selectedChain.blockExplorer}/address/${collectionAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline text-sm block pt-2"
            >
              View on Block Explorer →
            </a>
          </div>
        ),
        duration: 12000,
      });

      console.log('🎉 NFT Collection creation completed successfully!');
      console.log('📍 Collection Address:', collectionAddress);
      console.log('🔗 Transaction Hash:', createTxHash);

      // Clear cached upload data after successful deployment
      setUploadedData(null);
      console.log('🗑️ Cleared cached upload data');

    } catch (error: any) {
      console.error('❌ Error creating NFT Collection:', error);

      // Handle specific error types with user-friendly toast messages
      if (error.message?.includes('Network switch rejected')) {
        toast.error('Network Switch Rejected', {
          description: 'You rejected the network switch request. Please switch to the correct network manually and try again.',
          duration: 7000,
          id: TOAST_ID
        });
      } else if (error.message?.includes('Failed to switch network') || error.message?.includes('Failed to add')) {
        toast.error('Network Switch Failed', {
          description: error.message,
          duration: 7000,
          id: TOAST_ID
        });
      } else if (
        error.code === 4001 || 
        error.info?.error?.code === 4001 || 
        error.message?.includes('user rejected') || 
        error.message?.includes('ethers-user-denied') ||
        error.message?.includes('User denied transaction')
      ) {
        toast.error('Transaction Rejected', {
          description: 'You rejected the transaction in your wallet. Please try again if you want to create the collection.',
          duration: 5000,
          id: TOAST_ID
        });
      } else if (
        error.code === 'CALL_EXCEPTION' || 
        error.message?.includes('transaction execution reverted') ||
        error.receipt?.status === 0
      ) {
        // Transaction was sent but reverted on-chain
        const txHash = error.receipt?.hash || error.transaction?.hash;
        const blockExplorerUrl = txHash ? `${selectedChain.blockExplorer}/tx/${txHash}` : null;
        
        toast.error('Transaction Failed', {
          description: (
            <div className="space-y-2">
              <p>The transaction was reverted by the smart contract. This could be due to:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Template not approved in factory</li>
                <li>Insufficient gas limit</li>
                <li>Invalid collection parameters</li>
                <li>Contract deployment restrictions</li>
              </ul>
              {blockExplorerUrl && (
                <a 
                  href={blockExplorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-sm block mt-2"
                >
                  View transaction details →
                </a>
              )}
            </div>
          ),
          duration: 10000,
          id: TOAST_ID
        });
      } else if (error.code === -32603) {
        toast.error('Network Error', {
          description: 'Unable to connect to the blockchain network. Please check your internet connection and try again.',
          duration: 5000,
          id: TOAST_ID
        });
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient Funds', {
          description: 'You don\'t have enough ETH to pay for the transaction. Please add funds to your wallet.',
          duration: 5000,
          id: TOAST_ID
        });
      } else if (error.message?.includes('ZIP') || error.message?.includes('extract')) {
        toast.error('ZIP Processing Failed', {
          description: error.message || 'Failed to extract ZIP file. Please ensure your ZIP file is valid and contains metadata files.',
          duration: 6000,
          id: TOAST_ID
        });
      } else if (error.message?.includes('validation failed')) {
        toast.error('Collection Validation Failed', {
          description: error.message || 'Your collection metadata has validation errors. Please check your files.',
          duration: 7000,
          id: TOAST_ID
        });
      } else if (error.message?.includes('metadata')) {
        toast.error('Metadata Processing Failed', {
          description: error.message || 'Failed to process metadata files. Please check your metadata format.',
          duration: 6000,
          id: TOAST_ID
        });
      } else if (error.message?.includes('IPFS') || error.message?.includes('upload')) {
        toast.error('File Upload Failed', {
          description: error.message || 'Failed to upload files to IPFS. Please check your files and try again.',
          duration: 5000,
          id: TOAST_ID
        });
      } else if (error.message?.includes('merkle')) {
        toast.error('Whitelist Processing Failed', {
          description: 'Failed to process whitelist CSV file. Please check the file format and try again.',
          duration: 5000,
          id: TOAST_ID
        });
      } else if (error.message?.includes('Failed to get collection address')) {
        toast.error('Collection Address Not Found', {
          description: 'The collection was created but we couldn\'t retrieve its address. Please check the transaction manually.',
          duration: 7000,
          id: TOAST_ID
        });
      } else {
        toast.error('Error Creating Collection', {
          description: error.message || 'An unexpected error occurred. Please try again or contact support.',
          duration: 5000,
          id: TOAST_ID
        });
      }
    } finally {
      setIsSubmitting(false);
      // Reset loading state after a delay
      setTimeout(() => {
        setLoadingStep('');
        setLoadingProgress(0);
      }, 3000);
    }
  };

  return (
    <div className="bg-[#0D0E11]" suppressHydrationWarning>
      {/* Network Guard Banner */}
      <NetworkGuard requiredChainId={selectedChainId} />

      <div className="w-full max-w-[1000px] mx-auto border-[#2F3336]" suppressHydrationWarning style={{ marginTop: isWrongNetwork ? '60px' : '0' }}>

        {/* Information Section */}
        <div className="border border-[#2F3336] border-t-0">
          {/* Header */}
          <div className="relative w-full h-[117px] overflow-hidden border-b border-[#2F3336]">
            <div className="absolute inset-0">
              <Image
                src="/images/information-bg-56586a.png"
                alt="Information background"
                fill
                className="object-cover"
              />
            </div>
            <div className="h-full grid grid-cols-1 min-h-[89px]">
              <div className="h-full bg-[#0D0E11] flex flex-col justify-center px-4 sm:px-6 py-4 sm:py-0">
                <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-mono font-bold text-white leading-tight">
                  Creator Studio
                </h1>
                <p className="text-xs sm:text-sm lg:text-[14px] font-mono font-normal text-white leading-relaxed">
                  Create and manage your own NFT collection.
                </p>
              </div>
            </div>
          </div>

          {/* Form Content - Table Layout */}
          <div>
            {/* Select Chain Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Select Chain</label>
              </div>
              <div className="bg-[#0D0E11] flex items-center md:border-r border-[#2F3336] min-h-[42px]">
                <CustomSelect
                  value={selectedChainId.toString()}
                  onValueChange={(value) => {
                    const newChainId = parseInt(value);
                    setSelectedChainId(newChainId);
                    setCollectionData(prev => ({ ...prev, chainId: newChainId }));
                    console.log('✅ Chain changed:', { selectedChainId: newChainId, collectionDataChainId: newChainId });
                  }}
                  options={chainOptions}
                  placeholder="Select a blockchain"
                  containerClassName="space-y-0 w-full border-0"
                  labelClassName="hidden"
                />
              </div>
            </div>

            {/* Collection Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Collection Name</label>
              </div>
              <div className="bg-[#0D0E11]">
                <input
                  suppressHydrationWarning
                  className={cn(
                    "w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]",
                    errors.name && "border-l-2 border-red-500"
                  )}
                  value={collectionData.name}
                  onChange={(e) => {
                    setCollectionData(prev => ({ ...prev, name: e.target.value }));
                    if (errors.name) {
                      setErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                  placeholder="Odds NFT"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs font-mono px-3 pb-1">{errors.name}</p>
                )}
              </div>
            </div>

            {/* Description Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Description</label>
              </div>
              <div className="bg-[#0D0E11]">
                <input
                  suppressHydrationWarning
                  className={cn(
                    "w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]",
                    errors.description && "border-l-2 border-red-500"
                  )}
                  value={collectionData.description}
                  onChange={(e) => {
                    setCollectionData(prev => ({ ...prev, description: e.target.value }));
                    if (errors.description) {
                      setErrors(prev => ({ ...prev, description: '' }));
                    }
                  }}
                  placeholder="e.g. Odds is the greatest NFT collection ever made."
                />
                {errors.description && (
                  <p className="text-red-500 text-xs font-mono px-3 pb-1">{errors.description}</p>
                )}
              </div>
            </div>

            {/* Link Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Link</label>
              </div>
              <div className="bg-[#0D0E11]">
                <input
                  suppressHydrationWarning
                  type="url"
                  className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
                  value={collectionData.externalLink}
                  onChange={(e) => {
                    setCollectionData(prev => ({ ...prev, externalLink: e.target.value }));
                  }}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            {/* Symbol Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Token Symbol</label>
              </div>
              <div className="bg-[#0D0E11]">
                <input
                  suppressHydrationWarning
                  className={cn(
                    "w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]",
                    errors.symbol && "border-l-2 border-red-500"
                  )}
                  value={collectionData.symbol}
                  onChange={(e) => {
                    setCollectionData(prev => ({ ...prev, symbol: e.target.value }));
                    if (errors.symbol) {
                      setErrors(prev => ({ ...prev, symbol: '' }));
                    }
                  }}
                  placeholder="ODDS"
                />
                {errors.symbol && (
                  <p className="text-red-500 text-xs font-mono px-3 pb-1">{errors.symbol}</p>
                )}
              </div>
            </div>

            {/* Max Supply Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Max Supply</label>
              </div>
              <div className="bg-[#0D0E11]">
                <input
                  suppressHydrationWarning
                  type="number"
                  className={cn(
                    "w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]",
                    errors.totalMaxSupply && "border-l-2 border-red-500"
                  )}
                  value={collectionData.totalMaxSupply.toString()}
                  onChange={(e) => {
                    setCollectionData(prev => ({ ...prev, totalMaxSupply: parseInt(e.target.value) || 0 }));
                    if (errors.totalMaxSupply) {
                      setErrors(prev => ({ ...prev, totalMaxSupply: '' }));
                    }
                  }}
                  placeholder="10,000"
                />
                {errors.totalMaxSupply && (
                  <p className="text-red-500 text-xs font-mono px-3 pb-1">{errors.totalMaxSupply}</p>
                )}
              </div>
            </div>

            {/* Royalty Percentage Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Royalty Percentage</label>
              </div>
              <div className="bg-[#0D0E11] flex items-center">
                <input
                  suppressHydrationWarning
                  type="number"
                  className="w-full h-full bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
                  value={collectionData.royaltyPercentage === 0 ? '' : (collectionData.royaltyPercentage / 100).toString()}
                  onChange={(e) => setCollectionData(prev => ({ ...prev, royaltyPercentage: (parseFloat(e.target.value) || 0) * 100 }))}
                  placeholder="0 (Max. 10%)"
                  step="0.1"
                  min="0"
                  max="10"
                />
              </div>
            </div>

            {/* Image Upload Section - Table Format */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Cover Image */}
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] min-h-[237px]">
                <div className="p-3 sm:p-4 h-full">
                  <FileUpload
                    label="Cover Image (800×800px)"
                    onFileSelect={(file) => {
                      setCoverImage(file);
                      if (errors.coverImage) {
                        setErrors(prev => ({ ...prev, coverImage: '' }));
                      }
                    }}
                    accept="image/*"
                    maxSize={5}
                    height="h-[200px]"
                    hasError={!!errors.coverImage}
                    className="border-0"
                  />
                  {errors.coverImage && (
                    <p className="text-red-500 text-xs font-mono mt-1">{errors.coverImage}</p>
                  )}
                </div>
              </div>

              {/* Banner Image */}
              <div className="min-h-[237px]">
                <div className="p-3 sm:p-4 h-full">
                  <FileUpload
                    label="Banner Image (1000×300px)"
                    onFileSelect={(file) => {
                      setBannerImage(file);
                      if (errors.bannerImage) {
                        setErrors(prev => ({ ...prev, bannerImage: '' }));
                      }
                    }}
                    accept="image/*"
                    maxSize={5}
                    height="h-[200px]"
                    hasError={!!errors.bannerImage}
                    className="border-0"
                  />
                  {errors.bannerImage && (
                    <p className="text-red-500 text-xs font-mono mt-1">{errors.bannerImage}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mint Setup Section */}
        <div className="border border-[#2F3336] border-t-0">
          {/* Header */}
          <div className="relative w-full h-[117px] overflow-hidden border-b border-[#2F3336]">
            <div className="absolute inset-0">
              <Image
                src="/images/information-bg-56586a.png"
                alt="Mint Setup background"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <h2 className="font-mono font-black text-sm uppercase tracking-wider text-[#B392F0]">
                MINT SETUP
              </h2>
            </div>
          </div>

          {/* Whitelist Mint Phases */}
          {whitelistPhases.map((phase, index) => (
            <div key={phase.id} className="border-b border-[#2F3336]">
              {/* Phase Header - Mobile/Tablet */}
              <div className="lg:hidden bg-[#0D0E11]/30 border-b border-[#2F3336] p-4 flex items-center justify-between">
                <div className="text-[#B392F0] font-mono font-bold text-sm">
                  Whitelist Mint Phase {index + 1} (Optional)
                </div>
                <button
                  suppressHydrationWarning
                  onClick={() => removeWhitelistPhase(phase.id)}
                  className="text-[#857F94] hover:text-red-400 font-mono text-sm transition-colors"
                >
                  × Remove
                </button>
              </div>

              {/* Table Layout with 3 Columns - Desktop Only */}
              <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] xl:grid-cols-[230px_270px_1fr]">
                {/* Phase Name Column with Rowspan - Desktop Only */}
                <div className="hidden lg:flex lg:row-span-6 border-r border-[#2F3336] bg-[#0D0E11] flex-col items-center justify-center p-3">
                  <div className="text-center">
                    <div className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px] mb-2">
                      Whitelist<br />Mint phase {index + 1}<br />(Optional)
                    </div>
                    <button
                      suppressHydrationWarning
                      onClick={() => removeWhitelistPhase(phase.id)}
                      className="text-[#857F94] hover:text-red-400 font-mono text-sm transition-colors mt-2"
                    >
                      × Remove
                    </button>
                  </div>
                </div>

                {/* Name Row */}
                <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] xl:contents">
                  {/* Label */}
                  <div className="xl:border-r border-b xl:border-b border-[#2F3336] min-h-[42px] flex items-center px-3 py-2 xl:py-0 bg-[#0D0E11]/50 xl:bg-transparent">
                    <label className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">Name</label>
                  </div>
                  {/* Input */}
                  <div className="bg-[#0D0E11] border-b border-[#2F3336] min-h-[42px] flex items-center">
                    <input
                      suppressHydrationWarning
                      className="w-full h-full bg-transparent px-3 text-white font-mono text-sm xl:text-[15px] outline-none placeholder:text-[#505052]"
                      value={phase.name}
                      onChange={(e) => updateWhitelistPhase(phase.id, 'name', e.target.value)}
                      placeholder="Whitelist Mint"
                    />
                  </div>
                </div>

                {/* Start Time Row */}
                <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] xl:contents">
                  <div className="xl:border-r border-b xl:border-b border-[#2F3336] min-h-[42px] flex items-center px-3 py-2 xl:py-0 bg-[#0D0E11]/50 xl:bg-transparent">
                    <label className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">Start Time</label>
                  </div>
                  <div className="bg-[#0D0E11] border-b border-[#2F3336] min-h-[42px] flex items-center">
                    <SingleDateTimePicker
                      date={phase.startDate}
                      onDateChange={(date) => updateWhitelistPhaseDate(phase.id, 'startDate', date)}
                      placeholder="dd/mm/yyyy. 7 PM UTC"
                      className="w-full space-y-0 border-0"
                    />
                  </div>
                </div>

                {/* End Time Row */}
                <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] xl:contents">
                  <div className="xl:border-r border-b xl:border-b border-[#2F3336] min-h-[42px] flex items-center px-3 py-2 xl:py-0 bg-[#0D0E11]/50 xl:bg-transparent">
                    <label className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">End Time</label>
                  </div>
                  <div className="bg-[#0D0E11] border-b border-[#2F3336] min-h-[42px] flex items-center">
                    <SingleDateTimePicker
                      date={phase.endDate}
                      onDateChange={(date) => updateWhitelistPhaseDate(phase.id, 'endDate', date)}
                      placeholder="dd/mm/yyyy. 7 PM UTC"
                      className="w-full space-y-0 border-0"
                    />
                  </div>
                </div>

                {/* Mint Price Row */}
                <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] xl:contents">
                  <div className="xl:border-r border-b xl:border-b border-[#2F3336] min-h-[42px] flex items-center px-3 py-2 xl:py-0 bg-[#0D0E11]/50 xl:bg-transparent">
                    <label className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">Mint Price</label>
                  </div>
                  <div className="bg-[#0D0E11] border-b border-[#2F3336] min-h-[42px] flex items-center">
                    <input
                      suppressHydrationWarning
                      className="w-full h-full bg-transparent px-3 text-white font-mono text-sm xl:text-[15px] outline-none placeholder:text-[#505052]"
                      value={phase.price}
                      onChange={(e) => updateWhitelistPhase(phase.id, 'price', e.target.value)}
                      placeholder="0 ETH"
                    />
                  </div>
                </div>

                {/* Max Mints per address Row */}
                <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] xl:contents">
                  <div className="xl:border-r border-b xl:border-b border-[#2F3336] min-h-[42px] flex items-center px-3 py-2 xl:py-0 bg-[#0D0E11]/50 xl:bg-transparent">
                    <label className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">Max Mints per Address</label>
                  </div>
                  <div className="bg-[#0D0E11] border-b border-[#2F3336] min-h-[42px] flex items-center">
                    <input
                      suppressHydrationWarning
                      type="number"
                      className="w-full h-full bg-transparent px-3 text-white font-mono text-sm xl:text-[15px] outline-none placeholder:text-[#505052]"
                      value={phase.maxPerAddress}
                      onChange={(e) => updateWhitelistPhase(phase.id, 'maxPerAddress', e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>

                {/* Upload address Row */}
                <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] xl:contents">
                  <div className="xl:border-r border-b md:border-b-0 border-[#2F3336] min-h-[42px] flex items-center px-3 py-2 xl:py-0 bg-[#0D0E11]/50 xl:bg-transparent">
                    <label className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">Upload address (csv format)</label>
                  </div>
                  <div className="bg-[#0D0E11] min-h-[42px] flex flex-col justify-center px-3 gap-2 py-2">
                    <div className="flex items-center gap-2">
                      <label className="h-[26px] bg-[#B392F0] rounded px-3 sm:px-4 flex items-center hover:bg-[#A080E0] transition-colors cursor-pointer">
                        <span className="text-[#0D0E11] font-mono text-xs sm:text-sm xl:text-[15px] truncate max-w-[200px]">
                          {phase.csvFile ? phase.csvFile.name : 'Choose file'}
                        </span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => handleCsvUpload(phase.id, e)}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[#857F94] font-mono text-xs sm:text-sm xl:text-[15px]">({phase.addressCount} address)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Whitelist Phase Button */}
          {whitelistPhases.length < 3 && (
            <div className="min-h-[42px] border-b border-[#2F3336]">
              <div className="bg-[#0D0E11] flex items-center justify-start px-3 sm:px-4 py-3">
                <button
                  suppressHydrationWarning
                  className="text-[#857F94] font-mono text-[15px] hover:text-white transition-colors"
                  onClick={addWhitelistPhase}
                >
                  + Add whitelist mint phase (up to 3)
                </button>
              </div>
            </div>
          )}

          {/* Public Mint Phase */}
          <div className="border-b border-[#2F3336]">
            {/* Phase Header - Mobile/Tablet */}
            <div className="lg:hidden bg-[#0D0E11]/30 border-b border-[#2F3336] p-4">
              <div className="text-[#B392F0] font-mono font-bold text-sm">
                Public Mint Phase
              </div>
            </div>

            {/* Table Layout with 3 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] xl:grid-cols-[230px_270px_1fr]">
              {/* Phase Name Column with Rowspan - Desktop Only */}
              <div className="hidden lg:flex lg:row-span-5 border-r border-[#2F3336] bg-[#0D0E11] flex-col items-center justify-center p-3">
                <div className="text-center">
                  <div className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">
                    Public<br />Mint Phase
                  </div>
                </div>
              </div>

              {/* Name Row */}
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] xl:contents">
                <div className="xl:border-r border-b xl:border-b border-[#2F3336] min-h-[42px] flex items-center px-3 py-2 xl:py-0 bg-[#0D0E11]/50 xl:bg-transparent">
                  <label className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">Name</label>
                </div>
                <div className="bg-[#0D0E11] border-b border-[#2F3336] min-h-[42px] flex items-center">
                  <input
                    suppressHydrationWarning
                    className="w-full h-full bg-transparent px-3 text-white font-mono text-sm xl:text-[15px] outline-none placeholder:text-[#505052]"
                    value={publicPhase.name}
                    onChange={(e) => setPublicPhase(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Public Mint"
                  />
                </div>
              </div>

              {/* Start Time Row */}
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] xl:contents">
                <div className="xl:border-r border-b xl:border-b border-[#2F3336] min-h-[42px] flex items-center px-3 py-2 xl:py-0 bg-[#0D0E11]/50 xl:bg-transparent">
                  <label className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">Start Time</label>
                </div>
                <div className="bg-[#0D0E11] border-b border-[#2F3336] min-h-[42px] flex items-center">
                  <SingleDateTimePicker
                    date={publicPhase.startDate}
                    onDateChange={(date) => updatePublicPhaseDate('startDate', date)}
                    placeholder="dd/mm/yyyy. 7 PM UTC"
                    className="w-full space-y-0 border-0"
                  />
                </div>
              </div>

              {/* End Time Row */}
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] xl:contents">
                <div className="xl:border-r border-b xl:border-b border-[#2F3336] min-h-[42px] flex items-center px-3 py-2 xl:py-0 bg-[#0D0E11]/50 xl:bg-transparent">
                  <label className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">End Time</label>
                </div>
                <div className="bg-[#0D0E11] border-b border-[#2F3336] min-h-[42px] flex items-center">
                  <SingleDateTimePicker
                    date={publicPhase.endDate}
                    onDateChange={(date) => updatePublicPhaseDate('endDate', date)}
                    placeholder="dd/mm/yyyy. 7 PM UTC"
                    className="w-full space-y-0 border-0"
                  />
                </div>
              </div>

              {/* Mint Price Row */}
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] xl:contents">
                <div className="xl:border-r border-b xl:border-b border-[#2F3336] min-h-[42px] flex items-center px-3 py-2 xl:py-0 bg-[#0D0E11]/50 xl:bg-transparent">
                  <label className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">Mint Price</label>
                </div>
                <div className="bg-[#0D0E11] border-b border-[#2F3336] min-h-[42px] flex items-center">
                  <input
                    suppressHydrationWarning
                    className="w-full h-full bg-transparent px-3 text-white font-mono text-sm xl:text-[15px] outline-none placeholder:text-[#505052]"
                    value={publicPhase.price}
                    onChange={(e) => setPublicPhase(prev => ({ ...prev, price: normalizePriceInput(e.target.value) }))}
                    placeholder="0 ETH"
                  />
                </div>
              </div>

              {/* Max Mint per address Row */}
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] xl:contents">
                <div className="xl:border-r border-b md:border-b-0 border-[#2F3336] min-h-[42px] flex items-center px-3 py-2 xl:py-0 bg-[#0D0E11]/50 xl:bg-transparent">
                  <label className="text-[#B392F0] font-mono font-bold text-sm xl:text-[15px]">Max Mint per address</label>
                </div>
                <div className="bg-[#0D0E11] min-h-[42px] flex items-center">
                  <input
                    suppressHydrationWarning
                    type="number"
                    className="w-full h-full bg-transparent px-3 text-white font-mono text-sm xl:text-[15px] outline-none placeholder:text-[#505052]"
                    value={publicPhase.maxPerAddress}
                    onChange={(e) => setPublicPhase(prev => ({ ...prev, maxPerAddress: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata Type Section */}
        <div className="border border-[#2F3336] border-t-0">
          {/* Header */}
          <div className="relative w-full h-[117px] overflow-hidden border-b border-[#2F3336]">
            <div className="absolute inset-0">
              <Image
                src="/images/information-bg-56586a.png"
                alt="Metadata Type background"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <h2 className="font-mono font-black text-sm uppercase tracking-wider text-[#B392F0]">
                METADATA TYPE
              </h2>
            </div>
          </div>

          {/* Metadata Type Table Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Open Edition Row */}
            <div className='p-4 border-r border-[#2F3336]'>
              <div className={cn(
                "rounded-lg min-h-[119px] cursor-pointer transition-all duration-200 bg-[#0D0E11] relative",
                collectionType === 'open' ? "bg-[#B392F0] border-[#B392F0]" : "border border-[#2F3336]"
              )}
                onClick={() => setCollectionType('open')}>
                <div className="p-4 sm:p-6 h-full flex items-start gap-3 sm:gap-4">
                  <div className="text-4xl sm:text-[54px] leading-tight w-10 sm:w-[58px]">🖼️</div>
                  <div className="flex-1">
                    <h3 className={cn("font-mono font-bold text-sm sm:text-[14px] mb-1 sm:mb-2",
                      collectionType == 'open' ? 'text-black' : 'text-[#B392F0]'
                    )}>Open Edition</h3>
                    <p className={cn("font-mono text-xs sm:text-[14px] leading-relaxed",
                      collectionType == 'open' ? 'text-black' : 'text-[#505052]'
                    )}>Everyone mints the same artwork · Unlimited supply
                    </p>
                  </div>
                  {collectionType === 'open' && (
                    <div className="absolute top-4 right-4 w-[29px] h-[29px] bg-[#0D3323] rounded-full flex items-center justify-center">
                      <HugeiconsIcon icon={Tick01Icon} className="w-[15px] h-[10px] text-[#25D663]" strokeWidth={4} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Area with Rowspan - Desktop Only */}
            <div className="hidden lg:block lg:row-span-2 bg-[#0D0E11] p-4 sm:p-6">
              <div className="text-center space-y-2 file-upload-area">
                <label className="block text-[#B392F0] font-mono font-bold text-[14px] leading-[16px]">
                  {collectionType === 'open'
                    ? 'Upload Image (Single)'
                    : 'Upload Metadata Collection (ZIP)'}
                </label>
                <p className="text-[#857F94] font-mono text-[11px] leading-[14px] mb-2">
                  {collectionType === 'open'
                    ? '1 image for all NFTs in the collection'
                    : 'ZIP file containing metadata (1.json, 2.json, etc)'}
                </p>
                <div className={cn(
                  "border-2 border-dashed rounded-lg relative overflow-hidden h-[220px] transition-colors",
                  errors.metadataFile
                    ? "bg-red-950/20 border-red-500"
                    : "bg-[#1E1F22] border-[#B392F0]"
                )}>
                  <div className="h-full flex flex-col items-center justify-center p-4">
                    <div className={cn(
                      "w-[29px] h-[29px] rounded mb-2 flex items-center justify-center",
                      errors.metadataFile ? "bg-red-500" : "bg-[#B392F0]"
                    )}>
                      <HugeiconsIcon icon={Upload01Icon} size={16} className="text-[#0D0E11]" />
                    </div>
                    <div className="text-center space-y-1">
                      {metadataFile ? (
                        <>
                          <p className="text-green-500 font-mono text-[14px] leading-[16px] font-medium">
                            {metadataFile.name}
                          </p>
                          <p className="text-[#857F94] font-mono text-[12px]">
                            {(metadataFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <p className="text-[#B392F0] font-mono text-[11px]">
                            {metadataFile.type || 'Unknown type'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-white font-mono text-[14px] leading-[16px] font-medium">
                            Choose {collectionType === 'open' ? 'Image' : 'ZIP'} file
                          </p>
                          <p className="text-[#857F94] font-mono text-[14px] leading-[16px]">
                            Drag here
                          </p>
                          <p className="text-[#857F94] font-mono text-[11px] mt-2">
                            {collectionType === 'open' ? 'JPG, PNG, GIF, WEBP' : 'ZIP format only'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept={collectionType === 'open' ? 'image/*' : '.zip,application/zip,application/x-zip-compressed'}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setMetadataFile(file);
                      if (errors.metadataFile) {
                        setErrors(prev => ({ ...prev, metadataFile: '' }));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {errors.metadataFile && (
                  <p className="text-red-500 text-xs font-mono mt-1">{errors.metadataFile}</p>
                )}
              </div>
            </div>

            {/* Standard Collection Row */}
            <div className='p-4 border-r border-t border-[#2F3336]'>
              <div className={cn(
                "rounded-lg min-h-[119px] cursor-pointer transition-all duration-200 bg-[#0D0E11] relative",
                collectionType === 'standard' ? "bg-[#B392F0] border-[#B392F0]" : "border border-[#2F3336]"
              )}
                onClick={() => setCollectionType('standard')}>
                <div className="p-4 sm:p-6 h-full flex items-start gap-3 sm:gap-4">
                  <div className="grid grid-cols-2 gap-1 text-xl sm:text-[26px] w-10 sm:w-[55px] h-10 sm:h-[56px]">
                    <span className="text-xl sm:text-[25px] leading-tight">🖼️</span>
                    <span className="text-xl sm:text-[25px] leading-tight">🖼️</span>
                    <span className="text-xl sm:text-[25px] leading-tight">🖼️</span>
                    <span className="text-xl sm:text-[25px] leading-tight">🖼️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={cn("font-mono font-bold text-sm sm:text-[14px] mb-1 sm:mb-2",
                      collectionType == 'standard' ? 'text-black' : 'text-[#B392F0]'
                    )}>
                      Standard Collection
                    </h3>
                    <p className={cn("font-mono text-xs sm:text-[14px] leading-relaxed",
                      collectionType == 'standard' ? 'text-black' : 'text-[#505052]'
                    )}>
                      Everyone mints a unique artwork · Max 10,000 NFTs
                    </p>
                  </div>
                  {collectionType === 'standard' && (
                    <div className="absolute top-4 right-4 w-[29px] h-[29px] bg-[#0D3323] rounded-full flex items-center justify-center">
                      <HugeiconsIcon icon={Tick01Icon} className="w-[15px] h-[10px] text-[#25D663]" strokeWidth={4} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Area - Mobile/Tablet Only (Below both options) */}
            <div className="block lg:hidden bg-[#0D0E11] border-b border-[#2F3336] p-4 sm:p-6">
              <div className="space-y-2 file-upload-area">
                <label className="block text-[#B392F0] font-mono font-bold text-sm sm:text-[14px]">
                  {collectionType === 'open'
                    ? 'Upload Image (Single)'
                    : 'Upload Metadata Collection (ZIP)'}
                </label>
                <p className="text-[#857F94] font-mono text-xs sm:text-[11px] mb-2">
                  {collectionType === 'open'
                    ? '1 image for all NFTs in the collection'
                    : 'ZIP file containing metadata (1.json, 2.json, etc)'}
                </p>
                <div className={cn(
                  "border-2 border-dashed rounded-lg relative overflow-hidden h-[220px] transition-colors",
                  errors.metadataFile
                    ? "bg-red-950/20 border-red-500"
                    : "bg-[#1E1F22] border-[#B392F0]"
                )}>
                  <div className="h-full flex flex-col items-center justify-center p-4">
                    <div className={cn(
                      "w-[29px] h-[29px] rounded mb-2 flex items-center justify-center",
                      errors.metadataFile ? "bg-red-500" : "bg-[#B392F0]"
                    )}>
                      <HugeiconsIcon icon={Upload01Icon} size={16} className="text-[#0D0E11]" />
                    </div>
                    <div className="text-center space-y-1">
                      {metadataFile ? (
                        <>
                          <p className="text-green-500 font-mono text-sm sm:text-[14px] font-medium">
                            {metadataFile.name}
                          </p>
                          <p className="text-[#857F94] font-mono text-xs sm:text-[12px]">
                            {(metadataFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <p className="text-[#B392F0] font-mono text-xs sm:text-[11px]">
                            {metadataFile.type || 'Unknown type'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-white font-mono text-sm sm:text-[14px] font-medium">
                            Choose {collectionType === 'open' ? 'Image' : 'ZIP'} file
                          </p>
                          <p className="text-[#857F94] font-mono text-sm sm:text-[14px]">
                            Drag here
                          </p>
                          <p className="text-[#857F94] font-mono text-xs sm:text-[11px] mt-2">
                            {collectionType === 'open' ? 'JPG, PNG, GIF, WEBP' : 'ZIP format only'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept={collectionType === 'open' ? 'image/*' : '.zip,application/zip,application/x-zip-compressed'}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setMetadataFile(file);
                      if (errors.metadataFile) {
                        setErrors(prev => ({ ...prev, metadataFile: '' }));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {errors.metadataFile && (
                  <p className="text-red-500 text-xs font-mono mt-1">{errors.metadataFile}</p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Featured Partner Code Row */}
        <div className="border border-[#2F3336] border-t-0">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px]">
            <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
              <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Featured Partner Code</label>
            </div>
            <div className="bg-[#0D0E11]">
              <input
                suppressHydrationWarning
                className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
                value={collectionData.partnerCode || ''}
                onChange={(e) => {
                  setCollectionData(prev => ({ ...prev, partnerCode: e.target.value }));
                }}
                placeholder="(Optional)"
              />
            </div>
          </div>
        </div>

        {/* Launch Section */}
        <div className="border border-[#2F3336] border-t-0">
          <div className="bg-[#0D0E11] p-6 sm:p-12 lg:p-[78px]">
            <div className="text-center space-y-8 sm:space-y-10 lg:space-y-[30px]">

              <div className="space-y-3 sm:space-y-[13px]">
                <h2 className="text-xl sm:text-2xl lg:text-[30px] font-mono font-medium text-[#F7F8FB] leading-tight">Time to show off!</h2>
              </div>

              <div className="space-y-4">
                {/* Loading Progress Indicator */}
                {isSubmitting && loadingStep && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#B392F0] font-mono">{loadingStep}</span>
                      <span className="text-[#857F94] font-mono">{loadingProgress}%</span>
                    </div>
                    <div className="w-full bg-[#1E1F22] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#B392F0] to-[#B8A8FF] h-full transition-all duration-500 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                      />
                    </div>

                    {/* Detailed Upload Progress for Collection Type */}
                    {uploadProgress && (
                      <div className="bg-[#1E1F22] rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white font-mono truncate max-w-[70%]">
                            {uploadProgress.fileName}
                          </span>
                          <span className="text-[#B392F0] font-mono font-bold">
                            {uploadProgress.uploadedMB !== undefined && uploadProgress.totalMB !== undefined
                              ? `${uploadProgress.uploadedMB.toFixed(2)} MB / ${uploadProgress.totalMB.toFixed(2)} MB`
                              : `${uploadProgress.current} / ${uploadProgress.total}`}
                          </span>
                        </div>
                        <div className="w-full bg-[#0D0E11] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#25D663] h-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress.percentage}%` }}
                          />
                        </div>
                        <div className="text-center">
                          <span className="text-[#857F94] font-mono text-xs">
                            {uploadProgress.percentage}% uploaded
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  suppressHydrationWarning
                  className={cn(
                    "rounded-md px-8 sm:px-16 lg:px-[148px] py-3 sm:py-[12px] font-mono font-bold text-sm sm:text-base lg:text-[16px] transition-colors flex items-center justify-center gap-2 mx-auto w-full sm:w-auto",
                    isSubmitting
                      ? "bg-gray-500 cursor-not-allowed text-gray-300"
                      : "bg-[#B8A8FF] hover:bg-[#A896F0] text-[#0E0F11]"
                  )}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <HugeiconsIcon icon={Loading01Icon} size={16} className="animate-spin" />}
                  {isSubmitting ? 'LAUNCHING...' : 'LAUNCH NOW'}
                  <img src="/images/Fantasy.png" className='h-[18px]' />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}


