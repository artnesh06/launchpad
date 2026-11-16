'use client';

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useSwitchChain } from 'wagmi';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';
import { getChainOptions } from '@/lib/chain-utils';
import { useEffect, useState } from 'react';
import { WagmiReadyGuard } from '@/components/providers/wagmi-ready-guard';

interface ChainSelectionProps {
    value: string;
    onChange: (chainName: string, chainId: number | 'all') => void;
}

function ChainSelectionContent({ value, onChange }: ChainSelectionProps) {
    const selectedChain = value;
    const { switchChain } = useSwitchChain();
    
    // Get chains from centralized config
    const chains = getChainOptions();

    return (
        <div className="w-full h-full flex items-center gap-0">
            <button
                onClick={() => onChange("All Chains", 'all')}
                className={cn(
                    selectedChain === "All Chains" ? "bg-[#2D253E]" : "",
                    "h-[52px] cursor-pointer flex gap-2 text-white items-center justify-center border-r border-[#2F3336] transition-all duration-300",
                    selectedChain === "All Chains" ? "px-6 min-w-[172px]" : "px-3"
                )}
                suppressHydrationWarning
            >
                <img
                    src="/images/Chain/AllChain.png"
                    alt="All Chains"
                    className={cn('w-[20px] h-[18px]', selectedChain != "All Chains" && 'opacity-50')}
                />
                {selectedChain === "All Chains" && <span className="text-base">All Chains</span>}
            </button>
            {chains.map((chain) => (
                <button
                    onClick={async () => {
                        onChange(chain.name, chain.chainId);
                        
                        // Auto switch network jika bukan "All Chains"
                        if (switchChain) {
                            try {
                                await switchChain({ chainId: chain.chainId });
                                console.log(`✅ Switched to ${chain.name} (${chain.chainId})`);
                            } catch (error: any) {
                                console.error('Failed to switch network:', error);
                                if (error.message?.includes('User rejected')) {
                                    toast.error('Network switch cancelled', { id: TOAST_ID });
                                } else {
                                    toast.error('Failed to switch network', {
                                        description: 'Please switch manually in your wallet'
                                    , id: TOAST_ID });
                                }
                            }
                        }
                    }}
                    key={chain.name}
                    className={cn(
                        selectedChain === chain.name ? "bg-[#2D253E]" : "",
                        "h-[52px] cursor-pointer flex gap-2 text-white items-center justify-center border-r border-[#2F3336] transition-all duration-300",
                        selectedChain === chain.name ? "px-6" : "px-3"
                    )}
                    suppressHydrationWarning
                >
                    <img src={chain.icon} alt={chain.name} className={cn("w-[22px] h-[22px]", selectedChain != chain.name && 'opacity-50')} />
                    {selectedChain === chain.name && <span className="text-base">{chain.name}</span>}
                </button>
            ))}
        </div>
    )
}

const ChainSelection = ({ value, onChange }: ChainSelectionProps) => {
    const chains = getChainOptions();
    
    return (
        <WagmiReadyGuard
            fallback={
                <div className="w-full h-full flex items-center gap-0">
                    <button
                        className="h-[52px] flex gap-2 text-white items-center justify-center border-r border-[#2F3336] px-6 min-w-[172px] bg-[#2D253E]"
                        suppressHydrationWarning
                    >
                        <img
                            src="/images/Chain/AllChain.png"
                            alt="All Chains"
                            className="w-[20px] h-[18px]"
                        />
                        <span className="text-base">All Chains</span>
                    </button>
                    {chains.map((chain) => (
                        <button
                            key={chain.name}
                            className="h-[52px] flex gap-2 text-white items-center justify-center border-r border-[#2F3336] px-3"
                            suppressHydrationWarning
                        >
                            <img src={chain.icon} alt={chain.name} className="w-[22px] h-[22px] opacity-50" />
                        </button>
                    ))}
                </div>
            }
        >
            <ChainSelectionContent value={value} onChange={onChange} />
        </WagmiReadyGuard>
    );
}

export default ChainSelection;

