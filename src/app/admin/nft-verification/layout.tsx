'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function NFTVerificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check admin authentication
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth/check');
        if (!response.ok) {
          router.push('/admin/login');
          return;
        }
        setIsChecking(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      }
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
