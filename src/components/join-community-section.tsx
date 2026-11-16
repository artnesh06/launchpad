'use client';

import Image from 'next/image';

export function JoinCommunitySection() {
  return (
    <div>
      <div className="w-full min-h-[275px] flex flex-col items-center justify-center pt-10 pb-4">
        {/* Heading */}
        <h2 className="text-[#F7F8FB] font-mono text-[30px] font-medium text-center leading-[36px] mb-[24px]">
          Join the community now!
        </h2>

        {/* Social Media Icons */}
        <div className="flex items-center gap-8 mb-[24px]">
          <a href="https://discord.gg/74hmCmGMPk" className="text-[#A9ABAF] hover:text-white transition-colors cursor-pointer">
          {/* <a href="#" className="text-[#A9ABAF] hover:text-white transition-colors cursor-pointer">   */}
            <div className='bg-[#1E1F22] w-12 h-8 py-2 rounded-lg flex items-center justify-center'>
              <Image
                src="/images/icons/Discord.webp"
                alt="Discord"
                width={25}
                height={26}
              />
            </div>
          </a>
          <a href="https://x.com/oddslaunchpad" className="text-[#A9ABAF] hover:text-white transition-colors cursor-pointer">
            <div className='bg-[#1E1F22] w-12 h-8 py-2 rounded-lg flex items-center justify-center'>
              <Image
                src="/images/icons/X.png"
                alt="X (Twitter)"
                width={20}
                height={20}
              />
            </div>
          </a>
        </div>

        {/* Copyright */}
        <p className="text-[#A9ABAF] font-mono text-sm font-medium text-center leading-[20px] tracking-[-0.025em]">
          © 2025 Oddsify ∙ <a href="https://honey-tie-a7f.notion.site/Terms-of-Service-2f3056d9d49380cbb186e9d2c5b2dc31" className="cursor-pointer" target='_blank'>Terms of Service</a> ∙ <a href="https://honey-tie-a7f.notion.site/Odds-Launchpad-2f3056d9d4938061895fde0d24fe567c" className="cursor-pointer" target='_blank'>Docs</a>
          {/* © 2025 Oddsify ∙ Terms of Service ∙ Docs */}
        </p>
      </div>
    </div>
  );
}
