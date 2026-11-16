# WebSocket Configuration

## Overview
Aplikasi ini menggunakan WebSocket untuk real-time updates dari blockchain events seperti mint, collection updates, dan phase changes.

## Production Setup

WebSocket server sudah dikonfigurasi untuk connect ke:
```
https://odds-launchpad-listener-service-production.up.railway.app
```

## Configuration Files

### 1. Environment Variables (`.env`)
```env
NEXT_PUBLIC_WEBSOCKET_URL="https://odds-launchpad-listener-service-production.up.railway.app"
```

### 2. WebSocket Config (`src/config/websocket.ts`)
File ini berisi konfigurasi default dan fallback URL jika environment variable tidak diset.

## How It Works

### 1. WebSocket Provider
`WebSocketProvider` di `src/providers/websocket-provider.tsx` mengelola koneksi WebSocket global:
- Auto-connect saat aplikasi dimuat
- Auto-reconnect jika koneksi terputus
- Fallback polling mode jika WebSocket gagal berkali-kali
- Room management untuk subscribe ke events tertentu

### 2. Custom Hooks

#### `useHomepageSocket`
Digunakan di homepage untuk real-time updates:
- Latest mints across all collections
- New collection launches
- Trending collections updates

```typescript
const { latestMint, latestCollection, isConnected } = useHomepageSocket({
  chainFilter: 'all', // atau chainId spesifik
  enabled: true
});
```

#### `useLaunchpadSocket`
Digunakan di detail page untuk collection-specific updates:
- Real-time mint progress
- Recent mints dengan minter address
- Phase updates dan progress
- Total minted count

```typescript
const { totalMinted, recentMints, isConnected } = useLaunchpadSocket({
  contractAddress: '0x...',
  enabled: true
});
```

## WebSocket Events

### Server → Client Events
- `mint` - New NFT minted
- `collection:update` - Collection stats updated
- `collection:new` - New collection created
- `phase:update` - Mint phase changed

### Client → Server Events
- `join` - Join a room (homepage, launchpad, wallet)
- `leave` - Leave a room
- `ping` - Keep-alive ping

## Room Structure

### Homepage Room
```typescript
// All chains
websocketConfig.rooms.homepage() // 'homepage:all'

// Specific chain
websocketConfig.rooms.homepage(6343) // 'homepage:chain:6343'
```

### Launchpad Room
```typescript
websocketConfig.rooms.launchpad('0xABC...') // 'launchpad:0xabc...'
```

### Wallet Room
```typescript
websocketConfig.rooms.wallet('0x123...') // 'wallet:0x123...'
```

## Connection Status

WebSocket connection status ditampilkan via `WebSocketStatusToast` component yang otomatis muncul saat:
- Connecting
- Connected
- Disconnected
- Reconnecting
- Fallback mode (jika WebSocket gagal)

## Development

Untuk development lokal, update `.env`:
```env
NEXT_PUBLIC_WEBSOCKET_URL="http://localhost:3001"
```

Dan jalankan listener service secara lokal.

## Troubleshooting

### WebSocket tidak connect
1. Cek console browser untuk error messages
2. Pastikan URL WebSocket benar di `.env`
3. Cek network tab untuk WebSocket connection
4. Pastikan listener service berjalan
5. **IMPORTANT:** Pastikan Socket.IO server di-attach ke HTTP server yang sama (bukan port terpisah)

**Common Issue:** Jika server WebSocket berjalan di port terpisah (misal 3001) tapi Railway hanya expose port default, WebSocket tidak akan accessible. Solusi: attach Socket.IO ke HTTP server yang sama.

### Events tidak diterima
1. Cek apakah sudah join room yang benar
2. Lihat console log untuk event subscriptions
3. Pastikan contractAddress lowercase saat join room

### Fallback Polling Mode
Jika WebSocket gagal connect setelah 3 kali percobaan, aplikasi akan switch ke fallback polling mode. User akan melihat notifikasi dan data akan di-refresh via API polling.

**Indicators:**
- Console log: `[WebSocket] Switching to fallback polling mode`
- Toast notification: "Real-time updates temporarily unavailable. Using fallback mode."
- Data masih update, tapi dengan sedikit delay

**To Fix:**
- Pastikan server listener serve Socket.IO di port yang sama dengan HTTP
- Atau deploy WebSocket server sebagai service terpisah dengan URL sendiri
- Lihat `WEBSOCKET_TROUBLESHOOTING.md` untuk detail lengkap

## Security Notes

- WebSocket URL menggunakan HTTPS (wss://) di production
- Tidak ada authentication token di WebSocket (public events)
- Rate limiting diterapkan di server side
- Room isolation mencegah data leak antar users
