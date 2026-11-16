import { NFTHeader } from '@/components/nft-header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator Studio - NFT Launchpad',
  description: 'Create and manage NFT collections on the platform'
};

export default function CreateLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0D0E11]">
      <div>
        {children}
      </div>
    </div>
  );
}
