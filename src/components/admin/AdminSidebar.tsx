'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    DashboardSquare01Icon,
    FactoryIcon,
    Layers01Icon,
    Image01Icon,
    BarChartIcon,
    Settings01Icon,
    Rocket01Icon,
    Wallet01Icon,
    File01Icon,
    Alert01Icon,
    Activity01Icon,
    CheckmarkBadge02Icon
} from '@hugeicons/core-free-icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: DashboardSquare01Icon },
    { name: 'Factory', href: '/admin/factory', icon: FactoryIcon },
    { name: 'Collections', href: '/admin/collections', icon: Layers01Icon },
    { name: 'Banners', href: '/admin/banners', icon: Image01Icon },
    { name: 'Platform Fee', href: '/admin/platform-fee', icon: Wallet01Icon },
    { name: 'Templates', href: '/admin/templates', icon: File01Icon },
    { name: 'NFT Verification', href: '/admin/nft-verification', icon: CheckmarkBadge02Icon },
    { name: 'Emergency', href: '/admin/emergency', icon: Alert01Icon },
    { name: 'Activity Logs', href: '/admin/activity-logs', icon: Activity01Icon },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChartIcon },
    { name: 'Settings', href: '/admin/settings', icon: Settings01Icon }
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full w-64 flex-col border-r border-[#2F3336] bg-[#0D0E11]">
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 border-b border-[#2F3336] px-6">
                <HugeiconsIcon icon={Rocket01Icon} className="h-6 w-6 text-[#B392F0]" />
                <h1 className="text-lg font-bold text-white font-mono">Admin Panel</h1>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-3 py-4">
                <nav className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium font-mono transition-all hover:bg-[#1E1F22]',
                                    isActive
                                        ? 'bg-[#1E1F22] text-[#B392F0]'
                                        : 'text-gray-400 hover:text-white'
                                )}
                            >
                                <HugeiconsIcon icon={item.icon} className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            <Separator className="bg-[#1E1F22]" />
            
            {/* Footer */}
            <div className="p-4">
                <div className="rounded-lg bg-[#1E1F22] p-3">
                    <p className="text-xs font-medium text-white font-mono">NFT Launchpad</p>
                    <p className="text-xs text-gray-400 font-mono">Admin Dashboard v1.0</p>
                </div>
            </div>
        </div>
    );
}
