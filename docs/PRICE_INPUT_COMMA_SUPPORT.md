# Price Input Comma Support

## Overview
Menambahkan dukungan untuk input price dengan format desimal koma (0,5) yang otomatis dikonversi ke format titik (0.5) di Creator Studio.

## Changes Made

### 1. Creator Studio (`src/components/admin/creator-studio.tsx`)
- Menambahkan fungsi helper `normalizePriceInput()` untuk mengkonversi koma ke titik
- Update fungsi `updateWhitelistPhase()` untuk menormalisasi input price pada whitelist phases
- Update handler `onChange` pada public phase price input untuk menggunakan `normalizePriceInput()`

### 2. Simple Collection Creator (`src/components/admin/simple-collection-creator.tsx`)
- Menambahkan fungsi helper `normalizePriceInput()` untuk mengkonversi koma ke titik
- Update fungsi `updateMintPhase()` untuk menormalisasi input price

## How It Works

Ketika user mengetik price dengan koma (contoh: `0,5`), fungsi `normalizePriceInput()` akan:
1. Mendeteksi karakter koma (`,`)
2. Menggantinya dengan titik (`.`)
3. Menyimpan nilai yang sudah dinormalisasi

## Example Usage

**Before:**
- User mengetik: `0,5`
- Error: Invalid format atau tidak bisa diproses

**After:**
- User mengetik: `0,5`
- Otomatis dikonversi ke: `0.5`
- Berhasil diproses sebagai 0.5 ETH

## Affected Components

1. **Whitelist Mint Phase** - Price input field
2. **Public Mint Phase** - Price input field
3. **Simple Collection Creator** - All mint phase price inputs

## Testing

Untuk testing fitur ini:
1. Buka Creator Studio (`/create/add`)
2. Scroll ke bagian Mint Phases
3. Pada field "Mint Price", ketik nilai dengan koma: `0,5`
4. Nilai akan otomatis dikonversi ke `0.5`
5. Submit form dan verifikasi price tersimpan dengan benar

## Notes

- Fungsi ini hanya mengkonversi koma ke titik, tidak melakukan validasi format number
- Validasi format number tetap dilakukan oleh browser (input type) dan contract
- Perubahan ini backward compatible - input dengan titik tetap berfungsi normal
