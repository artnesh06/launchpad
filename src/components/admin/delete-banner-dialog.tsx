'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AdminBanner } from '@/hooks/useAdminBanners';
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert01Icon } from '@hugeicons/core-free-icons';
interface DeleteBannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  banner: AdminBanner | null;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteBannerDialog({ isOpen, onClose, banner, onConfirm }: DeleteBannerDialogProps) {
  const handleConfirm = async () => {
    if (banner) {
      await onConfirm(banner.id);
      onClose();
    }
  };

  if (!banner) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0D0E11] border-[#2F3336] text-white">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl flex items-center gap-2">
            <HugeiconsIcon icon={Alert01Icon} size={20} className="text-red-500" />
            Delete Banner
          </DialogTitle>
          <DialogDescription className="text-gray-400 font-mono">
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-300 font-mono">
            Are you sure you want to delete the banner <span className="font-bold text-white">"{banner.title}"</span>?
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="font-mono">
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleConfirm}
            className="font-mono"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
