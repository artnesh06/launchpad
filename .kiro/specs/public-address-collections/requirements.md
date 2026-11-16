# Requirements Document

## Introduction

Fitur ini akan mengubah halaman Creator Studio dari menampilkan semua collection secara global menjadi menampilkan collection per address (wallet address). Setiap user hanya akan melihat collection yang mereka buat sendiri. Selain itu, halaman collection detail akan dibuat public sehingga siapa saja dapat melihat informasi collection tanpa perlu login atau koneksi wallet.

## Glossary

- **Creator Studio**: Halaman dashboard untuk melihat dan mengelola NFT collections (`/create`)
- **Collection**: NFT collection yang dibuat melalui platform launchpad
- **Address**: Wallet address Ethereum yang digunakan untuk membuat collection
- **Public Page**: Halaman yang dapat diakses tanpa autentikasi atau koneksi wallet
- **Wallet Connection**: Koneksi antara browser user dengan wallet Ethereum (MetaMask, WalletConnect, dll)
- **Contract Address**: Address smart contract dari NFT collection yang di-deploy
- **Creator Address**: Address wallet yang membuat/deploy collection

## Requirements

### Requirement 1

**User Story:** Sebagai creator, saya ingin melihat hanya collection yang saya buat sendiri di Creator Studio, sehingga saya dapat fokus mengelola collection saya tanpa terganggu collection orang lain.

#### Acceptance Criteria

1. WHEN user mengakses halaman `/create`, THE System SHALL menampilkan hanya collection yang dibuat oleh address wallet yang terkoneksi
2. WHEN user belum menghubungkan wallet, THE System SHALL menampilkan pesan untuk menghubungkan wallet terlebih dahulu
3. WHEN user mengganti wallet address yang terkoneksi, THE System SHALL memperbarui daftar collection sesuai dengan address baru
4. THE System SHALL menampilkan jumlah total collection yang dimiliki user di statistics section
5. THE System SHALL memfilter data collection berdasarkan field `creator` yang sesuai dengan address wallet terkoneksi

### Requirement 2

**User Story:** Sebagai visitor, saya ingin melihat informasi detail collection tanpa perlu menghubungkan wallet, sehingga saya dapat menjelajahi collection yang tersedia dengan mudah.

#### Acceptance Criteria

1. WHEN visitor mengakses halaman collection detail, THE System SHALL menampilkan informasi collection tanpa memerlukan wallet connection
2. THE System SHALL menampilkan informasi read-only seperti nama, symbol, description, total supply, dan mint phases
3. WHEN visitor mencoba melakukan aksi yang memerlukan wallet (mint, edit), THE System SHALL menampilkan prompt untuk menghubungkan wallet
4. THE System SHALL menyediakan endpoint API public untuk mengambil data collection berdasarkan contract address
5. THE System SHALL menampilkan status mint phases (active, upcoming, ended) tanpa memerlukan autentikasi

### Requirement 3

**User Story:** Sebagai creator, saya ingin tetap dapat mengedit collection saya dari halaman detail, sehingga saya dapat mengelola settings collection dengan mudah.

#### Acceptance Criteria

1. WHEN creator mengakses halaman edit collection (`/create/[address]`), THE System SHALL memverifikasi bahwa wallet terkoneksi adalah creator dari collection tersebut
2. IF wallet terkoneksi bukan creator, THEN THE System SHALL menampilkan halaman read-only tanpa opsi edit
3. WHEN creator terverifikasi, THE System SHALL menampilkan form edit dengan semua field yang dapat diubah
4. THE System SHALL menyimpan perubahan hanya jika wallet terkoneksi adalah creator dari collection
5. THE System SHALL menampilkan pesan error jika user yang bukan creator mencoba menyimpan perubahan

### Requirement 4

**User Story:** Sebagai developer, saya ingin API endpoint yang mendukung filtering per address, sehingga data dapat diambil secara efisien berdasarkan creator address.

#### Acceptance Criteria

1. THE System SHALL menyediakan query parameter `creatorAddress` pada endpoint `/api/admin/launchpads`
2. WHEN `creatorAddress` parameter diberikan, THE System SHALL mengembalikan hanya collection yang dibuat oleh address tersebut
3. THE System SHALL menyediakan endpoint public `/api/collections/[address]` untuk mengambil data collection tanpa autentikasi
4. THE System SHALL mengembalikan data collection dengan format yang konsisten untuk public dan authenticated requests
5. THE System SHALL menangani error dengan proper HTTP status codes (404 untuk collection tidak ditemukan, 403 untuk unauthorized access)
