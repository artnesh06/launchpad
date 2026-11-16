'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar01Icon } from '@hugeicons/core-free-icons';
interface ApprovePromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  promo: any;
  onApprove: (promoId: string, data: { startDate?: string; endDate?: string; sequence?: number }) => Promise<void>;
}

export function ApprovePromoModal({ isOpen, onClose, promo, onApprove }: ApprovePromoModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sequence, setSequence] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!promo) return;

    setIsSubmitting(true);
    try {
      await onApprove(promo.id, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sequence
      });
      onClose();
      setStartDate('');
      setEndDate('');
      setSequence(0);
    } catch (error) {
      console.error('Failed to approve promo:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!promo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0D0E11] border-[#2F3336] text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl">Approve Promo Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {promo.image && (
                <div className="h-24 w-32 rounded bg-[#1E1F22] overflow-hidden">
                  <img 
                    src={promo.image} 
                    alt={promo.collectionName} 
                    className="h-full w-full object-cover" 
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-medium text-lg font-mono">{promo.collectionName}</h3>
                <p className="text-sm text-gray-400 font-mono">By {promo.creator}</p>
                <p className="text-sm text-gray-400 font-mono">Promo Code: {promo.promoCode}</p>
              </div>
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="font-mono flex items-center gap-2">
                <HugeiconsIcon icon={Calendar01Icon} size={16} />
                Start Date (Optional)
              </Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
              />
              <p className="text-xs text-gray-500 font-mono">
                Leave empty to start immediately
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="font-mono flex items-center gap-2">
                <HugeiconsIcon icon={Calendar01Icon} size={16} />
                End Date (Optional)
              </Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
              />
              <p className="text-xs text-gray-500 font-mono">
                Leave empty for no expiration
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sequence" className="font-mono">
                Display Order
              </Label>
              <Input
                id="sequence"
                type="number"
                value={sequence}
                onChange={(e) => setSequence(parseInt(e.target.value) || 0)}
                className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                min="0"
              />
              <p className="text-xs text-gray-500 font-mono">
                Lower numbers appear first
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="font-mono"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white font-mono"
            >
              {isSubmitting ? 'Approving...' : 'Approve & Create Banner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
