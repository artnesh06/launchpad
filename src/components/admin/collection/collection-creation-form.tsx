'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CollectionDetails } from './collection-details';
import { CollectionSettings } from './collection-settings';
import { MediaAssets } from './media-assets';
import { SalePhases } from './sale-phases';
import { ProfileAssets } from './profile-assets';
import { SocialLinks } from './social-links';
import { useWallet } from '@/hooks/use-wallet';
import { useNotifications } from '@/hooks/use-notifications';
import { ContractService } from '@/lib/contract-service';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  ArrowLeft01Icon, 
  ArrowRight01Icon, 
  Tick01Icon, 
  Rocket01Icon,
  Alert01Icon,
  InformationCircleIcon
} from '@hugeicons/core-free-icons';

interface CollectionFormData {
  // Collection Details
  collectionDetails: {
    collectionName: string;
    collectionSymbol: string;
    description: string;
  };
  
  // Collection Settings
  collectionSettings: {
    royaltyPayeeAddress: string;
    royaltyPercentage: number;
    maxSupply: number;
  };
  
  // Media Assets
  mediaAssets: {
    nftMedia: any[];
    nftMetadata: any[];
    uploadMethod: 'manual' | 'ipfs' | 'thirdparty';
  };
  
  // Sale Phases
  salePhases: {
    phases: any[];
    enablePublicSale: boolean;
    publicSalePrice: string;
  };
  
  // Profile Assets
  profileAssets: {
    coverCollection: any;
    profileCollection: any;
  };
  
  // Social Links
  socialLinks: {
    links: any[];
  };
}

interface CollectionCreationFormProps {
  onClose?: () => void;
  chainId?: number;
}

export function CollectionCreationForm({ 
  onClose, 
  chainId 
}: CollectionCreationFormProps) {
  const { address, isConnected } = useWallet();
  const { notify } = useNotifications();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({
    0: true,
    1: false,
    2: false,
    3: false
  });

  // Form data state
  const [formData, setFormData] = useState<CollectionFormData>({
    collectionDetails: {
      collectionName: '',
      collectionSymbol: '',
      description: ''
    },
    collectionSettings: {
      royaltyPayeeAddress: address || '',
      royaltyPercentage: 500, // 5%
      maxSupply: 10000
    },
    mediaAssets: {
      nftMedia: [],
      nftMetadata: [],
      uploadMethod: 'manual'
    },
    salePhases: {
      phases: [],
      enablePublicSale: true,
      publicSalePrice: '0.1'
    },
    profileAssets: {
      coverCollection: null,
      profileCollection: null
    },
    socialLinks: {
      links: []
    }
  });

  const steps = [
    {
      id: 'details',
      title: 'Collection Details',
      description: 'Basic information about your collection',
      component: CollectionDetails,
      required: true
    },
    {
      id: 'settings',
      title: 'Collection Settings',
      description: 'Configure royalties and supply',
      component: CollectionSettings,
      required: true
    },
    {
      id: 'media',
      title: 'Media Assets',
      description: 'Upload your NFT media files',
      component: MediaAssets,
      required: true
    },
    {
      id: 'phases',
      title: 'Sale Phases',
      description: 'Configure sale phases and pricing',
      component: SalePhases,
      required: false
    }
  ];

  // Calculate form completion percentage
  const getCompletionPercentage = useCallback(() => {
    let completed = 0;
    let total = 0;

    // Collection Details (required)
    total += 3;
    if (formData.collectionDetails.collectionName) completed++;
    if (formData.collectionDetails.collectionSymbol) completed++;
    if (formData.collectionDetails.description) completed++;

    // Collection Settings (required)
    total += 3;
    if (formData.collectionSettings.royaltyPayeeAddress) completed++;
    if (formData.collectionSettings.royaltyPercentage > 0) completed++;
    if (formData.collectionSettings.maxSupply > 0) completed++;

    // Media Assets (optional but recommended)
    total += 2;
    if (formData.mediaAssets.nftMedia.length > 0) completed++;
    if (formData.mediaAssets.nftMetadata.length > 0) completed++;

    // Sale Phases (optional)
    total += 1;
    if (formData.salePhases.phases.length > 0) completed++;

    return Math.round((completed / total) * 100);
  }, [formData]);

  // Validate current step
  const validateStep = useCallback((step: number) => {
    switch (step) {
      case 0: // Collection Details
        return !!(
          formData.collectionDetails.collectionName &&
          formData.collectionDetails.collectionSymbol
        );
      case 1: // Collection Settings
        return !!(
          formData.collectionSettings.royaltyPayeeAddress &&
          formData.collectionSettings.maxSupply > 0
        );
      case 2: // Media Assets
        return true; // Optional step
      case 3: // Sale Phases
        return true; // Optional step
      default:
        return false;
    }
  }, [formData]);

  const handleDataChange = (section: keyof CollectionFormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: data
    }));
  };

  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      toggleSection(currentStep); // Collapse current
      toggleSection(currentStep + 1); // Expand next
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      toggleSection(currentStep); // Collapse current
      toggleSection(currentStep - 1); // Expand previous
    }
  };

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      notify.error('Wallet Not Connected', 'Please connect your wallet first');
      return;
    }

    if (!chainId) {
      notify.error('Network Error', 'No chain ID provided');
      return;
    }

    setIsSubmitting(true);

    try {
      const contractService = new ContractService();
      
      // Prepare deployment request
      const deploymentRequest = {
        name: formData.collectionDetails.collectionName,
        symbol: formData.collectionDetails.collectionSymbol,
        description: formData.collectionDetails.description,
        baseURI: '', // Will be updated with IPFS URI
        unrevealedURI: '',
        contractURI: '',
        externalLink: formData.socialLinks.links.find(l => l.platform === 'website')?.url || '',
        totalMaxSupply: formData.collectionSettings.maxSupply,
        treasury: address,
        royaltyRecipient: formData.collectionSettings.royaltyPayeeAddress || address,
        royaltyPercentage: formData.collectionSettings.royaltyPercentage
      };

      console.log('Creating launchpad with data:', deploymentRequest);

      const txHash = await contractService.createLaunchpad(chainId, deploymentRequest);

      notify.success(
        'Collection Created!', 
        'Your NFT collection is being deployed to the blockchain.',
        {
          action: {
            label: 'View Transaction',
            onClick: () => {
              // Open block explorer
              const explorerUrl = `https://etherscan.io/tx/${txHash}`;
              window.open(explorerUrl, '_blank');
            }
          }
        }
      );

      // Close form after successful creation
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 2000);
      }

    } catch (error) {
      console.error('Error creating collection:', error);
      notify.error(
        'Creation Failed', 
        error instanceof Error ? error.message : 'Failed to create collection'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = validateStep(0) && validateStep(1); // Minimum required steps

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Create Collection</h2>
                <p className="text-muted-foreground text-sm">
                  Launch your NFT collection with customizable settings
                </p>
              </div>
            </div>
          </div>
          
          {onClose && (
            <Button variant="outline" onClick={onClose} className="self-start sm:self-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          )}
        </div>

        {/* Progress Card */}
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">Form Progress</span>
                <Badge 
                  variant={getCompletionPercentage() === 100 ? "default" : "secondary"}
                  className="px-2 py-1"
                >
                  {getCompletionPercentage()}% Complete
                </Badge>
              </div>
              <Progress value={getCompletionPercentage()} className="h-2 w-full sm:w-64" />
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Required</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Optional</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main Form Section */}
        <div className="xl:col-span-8 space-y-6">
          {/* Essential Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-foreground">Essential Information</h3>
              <Badge variant="destructive" className="text-xs">Required</Badge>
            </div>
            
            <CollectionDetails
              data={formData.collectionDetails}
              onChange={(data) => handleDataChange('collectionDetails', data)}
              isExpanded={expandedSections[0]}
              onToggle={() => toggleSection(0)}
            />

            <CollectionSettings
              data={formData.collectionSettings}
              onChange={(data) => handleDataChange('collectionSettings', data)}
              isExpanded={expandedSections[1]}
              onToggle={() => toggleSection(1)}
            />
          </div>

          {/* Media & Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-foreground">Media & Configuration</h3>
              <Badge variant="secondary" className="text-xs">Optional</Badge>
            </div>

            <MediaAssets
              data={formData.mediaAssets}
              onChange={(data) => handleDataChange('mediaAssets', data)}
              isExpanded={expandedSections[2]}
              onToggle={() => toggleSection(2)}
            />

            <SalePhases
              data={formData.salePhases}
              onChange={(data) => handleDataChange('salePhases', data)}
              isExpanded={expandedSections[3]}
              onToggle={() => toggleSection(3)}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-4 space-y-6">
          {/* Preview & Assets */}
          <div className="sticky top-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-foreground">Preview & Assets</h3>
            </div>

            <ProfileAssets
              data={formData.profileAssets}
              onChange={(data) => handleDataChange('profileAssets', data)}
            />

            <SocialLinks
              data={formData.socialLinks}
              onChange={(data) => handleDataChange('socialLinks', data)}
            />

            {/* Action Panel */}
            <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Rocket className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-primary font-semibold">Ready to Launch?</h4>
                  <p className="text-sm text-muted-foreground">
                    Deploy your collection to the blockchain
                  </p>
                </div>

                {!canSubmit && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200 text-sm">
                          Missing Required Fields
                        </p>
                        <ul className="text-yellow-700 dark:text-yellow-300 text-xs space-y-1">
                          {!formData.collectionDetails.collectionName && (
                            <li>• Collection name</li>
                          )}
                          {!formData.collectionDetails.collectionSymbol && (
                            <li>• Collection symbol</li>
                          )}
                          {!formData.collectionSettings.royaltyPayeeAddress && (
                            <li>• Royalty payee address</li>
                          )}
                          {formData.collectionSettings.maxSupply <= 0 && (
                            <li>• Max supply</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <Button 
                    className="w-full h-12 text-base font-semibold" 
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                        Creating Collection...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-5 h-5 mr-2" />
                        Create Collection
                      </>
                    )}
                  </Button>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p>Transaction fees will be required to deploy on blockchain</p>
                        <p>Estimated gas: ~0.002 ETH</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}