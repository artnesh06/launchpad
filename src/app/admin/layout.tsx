'use client';

import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminErrorBoundary from '@/components/admin/AdminErrorBoundary';
import { QueryProvider } from '@/components/providers/query-provider';

export default function AdminLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';

    // Jika halaman login, tampilkan tanpa sidebar dan header
    if (isLoginPage) {
        return <>{children}</>;
    }

    // Halaman admin lainnya dengan sidebar dan header
    return (
        <QueryProvider>
            <AdminErrorBoundary>
                <div className="flex h-screen overflow-hidden">
                    {/* Sidebar */}
                    <AdminSidebar />

                    {/* Main Content */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <AdminHeader />

                        <main className="flex-1 overflow-y-auto bg-[#0D0E11] p-6">
                            {children}
                        </main>
                    </div>
                </div>
            </AdminErrorBoundary>
        </QueryProvider>
    );
}
