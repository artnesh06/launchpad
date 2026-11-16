'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUrlUpload } from '@/components/ui/image-url-upload';
import { AdminBanner } from '@/hooks/useAdminBanners';

interface EditBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  banner: AdminBanner | null;
  onSubmit: (id: string, data: Partial<AdminBanner>) => Promise<void>;
}

export function EditBannerModal({ isOpen, onClose, banner, onSubmit }: EditBannerModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    creator: '',
    network: 'evm',
    image: '',
    thumbnail: '',
    type: 'IMAGE' as 'IMAGE' | 'VIDEO',
    twitter: '',
    discord: '',
    telegram: '',
    collectionAddress: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SCHEDULED',
    startDate: '',
    endDate: '',
    sequence: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (banner) {
      setFormData({
        title: banner.title || '',
        creator: banner.creator || '',
        network: banner.network || 'evm',
        image: banner.image || '',
        thumbnail: banner.thumbnail || '',
        type: banner.type || 'IMAGE',
        twitter: banner.twitter || '',
        discord: banner.discord || '',
        telegram: banner.telegram || '',
        collectionAddress: banner.collectionAddress || '',
        status: banner.status || 'ACTIVE',
        startDate: banner.startDate ? new Date(banner.startDate).toISOString().slice(0, 16) : '',
        endDate: banner.endDate ? new Date(banner.endDate).toISOString().slice(0, 16) : '',
        sequence: banner.sequence || 0
      });
    }
  }, [banner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banner) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(banner.id, formData);
      onClose();
    } catch (error) {
      console.error('Failed to update banner:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!banner) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0D0E11] border-[#2F3336] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl">Edit Banner</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-mono">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creator" className="font-mono">Creator *</Label>
              <Input
                id="creator"
                value={formData.creator}
                onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                required
              />
            </div>
          </div>

          <ImageUrlUpload
            label="Banner Image"
            value={formData.image}
            onValueChange={(url) => setFormData({ ...formData, image: url })}
            height="h-[200px]"
            required
          />

          <ImageUrlUpload
            label="Thumbnail (Optional)"
            value={formData.thumbnail}
            onValueChange={(url) => setFormData({ ...formData, thumbnail: url })}
            height="h-[150px]"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="font-mono">Type</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F22] border-[#2D2E32] text-white">
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="font-mono">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F22] border-[#2D2E32] text-white">
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="font-mono">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="font-mono">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="collectionAddress" className="font-mono">Collection Address</Label>
            <Input
              id="collectionAddress"
              value={formData.collectionAddress}
              onChange={(e) => setFormData({ ...formData, collectionAddress: e.target.value })}
              className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twitter" className="font-mono">Twitter</Label>
              <Input
                id="twitter"
                value={formData.twitter}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord" className="font-mono">Discord</Label>
              <Input
                id="discord"
                value={formData.discord}
                onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram" className="font-mono">Telegram</Label>
              <Input
                id="telegram"
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="font-mono">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#B392F0] hover:bg-[#9370DB] font-mono">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
