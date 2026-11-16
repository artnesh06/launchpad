# Changelog - Cover Image di NFT Trending Table

## Update: Menampilkan Cover Image dari Metadata

### Perubahan

NFT Trending Table sekarang menampilkan **cover image** yang di-upload saat create launchpad, bukan hanya avatar huruf pertama.

### Detail Implementasi

#### 1. Interface Updates

**NFTCollection Interface:**
```typescript
interface NFTCollection {
  // ... existing fields
  image?: string;  // NEW: Cover image URL
  // ... other fields
}
```

**LaunchpadData Interface:**
```typescript
interface LaunchpadData {
  // ... existing fields
  metadata?: {
    image?: string;
    coverImage?: string;  // NEW: Support coverImage field
  };
  // ... other fields
}
```

#### 2. Mapping Function Update

```typescript
function mapLaunchpadToCollection(launchpad: LaunchpadData, index: number) {
  // Get cover image from metadata
  const coverImage = launchpad.metadata?.image || launchpad.metadata?.coverImage;
  
  return {
    // ... other fields
    image: coverImage,  // Add image to collection data
    // ... other fields
  };
}
```

#### 3. Avatar Component Update

**Sebelum:**
```tsx
<Avatar className="w-14 h-14 bg-[#2D253E] rounded-[5px]">
  <AvatarFallback className="bg-[#2D253E] text-2xl rounded-[5px]">
    {collection.avatar}
  </AvatarFallback>
</Avatar>
```

**Sesudah:**
```tsx
<Avatar className="w-14 h-14 bg-[#2D253E] rounded-[5px]">
  {collection.image ? (
    <AvatarImage 
      src={collection.image} 
      alt={collection.name}
      className="object-cover rounded-[5px]"
    />
  ) : null}
  <AvatarFallback className="bg-[#2D253E] text-2xl rounded-[5px]">
    {collection.avatar}
  </AvatarFallback>
</Avatar>
```

### Behavior

1. **Jika ada cover image**: Menampilkan image dari `metadata.image` atau `metadata.coverImage`
2. **Jika tidak ada image**: Fallback ke avatar huruf pertama (behavior lama)
3. **Image styling**: 
   - Size: 56px × 56px (w-14 h-14)
   - Border radius: 5px
   - Object fit: cover (untuk maintain aspect ratio)

### Source Priority

Image diambil dengan prioritas:
1. `metadata.image` (primary)
2. `metadata.coverImage` (fallback)
3. Avatar huruf pertama (jika tidak ada image)

### Files Changed

- `src/components/nft-trending-table.tsx`
  - Added `image` field to `NFTCollection` interface
  - Added `coverImage` to `LaunchpadData.metadata` interface
  - Updated `mapLaunchpadToCollection` to extract cover image
  - Updated Avatar component to display image with fallback
  - Added `AvatarImage` import from shadcn/ui
  - Added `Image` import from next/image

### Testing

- [ ] Upload launchpad dengan cover image → Image muncul di table
- [ ] Upload launchpad tanpa cover image → Avatar huruf muncul
- [ ] Image aspect ratio maintained dengan object-cover
- [ ] Image loading dengan proper fallback
- [ ] Responsive di berbagai ukuran layar

### Benefits

✅ Visual lebih menarik dengan real images
✅ Konsisten dengan data yang di-upload user
✅ Fallback graceful jika image tidak ada
✅ Performance optimized dengan Next.js Image
✅ Maintain existing functionality
