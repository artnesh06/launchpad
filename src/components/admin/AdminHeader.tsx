'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HugeiconsIcon } from '@hugeicons/react';
import { Logout01Icon, User01Icon, Settings01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';

export default function AdminHeader() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const res = await fetch('/api/admin/auth', { method: 'DELETE' });
            if (res.ok) {
                toast.success('Logged out successfully', { id: TOAST_ID });
                router.push('/admin/login');
                router.refresh();
            }
        } catch (error) {
            toast.error('Logout failed', { id: TOAST_ID });
        }
    };

    return (
        <header className="flex h-16 items-center justify-between border-b border-[#2F3336] bg-[#0D0E11] px-6">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-white font-mono">Dashboard</h2>
            </div>

            <div className="flex items-center gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-[#1E1F22]">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-[#B392F0] text-white font-mono">
                                    AD
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-[#0D0E11] border-[#2F3336]" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none text-white font-mono">Admin User</p>
                                <p className="text-xs leading-none text-gray-400 font-mono">
                                    admin@nftlaunchpad.com
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-[#1E1F22]" />
                        <DropdownMenuItem onClick={() => router.push('/admin/settings')} className="text-white hover:bg-[#1E1F22] font-mono">
                            <HugeiconsIcon icon={Settings01Icon} size={16} className="mr-2" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[#1E1F22]" />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-[#1E1F22] font-mono">
                            <HugeiconsIcon icon={Logout01Icon} size={16} className="mr-2" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}



