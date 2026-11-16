'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert01Icon, Pause01Icon, Play01Icon, DollarCircleIcon, Refresh01Icon, Lock01Icon, Unlock01Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmergencyPauseModal } from '@/components/admin/emergency-pause-modal';
import { EmergencyWithdrawModal } from '@/components/admin/emergency-withdraw-modal';
import { ForceSyncModal } from '@/components/admin/force-sync-modal';

export default function EmergencyPage() {
    const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<'pause' | 'unpause' | null>(null);

    const handlePauseAction = (action: 'pause' | 'unpause') => {
        setSelectedAction(action);
        setIsPauseModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white font-mono">Emergency Operations</h1>
                    <p className="text-gray-400 font-mono">Critical contract management and intervention tools</p>
                </div>
            </div>

            {/* Critical Warning */}
            <Alert className="bg-red-500/10 border-red-500/50">
                <HugeiconsIcon icon={Alert01Icon} size={16} className="text-red-500" />
                <AlertTitle className="text-red-500">Critical Operations</AlertTitle>
                <AlertDescription className="text-red-400">
                    These operations directly affect contract functionality and user experience. 
                    Use only in emergency situations. All actions are logged and require blockchain transactions.
                </AlertDescription>
            </Alert>

            {/* Emergency Actions Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Pause Contract */}
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={Pause01Icon} size={20} className="text-red-500" />
                            <CardTitle className="text-white font-mono">Pause Contract</CardTitle>
                        </div>
                        <CardDescription className="text-gray-400 font-mono">
                            Emergency pause to stop all contract operations
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-400 font-mono">
                            Pausing will prevent:
                        </p>
                        <ul className="text-sm text-gray-400 font-mono list-disc list-inside space-y-1">
                            <li>New mints</li>
                            <li>Transfers (if enabled)</li>
                            <li>Phase updates</li>
                            <li>Most admin operations</li>
                        </ul>
                        <Button
                            variant="destructive"
                            className="w-full font-mono"
                            onClick={() => handlePauseAction('pause')}
                        >
                            <HugeiconsIcon icon={Pause01Icon} size={16} className="mr-2" />
                            Pause Contract
                        </Button>
                    </CardContent>
                </Card>

                {/* Unpause Contract */}
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={Play01Icon} size={20} className="text-green-500" />
                            <CardTitle className="text-white font-mono">Unpause Contract</CardTitle>
                        </div>
                        <CardDescription className="text-gray-400 font-mono">
                            Resume normal contract operations
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-400 font-mono">
                            Unpausing will restore:
                        </p>
                        <ul className="text-sm text-gray-400 font-mono list-disc list-inside space-y-1">
                            <li>Minting functionality</li>
                            <li>Transfer capabilities</li>
                            <li>Phase management</li>
                            <li>All admin operations</li>
                        </ul>
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-mono"
                            onClick={() => handlePauseAction('unpause')}
                        >
                            <HugeiconsIcon icon={Play01Icon} size={16} className="mr-2" />
                            Unpause Contract
                        </Button>
                    </CardContent>
                </Card>

                {/* Emergency Withdraw */}
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={DollarCircleIcon} size={20} className="text-yello" />
                            <CardTitle className="text-white font-mono">Emergency Withdraw</CardTitle>
                        </div>
                        <CardDescription className="text-gray-400 font-mono">
                            Withdraw funds from contract treasury
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-400 font-mono">
                            Use this to:
                        </p>
                        <ul className="text-sm text-gray-400 font-mono list-disc list-inside space-y-1">
                            <li>Recover stuck funds</li>
                            <li>Emergency fund transfer</li>
                            <li>Treasury management</li>
                        </ul>
                        <Button
                            variant="outline"
                            className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 font-mono"
                            onClick={() => setIsWithdrawModalOpen(true)}
                        >
                            <HugeiconsIcon icon={DollarCircleIcon} size={16} className="mr-2" />
                            Withdraw Funds
                        </Button>
                    </CardContent>
                </Card>

                {/* Force Sync */}
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={Refresh01Icon} size={20} className="text-blue-500" />
                            <CardTitle className="text-white font-mono">Force Sync</CardTitle>
                        </div>
                        <CardDescription className="text-gray-400 font-mono">
                            Force synchronization of specific launchpad
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-400 font-mono">
                            Use when:
                        </p>
                        <ul className="text-sm text-gray-400 font-mono list-disc list-inside space-y-1">
                            <li>Data is out of sync</li>
                            <li>Missing transactions</li>
                            <li>Incorrect statistics</li>
                        </ul>
                        <Button
                            variant="outline"
                            className="w-full border-blue-500 text-blue-500 hover:bg-blue-500/10 font-mono"
                            onClick={() => setIsSyncModalOpen(true)}
                        >
                            <HugeiconsIcon icon={Refresh01Icon} size={16} className="mr-2" />
                            Force Sync
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Transfer Lock Management */}
            <Card className="bg-[#0D0E11] border-[#2F3336]">
                <CardHeader>
                    <CardTitle className="text-white font-mono">Transfer Lock Management</CardTitle>
                    <CardDescription className="text-gray-400 font-mono">
                        Control NFT transfer capabilities across collections
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 border border-[#2F3336] rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <HugeiconsIcon icon={Lock01Icon} size={20} className="text-red-500" />
                                <h3 className="text-white font-mono font-semibold">Lock Transfers</h3>
                            </div>
                            <p className="text-sm text-gray-400 font-mono mb-4">
                                Prevent all NFT transfers. Useful for preventing trading before reveal.
                            </p>
                            <Button
                                variant="destructive"
                                className="w-full font-mono"
                                disabled
                            >
                                <HugeiconsIcon icon={Lock01Icon} size={16} className="mr-2" />
                                Lock Transfers
                            </Button>
                        </div>

                        <div className="p-4 border border-[#2F3336] rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <HugeiconsIcon icon={Unlock01Icon} size={20} className="text-green-500" />
                                <h3 className="text-white font-mono font-semibold">Unlock Transfers</h3>
                            </div>
                            <p className="text-sm text-gray-400 font-mono mb-4">
                                Enable NFT transfers. Allow normal trading and transfers.
                            </p>
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-mono"
                                disabled
                            >
                                <HugeiconsIcon icon={Unlock01Icon} size={16} className="mr-2" />
                                Unlock Transfers
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Modals */}
            <EmergencyPauseModal
                isOpen={isPauseModalOpen}
                onClose={() => {
                    setIsPauseModalOpen(false);
                    setSelectedAction(null);
                }}
                action={selectedAction}
            />

            <EmergencyWithdrawModal
                isOpen={isWithdrawModalOpen}
                onClose={() => setIsWithdrawModalOpen(false)}
            />

            <ForceSyncModal
                isOpen={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
            />
        </div>
    );
}
