import { Metadata } from 'next';
import { ipfsToHttp } from '@/lib/ipfs-utils';
import { getChainName } from '@/config/chains';
import { getContractAddressFromSlug } from '@/constants/collection-slugs';
import { prisma } from '@/lib/prisma';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  // Resolve slug to contract address
  const contractAddress = getContractAddressFromSlug(resolvedParams.id);

  try {
    // Fetch directly from database to bypass Vercel firewall
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://oddslaunchpad.com';

    console.log('[Metadata] Fetching from database for:', contractAddress);

    const launchpad = await prisma.launchpad.findFirst({
      where: {
        contractAddress: {
          equals: contractAddress,
          mode: 'insensitive',
        },
      },
      include: {
        phases: {
          orderBy: {
            startTime: 'asc',
          },
        },
        metadata: true,
      },
    });

    if (!launchpad) {
      console.error('[Metadata] Launchpad not found:', contractAddress);
      throw new Error('Launchpad not found');
    }

    const result = { success: true, data: { items: [launchpad] } };
    console.log('[Metadata] API result:', result.success ? 'Success' : 'Failed', result.data?.items?.length || 0, 'items');

    if (result.success && result.data.items && result.data.items.length > 0) {
      const launchpad = result.data.items[0];
      
      // Process image URL
      const imageUrl = launchpad.metadata?.image 
        ? (ipfsToHttp(launchpad.metadata.image) || `${baseUrl}/images/Banner.png`)
        : `${baseUrl}/images/Banner.png`;

      // Get chain name
      const chainName = getChainName(launchpad.chainId);

      // Get active phase info
      const activePhase = launchpad.phases?.find((p: any) => p.isActive);
      const mintPrice = activePhase?.price || '0';
      const phaseName = activePhase?.name || 'Public Mint';

      // Calculate minted percentage
      const totalSupply = launchpad.totalMaxSupply || 0;
      const mintedCount = launchpad.mintedCount || 0;
      const mintedPercent = totalSupply > 0 
        ? ((mintedCount / totalSupply) * 100).toFixed(1)
        : '0';

      // Build description with key info
      const description = launchpad.description || 
        `${launchpad.name} - ${phaseName} on ${chainName}. ${mintedCount}/${totalSupply} minted (${mintedPercent}%). Mint price: ${mintPrice} ETH.`;

      const title = `${launchpad.name} | Odds Launchpad`;
      const url = `${baseUrl}/l/${contractAddress}`;

      console.log('[Metadata] Generated metadata for:', launchpad.name);

      return {
        title,
        description,
        keywords: [
          launchpad.name,
          'NFT',
          'mint',
          'launchpad',
          chainName,
          'blockchain',
          'digital art',
          'on-chain',
          phaseName,
        ],
        openGraph: {
          title,
          description,
          url,
          siteName: 'Odds',
          type: 'website',
          images: [
            {
              url: imageUrl,
              alt: launchpad.name,
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [imageUrl],
          creator: launchpad.metadata?.twitter 
            ? `@${launchpad.metadata.twitter.replace(/^@/, '')}` 
            : '@oddslaunchpad',
        },
        alternates: {
          canonical: url,
        },
        other: {
          // Additional metadata for SEO
          'nft:collection': launchpad.name,
          'nft:contract': contractAddress,
          'nft:chain': chainName,
          'nft:mint_price': `${mintPrice} ETH`,
          'nft:total_supply': totalSupply.toString(),
          'nft:minted': mintedCount.toString(),
          'nft:phase': phaseName,
        },
      };
    }
  } catch (error) {
    console.error('Error generating metadata:', error);
  }

  // Fallback metadata if fetch fails
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://oddslaunchpad.com';
  return {
    title: 'NFT Collection | Odds Launchpad',
    description: 'Explore and mint NFTs on Odds Launchpad. Create art on-chain, track your collection, and grow your audience.',
    openGraph: {
      title: 'NFT Collection | Odds Launchpad',
      description: 'Explore and mint NFTs on Odds Launchpad.',
      type: 'website',
      siteName: 'Odds',
      images: [
        {
          url: `${baseUrl}/images/Banner.png`,
          alt: 'Odds Launchpad',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'NFT Collection | Odds Launchpad',
      description: 'Explore and mint NFTs on Odds Launchpad.',
      images: [`${baseUrl}/images/Banner.png`],
      creator: '@oddslaunchpad',
    },
  };
}

export default function LaunchpadDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
