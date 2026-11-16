'use client';

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { getCollectionPath } from '@/constants/collection-slugs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ipfsToHttp } from '@/lib/ipfs-utils';
import { getChainName } from '@/config/chains';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons';
interface Collection {
  id: string;
  name: string;
  contractAddress: string;
  chainId: number;
  totalMaxSupply: number;
  mintedCount: number;
  metadata?: {
    image?: string;
    coverImage?: string;
  };
}

interface SearchModalContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const SearchModalContext = createContext<SearchModalContextType | undefined>(undefined);

export function useSearchModal() {
  const context = useContext(SearchModalContext);
  if (!context) {
    throw new Error('useSearchModal must be used within SearchModal');
  }
  return context;
}

interface SearchModalProps {
  children: React.ReactNode;
}

export function SearchModal({ children }: SearchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setDebouncedSearchQuery('');
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  // Fetch collections
  const fetchCollections = useCallback(async (searchText: string, pageNum: number) => {
    try {
      setLoading(true);
      // Show 4 items only on initial load (no search), 10 items when searching
      const limit = searchText ? 10 : 4;
      const skip = (pageNum - 1) * limit;
      
      const url = searchText
        ? `/api/admin/launchpads?search=${encodeURIComponent(searchText)}&limit=${limit}&skip=${skip}`
        : `/api/admin/launchpads?limit=${limit}&skip=${skip}&sortBy=createdAt&sortOrder=desc`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success && result.data.items) {
        const newCollections = result.data.items;
        
        if (pageNum === 1) {
          setCollections(newCollections);
        } else {
          setCollections(prev => [...prev, ...newCollections]);
        }
        
        setHasMore(newCollections.length === limit);
      } else {
        if (pageNum === 1) {
          setCollections([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      if (pageNum === 1) {
        setCollections([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and search (using debounced query)
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setCollections([]); // Reset collections when search changes
      fetchCollections(debouncedSearchQuery, 1);
    }
  }, [debouncedSearchQuery, isOpen, fetchCollections]);

  // Lazy loading with Intersection Observer - only active when searching
  useEffect(() => {
    // Only enable lazy loading when user is searching (using debounced query)
    if (!isOpen || loading || !hasMore || !debouncedSearchQuery) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchCollections(debouncedSearchQuery, nextPage);
        }
      },
      { threshold: 0.1 }
    );

    if (lastItemRef.current) {
      observerRef.current.observe(lastItemRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isOpen, loading, hasMore, page, debouncedSearchQuery, fetchCollections]);

  const handleCollectionClick = (contractAddress: string) => {
    router.push(getCollectionPath(contractAddress));
    close();
  };

  const contextValue: SearchModalContextType = {
    isOpen,
    toggle,
    open,
    close,
  };

  return (
    <SearchModalContext.Provider value={contextValue}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[600px] p-0 bg-[#0D0E11] border-[#2F3336] gap-0 [&>button]:hidden">
          {/* Search Input */}
          <div className="relative border-b border-[#2F3336]">
            <HugeiconsIcon icon={Search01Icon} size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#99A1AF]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, symbol, or contract address..."
              className="w-full bg-transparent border-none text-white placeholder:text-[#99A1AF] pl-12 pr-12 py-6 text-base font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
            {searchQuery !== debouncedSearchQuery && (
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[#B392F0] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <button
              onClick={close}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#99A1AF] hover:text-white transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={20} />
            </button>
          </div>

          {/* Results */}
          <div ref={scrollRef} className="max-h-[500px] overflow-y-auto scrollbar-thin">
            {collections.length === 0 && !loading ? (
              <div className="px-4 py-6 text-center">
                <div className="text-[#99A1AF] text-sm font-mono">
                  {debouncedSearchQuery ? (
                    <>
                      <div className="text-4xl mb-3">🔍</div>
                      <div>No collections found for "{debouncedSearchQuery}"</div>
                      <div className="text-xs mt-2 text-[#6A7282]">Try searching with different keywords</div>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">🎨</div>
                      <div>No collections available</div>
                      <div className="text-xs mt-2 text-[#6A7282]">Check back later for new collections</div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-4 py-3">
                <div className="text-[#B392F0] text-xs font-semibold uppercase tracking-wider mb-3 font-mono">
                  COLLECTIONS
                </div>
                <div className="space-y-0">
                  {collections.map((collection, index) => {
                    const chainName = getChainName(collection.chainId);
                    const avatar = collection.name?.charAt(0)?.toUpperCase() || '?';
                    const coverImageRaw = collection.metadata?.image || collection.metadata?.coverImage;
                    const coverImage = coverImageRaw ? ipfsToHttp(coverImageRaw) : undefined;
                    const isLastItem = index === collections.length - 1;

                    return (
                      <div
                        key={collection.id}
                        ref={isLastItem ? lastItemRef : null}
                        onClick={() => handleCollectionClick(collection.contractAddress)}
                        className="flex items-center gap-3 p-3 rounded-[5px] hover:bg-[#1E192B] cursor-pointer transition-all duration-200 group"
                      >
                        <Avatar className="w-14 h-14 bg-[#2D253E] rounded-[5px] flex-shrink-0">
                          {coverImage ? (
                            <AvatarImage
                              src={coverImage}
                              alt={collection.name}
                              className="object-cover rounded-[5px]"
                            />
                          ) : null}
                          <AvatarFallback className="bg-[#2D253E] text-xl rounded-[5px]">
                            {avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-base font-mono truncate group-hover:text-[#B392F0] transition-colors">
                            {collection.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[#6A7282] text-xs font-mono">
                              {collection.mintedCount.toLocaleString()}/{collection.totalMaxSupply.toLocaleString()} Minted
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Badge className="bg-[#2D253E] text-white border-none group-hover:bg-[#3D354E] font-mono text-xs px-3 py-1">
                            {chainName}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {loading && (
                    <div className="text-center py-6 text-[#99A1AF] text-sm font-mono">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#B392F0] border-t-transparent rounded-full animate-spin"></div>
                        Loading more...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SearchModalContext.Provider>
  );
}
