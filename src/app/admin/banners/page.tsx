'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HugeiconsIcon } from '@hugeicons/react';
import { Image01Icon, Add01Icon, TickDouble02Icon, CancelCircleIcon, Clock01Icon } from '@hugeicons/core-free-icons';
import { useAdminBanners } from '@/hooks/useAdminBanners';
import { CreateBannerModal } from '@/components/admin/create-banner-modal';
import { EditBannerModal } from '@/components/admin/edit-banner-modal';
import { DeleteBannerDialog } from '@/components/admin/delete-banner-dialog';
import { ApprovePromoModal } from '@/components/admin/approve-promo-modal';
import { SortableBannerList } from '@/components/admin/sortable-banner-list';
import type { AdminBanner } from '@/types/admin';

export default function BannersPage() {
    const { 
        banners, 
        promoRequests,
        isLoading, 
        error, 
        createBanner, 
        updateBanner, 
        deleteBanner, 
        reorderBanners,
        approvePromo,
        rejectPromo
    } = useAdminBanners();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState<AdminBanner | null>(null);
    const [selectedPromo, setSelectedPromo] = useState<any>(null);

    const handleEditClick = (banner: AdminBanner) => {
        setSelectedBanner(banner);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (banner: AdminBanner) => {
        setSelectedBanner(banner);
        setIsDeleteDialogOpen(true);
    };

    const handleApproveClick = (promo: any) => {
        setSelectedPromo(promo);
        setIsApproveModalOpen(true);
    };

    const handleRejectPromo = async (promoId: string) => {
        if (confirm('Are you sure you want to reject this promo request?')) {
            await rejectPromo(promoId);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white font-mono">Banner Management</h1>
                        <p className="text-gray-400 font-mono">Manage homepage banners and promotional content</p>
                    </div>
                </div>
                <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                        ))}
                    </div>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white font-mono">Banner Management</h1>
                        <p className="text-gray-400 font-mono">Manage homepage banners and promotional content</p>
                    </div>
                </div>
                <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
                    <div className="text-center py-8 text-red-400 font-mono">
                        Error loading banners: {error.message}
                    </div>
                </Card>
            </div>
        );
    }

    const activeBanners = banners.filter(b => b.status === 'ACTIVE');
    const pendingPromos = promoRequests?.filter((p: any) => p.status === 'PENDING') || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white font-mono">Banner Management</h1>
                    <p className="text-gray-400 font-mono">Manage homepage banners and promotional content</p>
                </div>
                <Button 
                    onClick={() => setIsCreateModalOpen(true)} 
                    className="bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono"
                >
                    <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
                    Create Banner
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-[#B392F0] font-mono">
                            Total Banners
                        </CardTitle>
                        <HugeiconsIcon icon={Image01Icon} size={16} className="text-[#B392F0]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white font-mono">{banners.length}</div>
                    </CardContent>
                </Card>

                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-[#B392F0] font-mono">
                            Active
                        </CardTitle>
                        <HugeiconsIcon icon={TickDouble02Icon} size={16} className="text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white font-mono">{activeBanners.length}</div>
                    </CardContent>
                </Card>

                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-[#B392F0] font-mono">
                            Pending Promos
                        </CardTitle>
                        <HugeiconsIcon icon={Clock01Icon} size={16} className="text-yello" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white font-mono">{pendingPromos.length}</div>
                    </CardContent>
                </Card>

                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-[#B392F0] font-mono">
                            Inactive
                        </CardTitle>
                        <HugeiconsIcon icon={CancelCircleIcon} size={16} className="text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white font-mono">
                            {banners.filter(b => b.status === 'INACTIVE').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="banners" className="space-y-4">
                <TabsList className="bg-[#1E1F22]">
                    <TabsTrigger value="banners" className="font-mono">
                        Active Banners ({activeBanners.length})
                    </TabsTrigger>
                    <TabsTrigger value="all" className="font-mono">
                        All Banners ({banners.length})
                    </TabsTrigger>
                    <TabsTrigger value="promos" className="font-mono">
                        Promo Requests ({pendingPromos.length})
                    </TabsTrigger>
                </TabsList>

                {/* Active Banners Tab */}
                <TabsContent value="banners">
                    <Card className="bg-[#0D0E11] border-[#2F3336]">
                        <CardHeader>
                            <CardTitle className="text-white font-mono">Active Banners</CardTitle>
                            <p className="text-sm text-gray-400 font-mono">
                                Drag to reorder. Only active banners are shown on homepage.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <SortableBannerList
                                banners={activeBanners}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                onReorder={reorderBanners}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* All Banners Tab */}
                <TabsContent value="all">
                    <Card className="bg-[#0D0E11] border-[#2F3336]">
                        <CardHeader>
                            <CardTitle className="text-white font-mono">All Banners</CardTitle>
                            <p className="text-sm text-gray-400 font-mono">
                                View and manage all banners including inactive ones.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <SortableBannerList
                                banners={banners}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                onReorder={reorderBanners}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Promo Requests Tab */}
                <TabsContent value="promos">
                    <Card className="bg-[#0D0E11] border-[#2F3336]">
                        <CardHeader>
                            <CardTitle className="text-white font-mono">Promo Requests</CardTitle>
                            <p className="text-sm text-gray-400 font-mono">
                                Review and approve promotional banner requests from creators.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {pendingPromos.length === 0 ? (
                                <div className="text-center py-12">
                                    <HugeiconsIcon icon={Clock01Icon} size={48} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-sm text-gray-400 font-mono">
                                        No pending promo requests
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingPromos.map((promo: any) => (
                                        <div
                                            key={promo.id}
                                            className="flex items-center justify-between p-4 border border-[#2F3336] rounded-lg"
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="h-16 w-24 rounded bg-[#1E1F22] overflow-hidden">
                                                    {promo.image && (
                                                        <img 
                                                            src={promo.image} 
                                                            alt={promo.title} 
                                                            className="h-full w-full object-cover" 
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-medium text-white font-mono">
                                                            {promo.collectionName}
                                                        </h3>
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            Promo Code: {promo.promoCode}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-400 font-mono">
                                                        By {promo.creator} • {promo.chainName}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-mono mt-1">
                                                        Requested: {new Date(promo.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApproveClick(promo)}
                                                    className="bg-green-600 hover:bg-green-700 text-white font-mono"
                                                >
                                                    <HugeiconsIcon icon={TickDouble02Icon} size={16} className="mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleRejectPromo(promo.id)}
                                                    className="font-mono"
                                                >
                                                    <HugeiconsIcon icon={CancelCircleIcon} size={16} className="mr-1" />
                                                    Reject
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <CreateBannerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={createBanner}
            />

            <EditBannerModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedBanner(null);
                }}
                banner={selectedBanner}
                onSubmit={updateBanner}
            />

            <DeleteBannerDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setSelectedBanner(null);
                }}
                banner={selectedBanner}
                onConfirm={deleteBanner}
            />

            <ApprovePromoModal
                isOpen={isApproveModalOpen}
                onClose={() => {
                    setIsApproveModalOpen(false);
                    setSelectedPromo(null);
                }}
                promo={selectedPromo}
                onApprove={approvePromo}
            />
        </div>
    );
}
