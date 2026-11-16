# Add Cursor Pointer to All Buttons

## Overview
Menambahkan `cursor: pointer` pada semua button dan elemen yang bisa diklik untuk meningkatkan UX.

## Changes Made

### 1. Button Component - `src/components/ui/button.tsx`

Menambahkan `cursor-pointer` ke base class button component:

```typescript
const buttonVariants = cva(
  "... cursor-pointer",
  // ...
)
```

**Affected:**
- Semua komponen yang menggunakan `<Button>` dari `@/components/ui/button`
- Semua variant: default, destructive, outline, secondary, ghost, link
- Semua size: default, sm, lg, icon

### 2. Global CSS - `src/app/globals.css`

Menambahkan global CSS rules untuk semua elemen yang bisa diklik:

```css
@layer base {
  /* Make all buttons and clickable elements have pointer cursor */
  button,
  [role="button"],
  [type="button"],
  [type="submit"],
  [type="reset"],
  a,
  label[for],
  select {
    @apply cursor-pointer;
  }
  
  /* Disabled elements should not have pointer cursor */
  button:disabled,
  [role="button"]:disabled,
  [type="button"]:disabled,
  [type="submit"]:disabled,
  [type="reset"]:disabled,
  a:disabled,
  select:disabled {
    @apply cursor-not-allowed;
  }
}
```

**Affected Elements:**
- ✅ `<button>` - Semua button HTML native
- ✅ `[role="button"]` - Elemen dengan role button
- ✅ `[type="button"]` - Input type button
- ✅ `[type="submit"]` - Submit buttons
- ✅ `[type="reset"]` - Reset buttons
- ✅ `<a>` - Semua links
- ✅ `<label[for]>` - Labels yang terhubung dengan input
- ✅ `<select>` - Dropdown selects

**Disabled State:**
- ❌ Disabled elements akan memiliki `cursor: not-allowed` instead

## Benefits

1. **Consistent UX**
   - Semua button dan clickable elements memiliki pointer cursor
   - User langsung tahu elemen mana yang bisa diklik

2. **Better Accessibility**
   - Visual feedback yang jelas
   - Disabled state juga jelas (cursor: not-allowed)

3. **No Manual Work**
   - Tidak perlu menambahkan `cursor-pointer` manual di setiap button
   - Otomatis apply ke semua elemen yang bisa diklik

4. **Future-Proof**
   - Semua button baru otomatis mendapat cursor pointer
   - Tidak perlu ingat untuk menambahkan class

## Examples

### Before
```tsx
// Harus manual tambahkan cursor-pointer
<button className="... cursor-pointer">Click me</button>
<Button className="... cursor-pointer">Click me</Button>
```

### After
```tsx
// Otomatis punya cursor-pointer
<button className="...">Click me</button>
<Button className="...">Click me</Button>
<a href="/page">Link</a>
<label htmlFor="input">Label</label>
```

## Testing

Test di berbagai halaman:
1. ✅ Homepage - Banner buttons, navigation links
2. ✅ Collection page - Mint button, copy button
3. ✅ Create page - Create button, action buttons
4. ✅ Admin page - All management buttons
5. ✅ Forms - Submit buttons, labels, selects

## Files Modified

- `src/components/ui/button.tsx` - Added cursor-pointer to Button component
- `src/app/globals.css` - Added global CSS rules for clickable elements

## Browser Support

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## Notes

- Disabled buttons automatically get `cursor: not-allowed`
- Links (`<a>`) also get pointer cursor
- Labels connected to inputs get pointer cursor
- Select dropdowns get pointer cursor
- Custom elements with `role="button"` get pointer cursor
