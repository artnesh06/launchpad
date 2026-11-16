'use client';
import Autoplay from 'embla-carousel-autoplay';
import { EmblaOptionsType, EmblaCarouselType } from 'embla-carousel';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';
import Image from 'next/image';
import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BannerWithLaunchpad } from '@/types/launchpad';
import { ipfsToHttp } from '@/lib/ipfs-utils';

type BannerProps = {
  items: BannerWithLaunchpad[];
};

const Banner = ({ items }: BannerProps) => {
  const OPTIONS: EmblaOptionsType = { loop: true };
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false })
  );
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: string }>({});
  const [isLiveTrading, setIsLiveTrading] = useState<boolean>(false);
  const [selectedBanner, setSelectedBanner] = useState<number>(
    items[0]?.banner_id
  );
  const [api, setApi] = useState<EmblaCarouselType | null>(null);
  const [animationKey, setAnimationKey] = useState<number>(0);

  const handleApi = useCallback((newApi: any) => {
    setApi(newApi || null);
  }, []);

  const formatTime = (difference: number) => {
    if (difference <= 0) return '';

    // Calculate time units
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    // Build time string
    const timeArray = [];
    if (days > 0) timeArray.push(`${days}d`);
    if (hours > 0) timeArray.push(`${hours}h`);
    if (minutes > 0) timeArray.push(`${minutes}min`);
    if (seconds > 0) timeArray.push(`${seconds}s`);

    return timeArray.join(' ');
  };

  // Get the appropriate minter based on network
  const getMinter = (banner: BannerWithLaunchpad) => {
    if (!banner.launchpad) return null;
    return null as any; // TODO: Implement minter logic
  };

  // Get launchpad URL based on network
  const getLaunchpadUrl = (banner: BannerWithLaunchpad) => {
    if (!banner.launchpad) return '#';

    return '#';
  };

  // Get trading URL based on network
  const getTradingUrl = (banner: BannerWithLaunchpad) => {
    if (!banner.launchpad) return '#';

    return '#';
  };

  // Callback untuk handle slide change - ini akan dipanggil baik manual maupun autoplay
  const onSlideChange = useCallback(
    (emblaApi: EmblaCarouselType) => {
      if (emblaApi) {
        const currentIndex = emblaApi.selectedScrollSnap();
        setSelectedBanner(items[currentIndex]?.banner_id);
        setAnimationKey(prev => prev + 1); // Reset animasi
      }
    },
    [items]
  );

  // Function untuk handle button click
  const handleBannerClick = (clickedBanner: BannerWithLaunchpad, index: number) => {
    if (api) {
      // Scroll ke slide yang dipilih
      api.scrollTo(index);
      // Update selected banner
      setSelectedBanner(clickedBanner.banner_id);
      // Reset animasi
      setAnimationKey(prev => prev + 1);
      // Reset autoplay
      plugin.current.reset();
    }
  };

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    const updateAllTimers = () => {
      const now = new Date().getTime();
      const newTimeLeft: { [key: string]: string } = {};
      let liveTrading = false;

      items?.forEach((banner) => {
        const minter = getMinter(banner);

        // Handle banner_minted_date countdown
        if (banner.banner_minted_date) {
          const mintedDate = new Date(banner.banner_minted_date).getTime();
          if (now < mintedDate) {
            const difference = mintedDate - now;
            newTimeLeft[`mint_${banner.id}`] = formatTime(difference);
          }
        }

        if (!banner.launchpad || !minter) return;

        const currentStage = minter.currentStage;

        // Check if trading has started
        const tradingStart =
          new Date(banner.launchpad.startTradingTime).getTime();
        const isTradingStarted = now >= tradingStart;

        // If any banner is in live trading, set the global flag
        if (isTradingStarted) {
          liveTrading = true;
        }

        if (!currentStage?.endTime || isTradingStarted) {
          // Trading countdown (only if trading hasn't started yet)
          if (!isTradingStarted) {
            const difference = tradingStart - now;
            if (difference > 0) {
              newTimeLeft[banner.id] = formatTime(difference);
            }
          }
        } else {
          // Stage countdown
          const startTime = new Date(currentStage.startTime).getTime();
          const endTime = new Date(currentStage.endTime).getTime();

          if (now < startTime) {
            newTimeLeft[banner.id] = formatTime(startTime - now);
          } else if (now < endTime) {
            newTimeLeft[banner.id] = formatTime(endTime - now);
          }
        }
      });

      setTimeLeft(newTimeLeft);
      setIsLiveTrading(liveTrading);
    };

    // Update immediately and set interval
    updateAllTimers();
    const timer = setInterval(updateAllTimers, 1000);
    timers.push(timer);

    // Cleanup
    return () => {
      timers.forEach((timer) => clearInterval(timer));
    };
  }, [items]);

  // Effect untuk setup carousel API dan event listeners
  useEffect(() => {
    if (api) {
      // Set initial selected banner
      const initialIndex = api.selectedScrollSnap();
      setSelectedBanner(items[initialIndex]?.banner_id);
      setAnimationKey(prev => prev + 1);

      // Add event listener untuk slide change (baik manual maupun autoplay)
      // Hanya gunakan 'select' untuk menghindari double trigger
      api.on('select', onSlideChange);

      return () => {
        api.off('select', onSlideChange);
      };
    }
  }, [api, onSlideChange, items]);

  const showCurrentStage = (banner: BannerWithLaunchpad) => {
    const minter = getMinter(banner);

    if (!banner.launchpad || !minter) return '';

    const stageName = minter.currentStage?.name;
    const now = new Date().getTime();
    const startTime = minter.currentStage?.startTime
      ? new Date(minter.currentStage.startTime).getTime()
      : new Date().getTime();
    const endTime = minter.currentStage?.endTime
      ? new Date(minter.currentStage.endTime).getTime()
      : new Date().getTime();

    // Check if trading has started for this specific launchpad
    const tradingStart =
      new Date(banner.launchpad.startTradingTime).getTime();
    const isTradingStarted = now >= tradingStart;

    if (isTradingStarted) {
      return (
        <span className="font-bold opacity-70 md:text-lg">
          {banner?.launchpad.minter?.numTokens} Sold Out
        </span>
      );
    } else if (!minter.currentStage?.endTime) {
      return (
        <span className="text-lg font-bold opacity-70">
          Trading starts
          <span className="text-[#49ED4A]">
            {timeLeft[banner.id] ? ` in ${timeLeft[banner.id]}` : ' soon'}
          </span>
        </span>
      );
    } else if (now < startTime) {
      return (
        <span className="text-lg font-bold opacity-70">
          {stageName} Start
          <span className="text-[#49ED4A]">
            {timeLeft[banner.id] ? ` in ${timeLeft[banner.id]}` : ' soon'}
          </span>
        </span>
      );
    } else if (now > endTime) {
      return (
        <span className="text-lg font-bold opacity-70">
          Next stage starting soon
        </span>
      );
    } else {
      return (
        <span className="text-lg font-bold opacity-70">
          {stageName} phase Ends
          <span className="text-[#49ED4A]">
            {timeLeft[banner.id] ? ` in ${timeLeft[banner.id]}` : ' soon'}
          </span>
        </span>
      );
    }
  };

  const renderMedia = (banner: BannerWithLaunchpad) => {
    const mediaUrl = ipfsToHttp(banner.banner_image) || '/images/Odds-Garden.png';

    if (banner.banner_type == 'V') {
      return (
        <video
          className="h-full w-full object-cover transition-all duration-300 ease-in-out hover:scale-[102%]"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={mediaUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <Image
        fill
        style={{ objectFit: 'cover' }}
        src={mediaUrl}
        alt=""
        className="transition-all duration-300 ease-in-out hover:scale-[102%]"
      />
    );
  };

  const renderActionButton = (banner: BannerWithLaunchpad) => {
    const minter = getMinter(banner);

    // Check if this banner has launchpad data from database
    if (banner.launchpad && minter) {
      const now = new Date().getTime();
      const tradingStart =
        new Date(banner.launchpad.startTradingTime).getTime();
      const isTradingStarted = now >= tradingStart;

      if (isTradingStarted) {
        return (
          <Link href={getTradingUrl(banner)} target="_blank">
            <Button className="h-12 rounded-[10px] bg-white px-5 font-bold text-black hover:bg-white shadow-sm text-lg font-mono">
              View Collection
            </Button>
          </Link>
        );
      } else {
        return (
          <div className="flex items-center gap-4">
            <Link href={getLaunchpadUrl(banner)} target="_blank">
              <Button className="h-12 rounded-[10px] bg-white px-5 font-bold text-black hover:bg-white shadow-sm text-lg font-mono">
                Go to Launchpad
              </Button>
            </Link>
            <div className="flex items-center gap-2 opacity-70">
              <span>{banner?.launchpad.minter?.mintedTokens} Minted</span>
            </div>
          </div>
        );
      }
    }

    // Handle banners with mintedDate countdown
    if (banner.banner_minted_date) {
      const now = new Date().getTime();
      const mintedDate = new Date(banner.banner_minted_date).getTime();

      if (now < mintedDate) {
        // Show countdown for mint date
        return (
          <div className="my-2">
            <span className="text-lg font-bold opacity-70">
              Mint starts
              <span className="text-[#49ED4A]">
                {timeLeft[`mint_${banner.id}`]
                  ? ` in ${timeLeft[`mint_${banner.id}`]}`
                  : ' soon'}
              </span>
            </span>
          </div>
        );
      }
    }

    // Handle banners with mintedLink (external or internal)
    if (banner.banner_minted_link) {
      return (
        <Link href={banner.banner_minted_link} target="_blank">
          <Button className="h-10 rounded-[10px] bg-white px-8 font-black text-black hover:bg-white md:h-12 md:text-lg">
            Go to Launchpad
          </Button>
        </Link>
      );
    }

    // Handle banners with collectionAddress - redirect to /l/[address]
    if (banner.banner_collection_address) {
      return (
        <Link href={`/l/${banner.banner_collection_address}`}>
          <Button className="h-10 rounded-[10px] bg-white px-8 font-black text-black hover:bg-white md:h-12 md:text-lg">
            Go to Launchpad
          </Button>
        </Link>
      );
    }

    // Fallback - Mint Soon (no action)
    return (
      <Button className="h-10 rounded-[10px] bg-white px-8 font-black text-black hover:bg-white md:h-12 md:text-lg">
        Mint Soon
      </Button>
    );
  };

  return (
    <div className="border-x border-t border-[#2F3336]">
      <div className="relative h-[300px]">
        <div className="h-1/2 w-full bg-[url('/images/blur.gif')] bg-cover bg-center opacity-50"></div>
        <div className="pointer-events-none absolute inset-0 bg-black/10 backdrop-blur-xl"></div>
        <div className="pointer-events-none z-1 absolute bottom-0 left-0 hidden h-[100px] w-full md:!block" />
        <div className="absolute left-0 right-0 top-0">
          <Carousel
            setApi={handleApi}
            opts={OPTIONS as any}
            plugins={[plugin.current] as any}
            className="h-full w-full"
          >
            <CarouselContent className="ml-0 h-full w-full">
              {items?.map((banner, index) => (
                <CarouselItem
                  key={banner.id}
                  className='pl-0'
                >
                  <div className="relative h-[300px]">
                    <div className="h-full w-full">
                      <div className="relative h-full w-full overflow-hidden">
                        {renderMedia(banner)}
                        <div className="z-5 via-black-75 pb-6 absolute bottom-0 left-0 top-0 flex w-full flex-col justify-end bg-black/10 p-6 pb-4 pl-8 md:bg-transparent md:bg-gradient-to-b md:from-transparent md:to-black/75 md:p-10 md:pl-16">
                          <div className="flex items-end gap-2">
                            <Link
                              hidden={!banner.banner_twiter}
                              href={banner.banner_twiter ?? '#'}
                              target="_blank"
                            >
                              <img
                                src="/images/x.png"
                                className="h-[20px] md:h-[35px]"
                              />
                            </Link>
                            <Link
                              hidden={!banner.banner_discord}
                              href={banner.banner_discord ?? ''}
                              target="_blank"
                            >
                              <img
                                src="/images/discord.png"
                                className="h-[20px] md:h-[35px]"
                              />
                            </Link>
                            <Link
                              hidden={!banner.banner_telegram}
                              href={banner.banner_telegram ?? ''}
                              target="_blank"
                            >
                              <img
                                src="/images/Telegram.png"
                                className="h-[20px] md:h-[35px]"
                              />
                            </Link>
                          </div>
                          <div className="grid items-end justify-between gap-y-2 md:flex">
                            <div>
                              <div>
                                <div className="mt-4 flex items-center gap-3">
                                  <h1 className="text-[34.875px] font-bold text-white font-mono leading-[40px]">
                                    {banner?.banner_title}
                                  </h1>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-normal text-white font-mono">
                                    by {banner?.banner_creator} on{' '}
                                    {banner?.banner_network}
                                  </span>
                                </div>
                              </div>

                              {/* Show stage info if banner has launchpad */}
                              {banner?.launchpad && getMinter(banner) && (
                                <div className="my-2">
                                  {showCurrentStage(banner)}
                                </div>
                              )}

                              <div className="mt-2">
                                {renderActionButton(banner)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <div className="relative hidden h-full w-full md:!flex">
            <div className="absolute bottom-10 right-12">
              <div className="flex items-end gap-4">
                {items?.map((bannerItem, bannerIndex) => (
                  <div key={bannerIndex}>
                    {bannerItem.banner_id == selectedBanner ? (
                      <button
                        type="button"
                        className="relative h-[120px] w-[120px] rounded-[5px] p-1 transition-all duration-300"
                      >
                        <svg
                          className="absolute pointer-events-none"
                          style={{ left: '0.5px', top: '0px' }}
                          width="120"
                          height="120"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <defs>
                            <style>
                              {`
                                @keyframes borderProgress-${animationKey} {
                                  from {
                                    stroke-dashoffset: 462;
                                  }
                                  to {
                                    stroke-dashoffset: 0;
                                  }
                                }
                              `}
                            </style>
                          </defs>
                          <rect
                            width="118"
                            height="118"
                            x="1"
                            y="1"
                            strokeWidth="2"
                            rx="5"
                            ry="5"
                            fill="none"
                            stroke="white"
                            strokeDasharray="462"
                            style={{
                              strokeDashoffset: 462,
                              animation: `borderProgress-${animationKey} 5s linear forwards`
                            }}
                          />
                        </svg>
                        <div className="relative h-full w-full overflow-hidden rounded">
                          <img
                            alt="banner preview"
                            decoding="async"
                            data-nimg="fill"
                            className="absolute h-full w-full object-cover"
                            src={
                              ipfsToHttp(bannerItem.banner_thumbnail) ||
                              ipfsToHttp(bannerItem.banner_image) || ""
                            }
                            style={{ inset: '0px', color: 'transparent' }}
                          ></img>
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleBannerClick(bannerItem, bannerIndex)
                        }
                        className="relative h-16 w-16 rounded-[5px] opacity-60 transition-all duration-300 hover:opacity-100"
                      >
                        <img
                          alt="banner preview"
                          decoding="async"
                          data-nimg="fill"
                          className="absolute h-full w-full rounded-[5px] object-cover"
                          src={
                            ipfsToHttp(bannerItem.banner_thumbnail) ||
                            ipfsToHttp(bannerItem.banner_image) || ""
                          }
                          style={{ inset: '0px', color: 'transparent' }}
                        ></img>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="relative flex items-center justify-center py-4 pb-6 md:!hidden">
            <div className="flex items-center justify-center gap-4">
              {items?.map((bannerItem, bannerIndex) => (
                <div key={bannerIndex} className="flex items-center">
                  {bannerItem.banner_id == selectedBanner ? (
                    <button
                      type="button"
                      className="relative h-1 w-12 overflow-hidden rounded-full bg-white/20 transition-all duration-300"
                    >
                      {/* Garis horizontal sebagai indikator animasi */}
                      <div
                        className="animate-horizontal-fill absolute left-0 top-0 h-full bg-white"
                        style={{ animationDuration: '5s' }}
                      ></div>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBannerClick(bannerItem, bannerIndex)}
                      className="h-1 w-12 rounded-full bg-white/40 opacity-60 transition-all duration-300 hover:opacity-100"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;