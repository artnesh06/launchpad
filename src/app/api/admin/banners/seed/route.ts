import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const banners = [
  {
    title: 'NFT1',
    creator: 'MozeBase',
    network: 'intergaze',
    image: '/images/Banner/NFT1 Banner.webp',
    thumbnail: '/images/Banner/NFT1.webp',
    type: 'IMAGE' as const,
    status: 'ACTIVE' as const,
    sequence: 1,
    telegram: '',
    twitter: null,
    discord: null,
    collectionAddress: null,
    launchpadId: null,
    mintedDate: null,
    mintedLink: null
  },
  {
    title: 'NFT2',
    creator: 'MozeBase',
    network: 'intergaze',
    image: '/images/Banner/NFT2 Banner.webp',
    thumbnail: '/images/Banner/NFT2.webp',
    type: 'IMAGE' as const,
    status: 'ACTIVE' as const,
    sequence: 2,
    telegram: '',
    twitter: null,
    discord: null,
    collectionAddress: null,
    launchpadId: null,
    mintedDate: null,
    mintedLink: null
  },
  {
    title: 'NFT3',
    creator: 'MozeBase',
    network: 'intergaze',
    image: '/images/Banner/NFT3 Banner.webp',
    thumbnail: '/images/Banner/NFT3.webp',
    type: 'IMAGE' as const,
    status: 'ACTIVE' as const,
    sequence: 3,
    telegram: '',
    twitter: null,
    discord: null,
    collectionAddress: null,
    launchpadId: null,
    mintedDate: null,
    mintedLink: null
  },
  {
    title: 'NFT4',
    creator: 'MozeBase',
    network: 'intergaze',
    image: '/images/Banner/NFT4 Banner.webp',
    thumbnail: '/images/Banner/NFT4.webp',
    type: 'IMAGE' as const,
    status: 'ACTIVE' as const,
    sequence: 4,
    telegram: '',
    twitter: null,
    discord: null,
    collectionAddress: null,
    launchpadId: null,
    mintedDate: null,
    mintedLink: null
  }
];

// POST - Seed banners
export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { deleteExisting } = await request.json().catch(() => ({ deleteExisting: false }));

    // Delete existing banners if requested
    if (deleteExisting) {
      await prisma.banner.deleteMany({});
      console.log('🗑️  Deleted existing banners');
    }

    // Insert banners
    const created = [];
    for (const banner of banners) {
      const result = await prisma.banner.create({
        data: banner
      });
      created.push(result);
      console.log(`✅ Created banner: ${result.title} (ID: ${result.id})`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${created.length} banners`,
      data: created
    });
  } catch (error) {
    console.error('❌ Error seeding banners:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to seed banners',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
