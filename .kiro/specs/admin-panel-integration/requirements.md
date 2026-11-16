# Requirements Document

## Introduction

Halaman admin pada NFT Launchpad platform saat ini memiliki beberapa fungsi yang menggunakan data mock/placeholder dan tidak terintegrasi dengan database dan API yang sudah tersedia. Spec ini bertujuan untuk memperbaiki dan mengintegrasikan admin panel dengan database Prisma dan API endpoints yang sudah ada, serta menambahkan fungsi-fungsi penting yang masih hilang.

## Glossary

- **Admin Panel**: Interface administratif untuk mengelola platform NFT Launchpad
- **Launchpad**: Smart contract NFT collection yang di-deploy melalui factory contract
- **Factory Contract**: Smart contract yang digunakan untuk membuat launchpad baru
- **Prisma**: ORM (Object-Relational Mapping) untuk database operations
- **Sync**: Proses sinkronisasi data dari blockchain ke database
- **Whitelist**: Daftar alamat wallet yang diizinkan untuk mint pada fase tertentu
- **Phase**: Tahapan minting (whitelist, public, dll) dengan konfigurasi berbeda
- **Activity Feed**: Real-time feed dari aktivitas platform (mints, transfers, dll)
- **Analytics**: Data statistik dan metrik platform

## Requirements

### Requirement 1

**User Story:** As an admin, I want to view real-time dashboard statistics from the database, so that I can monitor platform performance accurately.

#### Acceptance Criteria

1. WHEN the admin visits the dashboard page THEN the system SHALL fetch and display total collections count from the database
2. WHEN the admin visits the dashboard page THEN the system SHALL fetch and display total mints count from the database
3. WHEN the admin visits the dashboard page THEN the system SHALL fetch and display total volume from the database
4. WHEN the admin visits the dashboard page THEN the system SHALL fetch and display active launchpads count from the database
5. WHEN the dashboard data is loading THEN the system SHALL display loading states for each statistic card

### Requirement 2

**User Story:** As an admin, I want to manage launchpads with real database data, so that I can view and control all NFT collections on the platform.

#### Acceptance Criteria

1. WHEN the admin visits the collections page THEN the system SHALL fetch launchpads from the database with pagination
2. WHEN the admin views a launchpad THEN the system SHALL display contract address, creator, chain, status, minted count, total supply, and volume
3. WHEN the admin filters by chain THEN the system SHALL return only launchpads from the selected chain
4. WHEN the admin filters by status THEN the system SHALL return only launchpads with the selected status
5. WHEN the admin searches by name or address THEN the system SHALL return matching launchpads

### Requirement 3

**User Story:** As an admin, I want to sync launchpads from the blockchain, so that the database stays up-to-date with on-chain data.

#### Acceptance Criteria

1. WHEN the admin triggers sync for a specific chain THEN the system SHALL fetch all launchpads from the factory contract
2. WHEN the admin triggers sync THEN the system SHALL update existing launchpads and create new ones in the database
3. WHEN sync is in progress THEN the system SHALL display progress indicators
4. WHEN sync completes THEN the system SHALL display the number of launchpads synced
5. WHEN sync fails THEN the system SHALL display error messages with details

### Requirement 4

**User Story:** As an admin, I want to manage factory contract settings, so that I can control platform fees and configurations.

#### Acceptance Criteria

1. WHEN the admin views factory page THEN the system SHALL fetch factory information from the blockchain
2. WHEN the admin views factory page THEN the system SHALL display contract address, owner, treasury, creation fee, platform fee, and free mint fee
3. WHEN the admin views factory page THEN the system SHALL display total launchpads created
4. WHEN the admin views factory page THEN the system SHALL display template approval status
5. WHEN factory data is loading THEN the system SHALL display loading states

### Requirement 5

**User Story:** As an admin, I want to view real analytics data, so that I can understand platform performance and trends.

#### Acceptance Criteria

1. WHEN the admin visits analytics page THEN the system SHALL fetch analytics data from the database
2. WHEN the admin views analytics THEN the system SHALL display total volume over time
3. WHEN the admin views analytics THEN the system SHALL display mints over time
4. WHEN the admin views analytics THEN the system SHALL display top collections by volume
5. WHEN the admin views analytics THEN the system SHALL display top creators by volume

### Requirement 6

**User Story:** As an admin, I want to manage banners with database integration, so that I can control homepage promotional content.

#### Acceptance Criteria

1. WHEN the admin visits banners page THEN the system SHALL fetch banners from the database
2. WHEN the admin creates a banner THEN the system SHALL save it to the database with title, image URL, link, status, and sequence
3. WHEN the admin updates a banner THEN the system SHALL update the database record
4. WHEN the admin deletes a banner THEN the system SHALL remove it from the database
5. WHEN the admin reorders banners THEN the system SHALL update sequence numbers in the database

### Requirement 7

**User Story:** As an admin, I want to view recent platform activity, so that I can monitor what's happening in real-time.

#### Acceptance Criteria

1. WHEN the admin views the dashboard THEN the system SHALL fetch recent activities from the database
2. WHEN displaying activities THEN the system SHALL show activity type, collection name, user address, and timestamp
3. WHEN displaying activities THEN the system SHALL limit results to the most recent 10 activities
4. WHEN displaying activities THEN the system SHALL format timestamps as relative time
5. WHEN no activities exist THEN the system SHALL display an empty state message

### Requirement 8

**User Story:** As an admin, I want to export platform data, so that I can analyze it externally or create reports.

#### Acceptance Criteria

1. WHEN the admin requests launchpads export THEN the system SHALL generate a CSV file with all launchpad data
2. WHEN the admin requests analytics export THEN the system SHALL generate a CSV file with analytics data
3. WHEN the admin exports data THEN the system SHALL include all relevant fields
4. WHEN export is in progress THEN the system SHALL display a loading indicator
5. WHEN export completes THEN the system SHALL trigger file download

### Requirement 9

**User Story:** As an admin, I want to manage individual launchpad details, so that I can update metadata and configurations.

#### Acceptance Criteria

1. WHEN the admin clicks on a launchpad THEN the system SHALL navigate to the detail page
2. WHEN the admin views launchpad details THEN the system SHALL display all metadata, phases, and whitelist information
3. WHEN the admin updates launchpad status THEN the system SHALL save the change to the database
4. WHEN the admin syncs launchpad mints THEN the system SHALL fetch mint transactions from the blockchain
5. WHEN the admin views phases THEN the system SHALL display start time, end time, price, and max mints per wallet

### Requirement 10

**User Story:** As an admin, I want error handling and loading states throughout the admin panel, so that I have a smooth user experience.

#### Acceptance Criteria

1. WHEN any API request is in progress THEN the system SHALL display appropriate loading indicators
2. WHEN any API request fails THEN the system SHALL display error messages with actionable information
3. WHEN displaying error messages THEN the system SHALL use toast notifications for non-critical errors
4. WHEN a critical error occurs THEN the system SHALL display an error boundary with retry option
5. WHEN data is successfully updated THEN the system SHALL display success confirmation messages
