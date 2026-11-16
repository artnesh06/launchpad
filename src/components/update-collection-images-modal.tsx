'use client';

import * as React from 'react';
import { Drawer } from '@/components/ui/drawer';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload01Icon } from '@hugeicons/core-free-icons';
import { ModalFooterWithGas } from '@/components/modal-footer-with-gas';
import { getCreatorAuthHeadersSafe } from '@/lib/creator-auth-client';

interface UpdateCollectionImagesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  collectionId?: string;
  currentImages?: {
    coverImage?: string;
    bannerImage?: string;
  };
}

export function UpdateCollectionImagesModal({ open, onClose, onSuccess, collectionId, currentImages }: UpdateCollectionImagesModalProps) {
  const [coverImage, setCoverImage] = React.useState<File | null>(null);
  const [bannerImage, setBannerImage] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Load existing images when modal opens
  React.useEffect(() => {
    if (open && currentImages) {
      setCoverPreview(currentImages.coverImage || null);
      setBannerPreview(currentImages.bannerImage || null);
    }
  }, [open, currentImages]);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExecute = async () => {
    if (!coverImage && !bannerImage) {
      toast.error('Please select at least one image to upload', { id: TOAST_ID });
      return;
    }

    if (!collectionId) {
      toast.error('Collection ID is required', { id: TOAST_ID });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('collectionId', collectionId);
      
      if (coverImage) {
        formData.append('coverImage', coverImage);
      }
      
      if (bannerImage) {
        formData.append('bannerImage', bannerImage);
      }

      const authHeaders = await getCreatorAuthHeadersSafe('collection:update-images', collectionId);
      const response = await fetch('/api/collections/update-images', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update images');
      }
      
      toast.success('Collection images updated successfully!', { id: TOAST_ID });
      
      // Reset file inputs
      setCoverImage(null);
      setBannerImage(null);
      
      // Call onSuccess callback to refresh parent data
      onSuccess?.();
      
      onClose();
    } catch (error: any) {
      console.error('Failed to update images:', error);
      toast.error('Failed to update images', {
        description: error.message || 'Please try again'
      , id: TOAST_ID });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      position="bottom"
      showOverlay={true}
    >
      {/* Custom Header Bar */}
      <div className="h-[40px] border-b border-[#2F3336] flex items-center justify-between px-6">
        <div className="flex items-center gap-4 text-[#6A7282] text-[13px] font-mono">
          <ModalFooterWithGas />
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded bg-[#1E192B] flex items-center justify-center text-white text-[15px] font-light hover:bg-[#2D253E] transition-colors"
        >
          ×
        </button>
      </div>

      {/* Content - Table Layout */}
      <div className="w-full max-w-[1000px] mx-auto">
        {/* Image Upload Section - Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-[#2F3336]">
          {/* Cover Image */}
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] min-h-[300px]">
            <div className="p-6 h-full flex flex-col">
              <h3 className="text-[#B392F0] font-mono font-bold text-[15px] mb-4 text-center">
                Change Cover Image (800×800px)
              </h3>
              <div className="flex-1 flex flex-col items-center justify-center">
                <input
                  type="file"
                  id="cover-upload"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="cover-upload"
                  className="w-full max-w-[330px] h-[200px] border-2 border-dashed border-[#2F3336] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#B392F0] transition-colors bg-[#0D0E11] relative group"
                >
                  {coverPreview ? (
                    <>
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <p className="text-white font-mono text-sm">Click to change</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Upload01Icon} size={32} className="text-[#6A7282] mb-3" />
                      <p className="text-[#6A7282] font-mono text-sm mb-2">Drag here</p>
                      <button
                        type="button"
                        className="px-4 py-2 bg-[#B392F0] text-black font-mono text-sm rounded hover:bg-[#9B7FD8] transition-colors"
                      >
                        Choose Image
                      </button>
                    </>
                  )}
                </label>
                {coverPreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setCoverImage(null);
                      setCoverPreview(null);
                    }}
                    className="mt-2 text-[#F87683] font-mono text-sm hover:text-[#FF8A96] transition-colors"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Banner Image */}
          <div className="min-h-[300px]">
            <div className="p-6 h-full flex flex-col">
              <h3 className="text-[#B392F0] font-mono font-bold text-[15px] mb-4 text-center">
                Change Banner Image (1000×300px)
              </h3>
              <div className="flex-1 flex flex-col items-center justify-center">
                <input
                  type="file"
                  id="banner-upload"
                  accept="image/*"
                  onChange={handleBannerImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="banner-upload"
                  className="w-full max-w-[330px] h-[200px] border-2 border-dashed border-[#2F3336] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#B392F0] transition-colors bg-[#0D0E11] relative group"
                >
                  {bannerPreview ? (
                    <>
                      <img
                        src={bannerPreview}
                        alt="Banner preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <p className="text-white font-mono text-sm">Click to change</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Upload01Icon} size={32} className="text-[#6A7282] mb-3" />
                      <p className="text-[#6A7282] font-mono text-sm mb-2">Drag here</p>
                      <button
                        type="button"
                        className="px-4 py-2 bg-[#B392F0] text-black font-mono text-sm rounded hover:bg-[#9B7FD8] transition-colors"
                      >
                        Choose Image
                      </button>
                    </>
                  )}
                </label>
                {bannerPreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setBannerImage(null);
                      setBannerPreview(null);
                    }}
                    className="mt-2 text-[#F87683] font-mono text-sm hover:text-[#FF8A96] transition-colors"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Execute Button Row */}
        <div className="flex justify-end border-b border-[#2F3336]">
          <button
            onClick={handleExecute}
            disabled={loading}
            className="w-[140px] h-[48px] bg-[#B392F0] text-black text-[16px] font-semibold font-mono hover:bg-[#9B7FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              'Execute'
            )}
          </button>
        </div>
      </div>
    </Drawer>
  );
}


