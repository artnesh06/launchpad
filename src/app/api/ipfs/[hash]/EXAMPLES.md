# Contoh Penggunaan API IPFS

## 1. Direct Browser Access

Buka di browser:
```
http://localhost:3000/api/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
```

Response:
```json
{
  "success": true,
  "ipfsHash": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "httpUrl": "https://eu.orbitor.dev/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "gateway": "https://eu.orbitor.dev"
}
```

## 2. Dalam React Component

### Cara 1: Menggunakan Hook (Recommended)
```typescript
import { useIpfsToHttp } from '@/hooks/useIpfsToHttp';

function NFTImage({ metadata }) {
  const { httpUrl, loading } = useIpfsToHttp(metadata.image);

  if (loading) return <Skeleton />;
  
  return <img src={httpUrl} alt={metadata.name} />;
}
```

### Cara 2: Menggunakan useEffect
```typescript
function NFTCard({ ipfsHash }) {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    fetch(`/api/ipfs/${ipfsHash}`)
      .then(res => res.json())
      .then(data => setImageUrl(data.httpUrl));
  }, [ipfsHash]);

  return <img src={imageUrl} />;
}
```

### Cara 3: Menggunakan Utility Function
```typescript
import { ipfsToHttpViaApi } from '@/lib/ipfs-utils';

function CollectionCard({ collection }) {
  const [coverUrl, setCoverUrl] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      const url = await ipfsToHttpViaApi(collection.metadata.image);
      setCoverUrl(url);
    };
    loadImage();
  }, [collection]);

  return <img src={coverUrl} />;
}
```

## 3. Dalam API Route (Server-side)

```typescript
// src/app/api/collections/[id]/route.ts
import { ipfsToHttp } from '@/lib/ipfs-utils';

export async function GET(req, { params }) {
  const collection = await db.collection.findUnique({
    where: { id: params.id }
  });

  // Server-side: gunakan konversi lokal
  const imageUrl = ipfsToHttp(collection.metadata.image);

  return NextResponse.json({
    ...collection,
    imageUrl
  });
}
```

## 4. Batch Processing

```typescript
async function loadMultipleImages(ipfsHashes: string[]) {
  const promises = ipfsHashes.map(hash => 
    fetch(`/api/ipfs/${hash}`).then(res => res.json())
  );
  
  const results = await Promise.all(promises);
  return results.map(r => r.httpUrl);
}

// Usage
const hashes = ['QmXxxx...', 'QmYyyy...', 'QmZzzz...'];
const urls = await loadMultipleImages(hashes);
```

## 5. Dengan Error Handling

```typescript
async function safeIpfsToHttp(ipfsUri: string) {
  try {
    const response = await fetch(`/api/ipfs/${encodeURIComponent(ipfsUri)}`);
    
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    const data = await response.json();
    return data.httpUrl;
  } catch (error) {
    console.error('Failed to convert IPFS:', error);
    // Fallback ke gateway langsung
    return `https://eu.orbitor.dev/ipfs/${ipfsUri.replace('ipfs://', '')}`;
  }
}
```

## 6. Dengan React Query

```typescript
import { useQuery } from '@tanstack/react-query';

function useIpfsImage(ipfsHash: string) {
  return useQuery({
    queryKey: ['ipfs', ipfsHash],
    queryFn: async () => {
      const res = await fetch(`/api/ipfs/${ipfsHash}`);
      const data = await res.json();
      return data.httpUrl;
    },
    staleTime: Infinity, // IPFS content is immutable
    enabled: !!ipfsHash,
  });
}

// Usage
function NFTCard({ ipfsHash }) {
  const { data: imageUrl, isLoading } = useIpfsImage(ipfsHash);
  
  if (isLoading) return <Skeleton />;
  return <img src={imageUrl} />;
}
```

## 7. Dalam Next.js Image Component

```typescript
import Image from 'next/image';
import { useIpfsToHttp } from '@/hooks/useIpfsToHttp';

function OptimizedNFTImage({ ipfsUri, alt }) {
  const { httpUrl } = useIpfsToHttp(ipfsUri);

  if (!httpUrl) return null;

  return (
    <Image
      src={httpUrl}
      alt={alt}
      width={500}
      height={500}
      className="rounded-lg"
    />
  );
}
```

## 8. Dengan SWR

```typescript
import useSWR from 'swr';

const ipfsFetcher = async (hash: string) => {
  const res = await fetch(`/api/ipfs/${hash}`);
  const data = await res.json();
  return data.httpUrl;
};

function NFTImage({ ipfsHash }) {
  const { data: imageUrl, error } = useSWR(
    ipfsHash ? `/api/ipfs/${ipfsHash}` : null,
    () => ipfsFetcher(ipfsHash),
    { revalidateOnFocus: false } // IPFS is immutable
  );

  if (error) return <ErrorPlaceholder />;
  if (!imageUrl) return <Skeleton />;
  
  return <img src={imageUrl} />;
}
```

## 9. Preload Images

```typescript
function preloadIpfsImages(ipfsHashes: string[]) {
  ipfsHashes.forEach(hash => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = `/api/ipfs/${hash}`;
    document.head.appendChild(link);
  });
}

// Usage di page
useEffect(() => {
  const hashes = nfts.map(nft => nft.metadata.image);
  preloadIpfsImages(hashes);
}, [nfts]);
```

## 10. Dengan Caching Strategy

```typescript
const ipfsCache = new Map<string, string>();

async function getCachedIpfsUrl(ipfsHash: string): Promise<string> {
  // Check memory cache
  if (ipfsCache.has(ipfsHash)) {
    return ipfsCache.get(ipfsHash)!;
  }

  // Check localStorage
  const cached = localStorage.getItem(`ipfs:${ipfsHash}`);
  if (cached) {
    ipfsCache.set(ipfsHash, cached);
    return cached;
  }

  // Fetch from API
  const res = await fetch(`/api/ipfs/${ipfsHash}`);
  const data = await res.json();
  const url = data.httpUrl;

  // Cache it
  ipfsCache.set(ipfsHash, url);
  localStorage.setItem(`ipfs:${ipfsHash}`, url);

  return url;
}
```

## Tips & Best Practices

1. **Gunakan Hook untuk Client Components** - Lebih clean dan reusable
2. **Cache Aggressively** - IPFS content immutable, aman untuk cache selamanya
3. **Preload Critical Images** - Untuk better UX
4. **Handle Errors Gracefully** - Selalu ada fallback
5. **Batch Requests** - Untuk multiple images, gunakan Promise.all
6. **Use React Query/SWR** - Untuk automatic caching dan revalidation
7. **Server-side: Gunakan Local Conversion** - Lebih cepat, tidak perlu HTTP request
