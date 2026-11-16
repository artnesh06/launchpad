# Blockchain Event Listener Architecture

Struktur ini mengorganisir kode event listener menjadi beberapa modul yang lebih mudah di-maintain.

## Struktur File

```
src/lib/blockchain/
├── activity-listener.ts      # Main ActivityListener class
├── event-types.ts            # TypeScript interfaces untuk semua event
├── event-config.ts           # Konfigurasi default untuk events
├── validation-utils.ts       # Utility functions untuk validasi
├── event-handlers/           # Event handler classes
│   ├── index.ts             # Export semua handlers
│   ├── base-handler.ts      # Base class dengan shared functionality
│   ├── user-events.ts       # Phase 1: User-facing event handlers
│   └── admin-events.ts      # Phase 2: Administrative event handlers
├── index.ts                  # Central export point
└── README.md                 # Dokumentasi ini
```

## File Descriptions

### `activity-listener.ts`
File utama yang berisi class `ActivityListener`. Class ini:
- Mengelola koneksi ke blockchain provider
- Mendaftarkan event listeners untuk semua contract events
- Mengkoordinasikan pemrosesan events
- Menggunakan event handler classes untuk memproses events

**Ukuran**: ~1500 baris (dikurangi ~1200 baris dengan memisahkan handlers)

### `event-types.ts`
Berisi semua TypeScript interface definitions untuk:
- Configuration types (`EventConfig`, `ActivityListenerConfig`)
- Error handling types (`ErrorCounter`, `ErrorLogData`, `ErrorSeverity`)
- Event interfaces untuk semua 24+ contract events, diorganisir berdasarkan phase:
  - **Phase 1**: User-facing events (Burned, Airdropped, PhaseAdded, dll)
  - **Phase 2**: Administrative events (TreasuryUpdated, Withdrawn, dll)
  - **Phase 3**: Metadata events (BaseURIUpdated, ContractURIUpdated, dll)
  - **Phase 4**: Security events (Paused, Unpause, RoleGranted, dll)

**Ukuran**: ~250 baris

### `event-config.ts`
Berisi `DEFAULT_EVENT_CONFIG` array yang mendefinisikan:
- Event mana yang enabled by default
- Priority level untuk setiap event (high/medium/low)
- Phase grouping untuk setiap event

**Ukuran**: ~40 baris

### `validation-utils.ts`
Berisi utility functions untuk:
- `validateEventData()` - Validasi event data sebelum processing
- `isValidTxHash()` - Validasi transaction hash format
- `isValidAddress()` - Validasi Ethereum address format
- `isDuplicateActivity()` - Check untuk duplicate events
- `incrementErrorCounter()` - Track error counts
- `sendAdminAlert()` - Kirim alerts untuk critical errors
- `logEventError()` - Log errors dengan full context

**Ukuran**: ~230 baris

### `event-handlers/` - Event Handler Classes

Folder ini berisi modular event handler classes yang memproses contract events:

#### `base-handler.ts` (~150 baris)
Base class untuk semua event handlers dengan shared functionality:
- `validateEventData()` - Validasi event data
- `isDuplicateActivity()` - Check duplicates
- `logEventError()` - Error logging
- `fetchLaunchpad()` - Fetch launchpad dari database
- `truncateAddress()` - Format address untuk display
- `writeActivityWithRetry()` - Write ke database dengan retry logic
- `formatWeiToEth()` - Convert wei ke ETH

#### `user-events.ts` (~400 baris)
Handler untuk Phase 1 user-facing events:
- `handleBurnedEvent()` - Process NFT burns
- `handleAirdroppedEvent()` - Process airdrops
- `handlePhaseAddedEvent()` - Process new mint phases
- `handlePhaseUpdatedEvent()` - Process phase updates
- `handleRevealedEvent()` - Process collection reveals

#### `admin-events.ts` (~350 baris)
Handler untuk Phase 2 administrative events:
- `handleTreasuryUpdatedEvent()` - Process treasury changes
- `handleWithdrawnEvent()` - Process withdrawals
- `handleOwnershipTransferredEvent()` - Process ownership transfers
- `handlePlatformFeeToggledEvent()` - Process fee toggles
- `handlePlatformFlatFeeUpdatedEvent()` - Process fee updates
- `handleRoyaltyUpdatedEvent()` - Process royalty updates

### `index.ts` - Central Export Point

**Ukuran**: ~70 baris

Menyediakan single import point untuk semua exports dari modul blockchain.

## Penggunaan

### Import Types
```typescript
import { 
  EventConfig, 
  ActivityListenerConfig,
  BurnedEvent,
  AirdroppedEvent 
} from './event-types';
```

### Import Configuration
```typescript
import { DEFAULT_EVENT_CONFIG } from './event-config';
```

### Import Validation Utils
```typescript
import { 
  validateEventData, 
  isValidTxHash,
  isDuplicateActivity 
} from './validation-utils';
```

### Import Event Handlers
```typescript
import { 
  UserEventHandler,
  AdminEventHandler,
  BaseEventHandler 
} from './event-handlers';

// Atau dari index
import { UserEventHandler, AdminEventHandler } from '@/lib/blockchain';
```

### Menggunakan ActivityListener
```typescript
import { ActivityListener } from './activity-listener';

const listener = new ActivityListener({
  chainId: 1,
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
  factoryAddress: '0x...',
  enabledEvents: ['Burned', 'Airdropped', 'PhaseAdded'],
  errorThreshold: 10,
  retryAttempts: 3
});

await listener.start();
```

## ✅ Refactoring Selesai!

Event handlers telah berhasil dipecah menjadi modul-modul terpisah:

### ✨ Yang Sudah Dilakukan:

1. **Base Handler Class** - Shared functionality untuk semua handlers
2. **User Events Handler** - Phase 1 events (Burned, Airdropped, Phase, Revealed)
3. **Admin Events Handler** - Phase 2 events (Treasury, Withdrawn, Ownership, Fees, Royalty)

### 📊 Pengurangan Ukuran:

| File | Sebelum | Sesudah | Pengurangan |
|------|---------|---------|-------------|
| activity-listener.ts | ~2700 baris | ~1500 baris | ~1200 baris |
| base-handler.ts | - | 150 baris | (baru) |
| user-events.ts | - | 400 baris | (baru) |
| admin-events.ts | - | 350 baris | (baru) |

### 🚀 Rencana Selanjutnya (Opsional):

Jika ingin refactoring lebih lanjut:

#### Opsi 1: Pisahkan Event Listeners
```
event-listeners/
├── index.ts                 # Export semua listeners
├── user-event-listeners.ts  # Listen methods untuk user events
├── admin-event-listeners.ts # Listen methods untuk admin events
└── ...
```

**Estimasi**: Akan mengurangi ~600 baris dari activity-listener.ts

#### Opsi 2: Tambahkan Metadata & Security Handlers
```
event-handlers/
├── metadata-events.ts       # BaseURI, ContractURI handlers
└── security-events.ts       # Paused, TransferLock, Role handlers
```

**Estimasi**: Siap untuk Phase 3 & 4 implementation

## Keuntungan Struktur Baru

✅ **Separation of Concerns**: Types, config, utils, dan handlers terpisah  
✅ **Modular Handlers**: Setiap kategori event punya handler sendiri  
✅ **Easier Testing**: Setiap handler bisa di-test secara independen  
✅ **Better Maintainability**: Lebih mudah menemukan dan mengubah kode  
✅ **Reduced File Size**: File lebih kecil (~1500 baris vs ~2700 baris)  
✅ **Type Safety**: Semua types terpusat di satu tempat  
✅ **Reusability**: Base handler menyediakan shared functionality  
✅ **Scalability**: Mudah menambah handler baru untuk Phase 3 & 4  

## Migration Notes

Struktur baru ini **backward compatible** dengan kode yang ada. Tidak ada breaking changes untuk:
- Existing imports dari `activity-listener.ts`
- Existing tests
- Existing API endpoints yang menggunakan ActivityListener

Untuk menggunakan struktur baru, cukup update imports di file yang relevan.
