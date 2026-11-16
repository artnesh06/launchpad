'use client';

import CreatorStudio from '@/components/admin/creator-studio';
import { useRouter } from 'next/navigation';
import { WagmiReadyGuard } from '@/components/providers/wagmi-ready-guard';

export default function CreateAddPage() {
  const router = useRouter();

  const handleCollectionCreated = () => {
    // Redirect back to create list after successful creation
    router.push('/create');
  };

  return (
    <WagmiReadyGuard>
      <CreatorStudio onSubmit={handleCollectionCreated} />
    </WagmiReadyGuard>
  );
}
