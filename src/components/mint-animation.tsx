'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { UserMint } from '@/types/websocket';

interface MintAnimationProps {
  userMints: UserMint[];
  className?: string;
}

export function MintAnimation({ userMints, className = '' }: MintAnimationProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (userMints.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <div
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#B392F0]/30 to-transparent" />
          <span className="text-[#B392F0] text-sm font-mono">Latest Mints</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#B392F0]/30 to-transparent" />
        </div>
        <div className="flex justify-center">
          <svg
            className={`w-5 h-5 text-[#B392F0] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 px-2 py-2">
            <AnimatePresence mode="popLayout">
              {userMints.map((mint, index) => (
                <motion.div
                  key={`${mint.contractAddress}-${mint.tokenId}-${mint.timestamp.getTime()}-${index}`}
                  initial={{ opacity: 0, x: 50, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    opacity: { duration: 0.3 }
                  }}
                  className="flex-shrink-0 relative group"
                >
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-[#2D253E] border-2 border-[#B392F0]/50 hover:border-[#B392F0] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#B392F0]/20">
                    {mint.imageUrl ? (
                      <img
                        src={mint.imageUrl}
                        alt={`NFT #${mint.tokenId}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[#B392F0] text-2xl font-bold">
                          #{mint.tokenId}
                        </span>
                      </div>
                    )}

                    {/* Shine effect on new mints */}
                    {mint.animationState === 'entering' && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      />
                    )}
                  </div>

                  {/* Token ID badge */}
                  <div className="absolute -bottom-1 -right-1 bg-[#B392F0] text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                    #{mint.tokenId}
                  </div>

                  {/* "NEW" badge for entering mints */}
                  {mint.animationState === 'entering' && (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 15 }}
                      className="absolute -top-2 -left-2 bg-[#0BFF75] text-black text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                    >
                      NEW
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
