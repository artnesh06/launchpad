'use client';

import Image from 'next/image';

interface Feature {
  title: string;
  description: string;
  icon: string;
  iconSize: { width: number; height: number };
  link: string;
  linkText: string;
}

const features: Feature[] = [
  {
    title: 'Apply Featured Spot',
    description: 'Join us and showcase your masterpiece.',
    icon: '/images/icons/Apply Featured Spot.webp',
    iconSize: { width: 32, height: 32 },
    link: 'https://tally.so/r/xXMWjv',
    linkText: 'Apply now'
  },
  {
    title: 'Create NFT',
    description: 'Create on-chain art and track your collection.',
    icon: '/images/icons/Create NFT.webp',
    iconSize: { width: 32, height: 32 },
    link: '/create/add',
    linkText: 'Create now'
  },
  {
    title: 'FAQ',
    description: 'Everything you need to know before you start.',
    icon: '/images/icons/FAQ.webp',
    iconSize: { width: 32, height: 32 },
    link: 'https://honey-tie-a7f.notion.site/Odds-Launchpad-2f3056d9d4938061895fde0d24fe567c',
    linkText: 'Read more'
  }
];

export function FeaturesSection() {
  return (
    <div className="w-full border border-[#2F3336] border-b-0 border-t-0">
      {/* Header with Background Image */}
      <div className="relative h-[117px] border-b border-[#2F3336]">
        <div className="absolute inset-0">
          <Image
            src="/images/information-bg-56586a.png"
            alt=""
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E11] via-[#0D0E11]/50 to-transparent" />
        </div>
        <div className="relative h-full flex items-center justify-center">
          <h2 className="text-[#B392F0] font-mono text-sm font-semibold uppercase tracking-wider">
            FEATURES
          </h2>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-3 border-b border-[#2F3336]">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`relative h-[217px] flex flex-col items-center justify-start py-8 ${
              index < 2 ? 'border-r border-[#2F3336]' : ''
            }`}
          >
            {/* Icon Background */}
            <div className="relative w-10 h-10 rounded-lg mb-6">
              <div className="absolute inset-0 rounded-lg flex items-center justify-center">
                <Image
                  src={feature.icon}
                  alt=""
                  width={feature.iconSize.width}
                  height={feature.iconSize.height}
                  className="object-contain"
                />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-[#F7F8FB] font-mono text-xl font-medium text-center leading-[28px] mb-[10px] px-12">
              {feature.title}
            </h3>

            {/* Description */}
            <p className="text-[#A9ABAF] font-mono text-sm font-normal text-center leading-[20px] px-12 mb-[10px] whitespace-pre-line">
              {feature.description}
            </p>

            {/* Learn More Link */}
            <a href={feature.link} target='_blank' className="text-[#B8A8FF] font-mono text-sm font-normal cursor-pointer">
              { feature.linkText } &gt;
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
