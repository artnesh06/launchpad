'use client';

import Image from 'next/image';

interface Statistic {
  value: string;
  label: string;
}

const statistics: Statistic[] = [
  {
    value: '10K+',
    label: 'Global Users'
  },
  {
    value: '50M+',
    label: 'Transaction'
  },
  {
    value: '$1M+',
    label: 'Transaction'
  }
];

export function StatisticsSection() {
  return (
    <div className="w-full border border-[#2F3336] border-t-0 border-b-0">
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
          <h2 className="text-[#A9ABAF] font-sans text-sm font-semibold uppercase tracking-wider">
            STATISTICS
          </h2>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-3 border-b border-[#2F3336]">
        {statistics.map((stat, index) => (
          <div
            key={index}
            className={`relative h-[189px] flex flex-col items-center justify-start pt-8 ${
              index < 2 ? 'border-r border-[#2F3336]' : ''
            }`}
          >
            {/* Value */}
            <div className="text-center mb-2">
              <div
                className="font-mono text-[96px] font-bold leading-[96px] bg-gradient-to-b from-[rgba(64,64,64,0.7)] to-[rgba(38,38,38,0.3)] bg-clip-text text-transparent"
                style={{
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {stat.value}
              </div>
            </div>

            {/* Label */}
            <p className="text-[#A9ABAF] font-mono text-sm font-normal text-center leading-[20px]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
