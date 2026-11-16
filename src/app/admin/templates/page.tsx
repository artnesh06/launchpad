'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { FileScriptIcon, Add01Icon, Delete02Icon, TickDouble02Icon, CancelCircleIcon, Refresh01Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTemplateManagement } from '@/hooks/admin/useTemplateManagement';
import { ApproveTemplateModal } from '@/components/admin/approve-template-modal';
import { RemoveTemplateModal } from '@/components/admin/remove-template-modal';

export default function TemplatesPage() {
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

    const { templates, isLoading, error, refetch } = useTemplateManagement();

    const handleRemoveTemplate = (address: string) => {
        setSelectedTemplate(address);
        setIsRemoveModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white font-mono">Template Management</h1>
                    <p className="text-gray-400 font-mono">Manage approved contract templates</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={refetch}
                        variant="outline"
                        className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                    >
                        <HugeiconsIcon icon={Refresh01Icon} size={16} className="mr-2" />
                        Refresh
                    </Button>
                    <Button 
                        onClick={() => setIsApproveModalOpen(true)}
                        className="bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono"
                    >
                        <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
                        Approve Template
                    </Button>
                </div>
            </div>

            {/* Templates Grid */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="bg-[#0D0E11] border-[#2F3336]">
                            <CardHeader>
                                <Skeleton className="h-6 w-[200px]" />
                                <Skeleton className="h-4 w-[150px]" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : error ? (
                <Alert variant="destructive">
                    <AlertTitle>Error loading templates</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                        <span>{error.message}</span>
                        <Button variant="outline" size="sm" onClick={refetch}>
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            ) : templates && templates.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                        <Card key={template.address} className="bg-[#0D0E11] border-[#2F3336]">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <HugeiconsIcon icon={FileScriptIcon} size={20} className="text-[#B392F0]" />
                                        <CardTitle className="text-white font-mono text-sm">
                                            {template.name || 'Template'}
                                        </CardTitle>
                                    </div>
                                    <Badge 
                                        variant={template.isApproved ? 'default' : 'destructive'}
                                        className="font-mono"
                                    >
                                        {template.isApproved ? (
                                            <><HugeiconsIcon icon={TickDouble02Icon} size={12} className="mr-1" /> Approved</>
                                        ) : (
                                            <><HugeiconsIcon icon={CancelCircleIcon} size={12} className="mr-1" /> Not Approved</>
                                        )}
                                    </Badge>
                                </div>
                                <CardDescription className="text-gray-400 font-mono text-xs">
                                    {template.version || 'v1.0.0'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-xs text-gray-400 font-mono">Address</p>
                                    <p className="text-xs text-white font-mono break-all mt-1">
                                        {template.address}
                                    </p>
                                </div>
                                
                                <div>
                                    <p className="text-xs text-gray-400 font-mono">Bytecode Hash</p>
                                    <p className="text-xs text-white font-mono break-all mt-1">
                                        {template.bytecodeHash}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400 font-mono">Chain</p>
                                    <p className="text-xs text-white font-mono mt-1">
                                        {template.chainName}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400 font-mono">Deployments</p>
                                    <p className="text-xs text-white font-mono mt-1">
                                        {template.deploymentCount || 0} contracts
                                    </p>
                                </div>

                                {template.isApproved && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full font-mono"
                                        onClick={() => handleRemoveTemplate(template.address)}
                                    >
                                        <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
                                        Remove Template
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <HugeiconsIcon icon={FileScriptIcon} size={48} className="text-gray-600 mb-4" />
                        <p className="text-sm text-gray-400 font-mono">No templates found</p>
                        <Button 
                            onClick={() => setIsApproveModalOpen(true)}
                            className="mt-4 bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono"
                        >
                            <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
                            Approve First Template
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Modals */}
            <ApproveTemplateModal
                isOpen={isApproveModalOpen}
                onClose={() => setIsApproveModalOpen(false)}
                onSuccess={refetch}
            />

            <RemoveTemplateModal
                isOpen={isRemoveModalOpen}
                onClose={() => {
                    setIsRemoveModalOpen(false);
                    setSelectedTemplate(null);
                }}
                templateAddress={selectedTemplate}
                onSuccess={refetch}
            />
        </div>
    );
}
