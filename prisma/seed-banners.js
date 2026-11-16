const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const banners = [
  {
    title: 'NFT1',
    creator: 'MozeBase',
    network: 'intergaze',
    image: '/images/Banner/NFT1 Banner.webp',
    thumbnail: '/images/Banner/NFT1.webp',
    type: 'IMAGE',
    status: 'ACTIVE',
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
    type: 'IMAGE',
    status: 'ACTIVE',
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
    type: 'IMAGE',
    status: 'ACTIVE',
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
    type: 'IMAGE',
    status: 'ACTIVE',
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

async function main() {
  console.log('🌱 Seeding banners...');

  // Delete existing banners (optional - comment out if you want to keep existing data)
  // await prisma.banner.deleteMany({});
  // console.log('🗑️  Deleted existing banners');

  // Insert banners
  for (const banner of banners) {
    const created = await prisma.banner.create({
      data: banner
    });
    console.log(`✅ Created banner: ${created.title} (ID: ${created.id})`);
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding banners:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
