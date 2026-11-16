'use client';

export function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D0E11]">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#2F3336]"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#B392F0]"></div>
        </div>
        
        {/* Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-medium text-white font-mono">Loading...</p>
          <p className="text-sm text-[#6A7282] font-mono">Please wait</p>
        </div>
      </div>
    </div>
  );
}
