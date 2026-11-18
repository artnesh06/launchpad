import { Skeleton } from '@/components/ui/skeleton';

export function BannerSkeleton() {
  return (
    <div className="border-x border-t border-[#2F3336]">
      <div className="relative h-[300px]">
        <div className="h-1/2 w-full bg-gradient-to-b from-[#1a1033] to-black opacity-50"></div>
        <div className="pointer-events-none absolute inset-0 bg-black/10 backdrop-blur-xl"></div>
        <div className="absolute left-0 right-0 top-0 h-full">
          <div className="relative h-[300px]">
            <div className="h-full w-full">
              <div className="relative h-full w-full overflow-hidden bg-[#1E1F22]">
                <Skeleton className="h-full w-full bg-[#2D253E]" />
                <div className="z-5 via-black-75 pb-6 absolute bottom-0 left-0 top-0 flex w-full flex-col justify-end bg-black/10 p-6 pb-4 pl-8 md:bg-transparent md:bg-gradient-to-b md:from-transparent md:to-black/75 md:p-10 md:pl-16">
                  <div className="flex items-end gap-2 mb-4">
                    <Skeleton className="h-[20px] w-[20px] md:h-[35px] md:w-[35px] rounded bg-[#2D253E]" />
                    <Skeleton className="h-[20px] w-[20px] md:h-[35px] md:w-[35px] rounded bg-[#2D253E]" />
                    <Skeleton className="h-[20px] w-[20px] md:h-[35px] md:w-[35px] rounded bg-[#2D253E]" />
                  </div>
                  <div className="grid items-end justify-between gap-y-2 md:flex">
                    <div>
                      <div>
                        <div className="mt-4 flex items-center gap-3">
                          <Skeleton className="h-10 w-64 bg-[#2D253E]" />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Skeleton className="h-4 w-48 bg-[#2D253E]" />
                        </div>
                      </div>
                      <div className="my-2">
                        <Skeleton className="h-5 w-40 bg-[#2D253E]" />
                      </div>
                      <div className="mt-2">
                        <Skeleton className="h-12 w-40 rounded-[10px] bg-[#2D253E]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Desktop thumbnails */}
          <div className="relative hidden md:!flex">
            <div className="absolute bottom-10 right-12">
              <div className="flex items-end gap-4">
                <Skeleton className="h-[120px] w-[120px] rounded-[5px] bg-[#3D3550]" />
                <Skeleton className="h-16 w-16 rounded-[5px] bg-[#3D3550]" />
                <Skeleton className="h-16 w-16 rounded-[5px] bg-[#3D3550]" />
              </div>
            </div>
          </div>
          {/* Mobile indicators */}
          <div className="relative flex items-center justify-center py-4 pb-6 md:!hidden">
            <div className="flex items-center justify-center gap-4">
              <Skeleton className="h-1 w-12 rounded-full bg-[#2D253E]" />
              <Skeleton className="h-1 w-12 rounded-full bg-[#2D253E]" />
              <Skeleton className="h-1 w-12 rounded-full bg-[#2D253E]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
