'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlatformFeeHistory } from '@/hooks/admin/usePlatformFeeHistory';
import { PlatformFeeHistoryTable } from '@/components/admin/platform-fee-history-table';
import { PlatformBalanceOverview } from '@/components/admin/platform-balance-overview';
import { PlatformBalanceSummary } from '@/components/admin/platform-balance-summary';

export default function PlatformFeePage() {
    const { 
        history, 
        isLoading: isLoadingHistory, 
        error: historyError,
        pagination,
        refetch: refetchHistory 
    } = usePlatformFeeHistory();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white font-mono">Platform Fee</h1>
                    <p className="text-gray-400 font-mono">Monitor and manage platform fee collection</p>
                </div>
            </div>

            {/* Real-time Balance Summary from Contracts */}
            <div>
                <h2 className="text-xl font-bold text-white font-mono mb-4">Available Balances (Real-time)</h2>
                <PlatformBalanceSummary />
            </div>

            {/* Platform Balances by Collection */}
            <PlatformBalanceOverview />

            {/* Transaction History */}
            <Card className="bg-[#0D0E11] border-[#2F3336]">
                <CardHeader>
                    <CardTitle className="text-white font-mono">Transaction History</CardTitle>
                    <CardDescription className="text-gray-400 font-mono">
                        Recent platform fee transactions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PlatformFeeHistoryTable 
                        history={history}
                        isLoading={isLoadingHistory}
                        error={historyError}
                        pagination={pagination}
                        onRefresh={refetchHistory}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
