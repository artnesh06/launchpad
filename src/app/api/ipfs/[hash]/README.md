# IPFS to HTTP Conversion API

API endpoint untuk mengkonversi IPFS hash ke HTTP URL menggunakan Pinata dedicated gateway.

## Gateway
`https://eu.orbitor.dev`

## Endpoint

### GET /api/ipfs/[hash]

Konversi IPFS hash ke HTTP URL dengan clean URL pattern.

**URL Pattern:**
- `/api/ipfs/QmXxxx...` - IPFS hash langsung
- `/api/ipfs/ipfs://QmXxxx...` - IPFS URI dengan protocol

**Contoh Request:**
```bash
# Dengan hash langsung
curl "http://localhost:3000/api/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"

# Dengan ipfs:// protocol (URL encoded)
curl "http://localhost:3000/api/ipfs/ipfs%3A%2F%2FQmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
```

**Response:**
```json
{
  "success": true,
  "ipfsHash": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "httpUrl": "https://eu.orbitor.dev/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "gateway": "https://eu.orbitor.dev"
}
```

## Format Hash yang Didukung

- `QmXxxx...` - Hash IPFS langsung (CIDv0)
- `bafyxxx...` - Hash IPFS CIDv1
- `ipfs://QmXxxx...` - Format URI dengan protocol
- `https://...` - Jika sudah HTTP URL, akan di-redirect

## Error Responses

**400 Bad Request:**
```json
{
  "error": "IPFS hash diperlukan"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Gagal mengkonversi IPFS hash"
}
```

## Penggunaan di Frontend

### Menggunakan React Hook (Recommended)

```typescript
import { useIpfsToHttp } from '@/hooks/useIpfsToHttp';

function MyComponent() {
  const ipfsUri = 'ipfs://QmXxxx...';
  const { httpUrl, loading, error } = useIpfsToHttp(ipfsUri);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading image</div>;

  return <img src={httpUrl} alt="NFT" />;
}
```

### Menggunakan Utility Function

```typescript
import { ipfsToHttpViaApi } from '@/lib/ipfs-utils';

// Async function
const httpUrl = await ipfsToHttpViaApi('ipfs://QmXxxx...');
console.log(httpUrl);
```

### Menggunakan Fetch Langsung

```typescript
// Direct fetch
const hash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
const response = await fetch(`/api/ipfs/${hash}`);
const data = await response.json();
console.log(data.httpUrl);

// Dengan ipfs:// protocol (perlu encode)
const uri = 'ipfs://QmXxxx...';
const response = await fetch(`/api/ipfs/${encodeURIComponent(uri)}`);
const data = await response.json();
console.log(data.httpUrl);
```

## Keuntungan Clean URL Pattern

1. **RESTful Design** - Lebih sesuai dengan prinsip REST API
2. **Cacheable** - Mudah di-cache oleh CDN dan browser
3. **SEO Friendly** - URL lebih clean dan readable
4. **Simple** - Tidak perlu query parameter
5. **Direct Access** - Bisa langsung akses hash tanpa parameter

## Contoh Penggunaan

```typescript
// Example 1: Direct hash
fetch('/api/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')
  .then(res => res.json())
  .then(data => console.log(data.httpUrl));

// Example 2: Dengan ipfs:// protocol
const uri = 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
fetch(`/api/ipfs/${encodeURIComponent(uri)}`)
  .then(res => res.json())
  .then(data => console.log(data.httpUrl));

// Example 3: Dalam React component
function NFTImage({ ipfsHash }) {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    fetch(`/api/ipfs/${ipfsHash}`)
      .then(res => res.json())
      .then(data => setImageUrl(data.httpUrl));
  }, [ipfsHash]);

  return imageUrl ? <img src={imageUrl} /> : <Spinner />;
}
```

## Catatan

- Gateway Pinata dedicated memberikan performa lebih baik dan rate limit yang lebih tinggi
- Jika hash sudah dalam format HTTP, API akan redirect ke URL tersebut
- API ini menggunakan dynamic route `[hash]` untuk clean URL pattern
- Semua hash akan otomatis di-clean dari prefix `ipfs://`
