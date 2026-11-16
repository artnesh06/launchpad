# Security Update: IPFS API Keys Protection

## 🔒 Masalah yang Diperbaiki

Sebelumnya, API keys Pinata disimpan dengan prefix `NEXT_PUBLIC_` yang membuat keys tersebut **terekspos di browser** dan bisa dilihat oleh siapa saja melalui:
- Browser DevTools → Network tab
- View Page Source
- JavaScript console

## ✅ Solusi

API keys sekarang disimpan di **server-side only** dan upload IPFS dilakukan melalui API endpoints yang aman.

## 📝 Cara Update

### 1. Update file `.env`

**Hapus:**
```env
NEXT_PUBLIC_PINATA_API_KEY=xxx
NEXT_PUBLIC_PINATA_SECRET_KEY=xxx
```

**Ganti dengan:**
```env
PINATA_API_KEY=xxx
PINATA_SECRET_KEY=xxx
```

### 2. Restart server

```bash
npm run dev
```

### 3. Test

Buka create launchpad page dan upload image. API keys tidak akan terlihat di browser.

## 🔍 Verifikasi Keamanan

1. Buka browser DevTools → Network tab
2. Upload file di create launchpad
3. Check request ke `/api/ipfs/upload`
4. ✅ API keys tidak terlihat di request headers atau body

## 📚 Dokumentasi Lengkap

Lihat [SECURE_IPFS_API.md](./SECURE_IPFS_API.md) untuk detail lengkap tentang API endpoints dan penggunaan.

## ⚠️ Penting untuk Production

Saat deploy ke production (Vercel, Railway, dll):
1. Update environment variables di dashboard hosting
2. Gunakan `PINATA_API_KEY` dan `PINATA_SECRET_KEY` (tanpa `NEXT_PUBLIC_`)
3. Jangan commit file `.env` ke git
