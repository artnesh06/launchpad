'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Rocket01Icon, TickDouble02Icon, Clock01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import { usePromoRequests } from '@/hooks/usePromoRequests';

export default function CreatorStudioPage() {
  const { promoRequests, isLoading, createPromoRequest } = usePromoRequests();
  const [formData, setFormData] = useState({
    promoCode: '',
    collectionName: '',
    collectionAddress: '',
    creator: '',
    chainId: 1,
    chainName: 'Ethereum',
    image: '',
    thumbnail: '',
    twitter: '',
    discord: '',
    telegram: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createPromoRequest(formData);
      toast.success('Promo request submitted successfully!');
      
      // Reset form
      setFormData({
        promoCode: '',
        collectionName: '',
        collectionAddress: '',
        creator: '',
        chainId: 1,
        chainName: 'Ethereum',
        image: '',
        thumbnail: '',
        twitter: '',
        discord: '',
        telegram: '',
        description: ''
      });
    } catch (error) {
      console.error('Failed to submit promo request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <HugeiconsIcon icon={Clock01Icon} size={16} className="text-yello" />;
      case 'APPROVED':
        return <HugeiconsIcon icon={TickDouble02Icon} size={16} className="text-green-500" />;
      case 'REJECTED':
        return <HugeiconsIcon icon={CancelCircleIcon} size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-600';
      case 'APPROVED':
        return 'bg-green-600';
      case 'REJECTED':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <HugeiconsIcon icon={Rocket01Icon} size={32} className="text-[#B392F0]" />
          <div>
            <h1 className="text-3xl font-bold text-white font-mono">Creator Studio</h1>
            <p className="text-gray-400 font-mono">Submit your collection for homepage banner promotion</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Submit Form */}
          <Card className="bg-[#0D0E11] border-[#2F3336]">
            <CardHeader>
              <CardTitle className="text-white font-mono">Request Banner Promotion</CardTitle>
              <CardDescription className="text-gray-400 font-mono">
                Fill in your collection details and promo code to request a banner spot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="promoCode" className="font-mono text-white">
                    Promo Code *
                  </Label>
                  <Input
                    id="promoCode"
                    value={formData.promoCode}
                    onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })}
                    className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                    placeholder="e.g., LAUNCH2024"
                    required
                  />
                  <p className="text-xs text-gray-500 font-mono">
                    Unique code for your promotion
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collectionName" className="font-mono text-white">
                    Collection Name *
                  </Label>
                  <Input
                    id="collectionName"
                    value={formData.collectionName}
                    onChange={(e) => setFormData({ ...formData, collectionName: e.target.value })}
                    className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creator" className="font-mono text-white">
                    Creator Name *
                  </Label>
                  <Input
                    id="creator"
                    value={formData.creator}
                    onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                    className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collectionAddress" className="font-mono text-white">
                    Collection Address
                  </Label>
                  <Input
                    id="collectionAddress"
                    value={formData.collectionAddress}
                    onChange={(e) => setFormData({ ...formData, collectionAddress: e.target.value })}
                    className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                    placeholder="0x..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chainId" className="font-mono text-white">
                      Chain ID *
                    </Label>
                    <Input
                      id="chainId"
                      type="number"
                      value={formData.chainId}
                      onChange={(e) => setFormData({ ...formData, chainId: parseInt(e.target.value) })}
                      className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chainName" className="font-mono text-white">
                      Chain Name *
                    </Label>
                    <Input
                      id="chainName"
                      value={formData.chainName}
                      onChange={(e) => setFormData({ ...formData, chainName: e.target.value })}
                      className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image" className="font-mono text-white">
                    Banner Image URL
                  </Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail" className="font-mono text-white">
                    Thumbnail URL
                  </Label>
                  <Input
                    id="thumbnail"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                    className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="twitter" className="font-mono text-white">
                      Twitter
                    </Label>
                    <Input
                      id="twitter"
                      value={formData.twitter}
                      onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                      className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discord" className="font-mono text-white">
                      Discord
                    </Label>
                    <Input
                      id="discord"
                      value={formData.discord}
                      onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                      className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegram" className="font-mono text-white">
                      Telegram
                    </Label>
                    <Input
                      id="telegram"
                      value={formData.telegram}
                      onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                      className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="font-mono text-white">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[#1E1F22] border-[#2D2E32] text-white font-mono"
                    rows={3}
                    placeholder="Tell us about your collection..."
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Requests */}
          <Card className="bg-[#0D0E11] border-[#2F3336]">
            <CardHeader>
              <CardTitle className="text-white font-mono">My Requests</CardTitle>
              <CardDescription className="text-gray-400 font-mono">
                Track the status of your banner promotion requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-400 font-mono">Loading...</div>
              ) : promoRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-400 font-mono">
                  No requests yet. Submit your first request!
                </div>
              ) : (
                <div className="space-y-3">
                  {promoRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 border border-[#2F3336] rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-white font-mono">
                            {request.collectionName}
                          </h3>
                          <p className="text-sm text-gray-400 font-mono">
                            Code: {request.promoCode}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-mono text-white flex items-center gap-1 ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          {request.status}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">
                        Submitted: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                      {request.status === 'REJECTED' && request.rejectionReason && (
                        <p className="text-xs text-red-400 font-mono mt-2">
                          Reason: {request.rejectionReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
