# Changelog - Collection Detail Page

## Update: Tombol MINT di NFT Trending Table

### Perubahan
Tombol "MINT" di NFT Trending Table sekarang mengarahkan ke halaman detail collection, bukan langsung melakukan minting.

### Alasan
- User experience lebih baik: User bisa melihat detail lengkap collection sebelum mint
- Sesuai dengan desain Figma yang menunjukkan halaman detail terpisah
- User bisa memilih jumlah NFT yang ingin di-mint
- User bisa melihat informasi lengkap seperti contract address, website, countdown, dll

### File yang Diubah

#### `src/components/nft-trending-table.tsx`
**Sebelum:**
```typescript
// Tombol MINT memanggil handleMint yang langsung melakukan minting
<button onClick={(e) => {
  e.stopPropagation();
  onMint(collection.launchpadId);
}}>
  MINT
</button>
```

**Sesudah:**
```typescript
// Tombol MINT mengarahkan ke halaman detail
<button onClick={(e) => {
  e.stopPropagation();
  router.push(`/collection/${collection.contractAddress}`);
}}>
  MINT
</button>
```

**Perubahan Lainnya:**
- Menghapus fungsi `handleMint` yang kompleks (100+ baris)
- Menghapus state `minting`
- Menghapus prop `onMint` dari `CollectionTable`
- Menyederhanakan interface `CollectionTableProps`

### Flow Baru

1. User melihat NFT Trending Table
2. User hover pada row collection → tombol "MINT" muncul
3. User klik tombol "MINT" atau klik pada row
4. User diarahkan ke `/collection/[contractAddress]`
5. User melihat detail lengkap collection
6. User bisa input jumlah NFT yang ingin di-mint
7. User klik tombol "Mint" di halaman detail
8. Proses minting dimulai dengan konfirmasi

### Benefits
✅ Lebih user-friendly
✅ Sesuai dengan desain Figma
✅ Code lebih clean dan maintainable
✅ Separation of concerns (table hanya untuk display, detail page untuk action)
✅ User bisa review sebelum mint
✅ Lebih flexible untuk future features (multiple mint amounts, phase selection, dll)
