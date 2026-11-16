# Requirements Document

## Introduction

This document outlines the requirements for fixing integration issues in the NFT Launchpad platform. The system currently has several integration problems including: collection detail page not displaying correct data, create launchpad not inserting activities, and chain selector issues.

## Glossary

- **System**: The NFT Launchpad Platform web application
- **Collection Detail Page**: The page at `/collection/[id]` that displays NFT collection information
- **Activity Log**: Database records tracking user actions and system events
- **Chain Selector**: UI component allowing users to select blockchain networks
- **Launchpad**: An NFT collection deployment on the blockchain
- **Creator Studio**: The interface for creating new NFT collections
- **Database**: PostgreSQL database managed by Prisma ORM
- **IPFS**: InterPlanetary File System for storing NFT metadata and images

## Requirements

### Requirement 1: Collection Detail Page Data Integration

**User Story:** As a user, I want to view accurate and complete collection details when I visit a collection page, so that I can make informed decisions about minting NFTs.

#### Acceptance Criteria

1. WHEN a user navigates to `/collection/[address]`, THE System SHALL fetch collection data using contractAddress query parameter
2. WHEN the API endpoint receives contractAddress parameter, THE System SHALL query database by contractAddress field instead of chainId only
3. WHEN collection data is retrieved, THE System SHALL display the correct chain name based on the chainId from the database
4. WHEN collection metadata exists, THE System SHALL display IPFS images using the ipfsToHttp conversion utility
5. WHEN collection has mint phases, THE System SHALL display the active phase information including price and time remaining

### Requirement 2: Activity Logging for Launchpad Creation

**User Story:** As a platform administrator, I want all launchpad creation events to be logged in the activities table, so that I can track platform usage and user actions.

#### Acceptance Criteria

1. WHEN Creator Studio saves launchpad to database via `/api/admin/launchpads/save`, THE System SHALL verify activity record is created
2. WHEN save API creates new launchpad, THE System SHALL insert activity record with type LAUNCHPAD_CREATED after successful launchpad creation
3. WHEN activity is logged, THE System SHALL include chainId, factoryId, actor address, description, and transaction hash
4. WHEN launchpad already exists in database, THE System SHALL NOT create duplicate activity records
5. WHEN activity is created, THE System SHALL include metadata JSON containing contractAddress, totalMaxSupply, and phasesCount

### Requirement 3: Chain Selector Integration

**User Story:** As a user, I want to select different blockchain networks throughout the application, so that I can interact with collections on my preferred chain.

#### Acceptance Criteria

1. WHEN a user opens the chain selector, THE System SHALL display all supported chains from the SUPPORTED_CHAINS configuration
2. WHEN a user selects a chain, THE System SHALL update the selected chainId in the component state
3. WHEN chainId changes, THE System SHALL trigger data refresh for chain-specific content
4. WHEN a user creates a launchpad, THE System SHALL use the selected chainId for deployment
5. WHEN the selected chain is not connected in wallet, THE System SHALL prompt the user to switch networks

### Requirement 4: Collection Page Countdown Timer

**User Story:** As a user, I want to see an accurate countdown timer for mint phases, so that I know when I can mint NFTs.

#### Acceptance Criteria

1. WHEN a collection has an active mint phase, THE System SHALL calculate countdown based on phase endTime from database
2. WHEN countdown reaches zero, THE System SHALL display "Mint Ended" or move to next phase
3. WHEN no active phase exists, THE System SHALL display "No Active Mint" message
4. WHEN phase data is loading, THE System SHALL show a loading indicator
5. WHEN countdown updates, THE System SHALL refresh every second without causing layout shifts

### Requirement 5: API Query Parameter Support

**User Story:** As a developer, I want the launchpads API to support querying by contractAddress, so that collection detail pages can fetch specific collection data.

#### Acceptance Criteria

1. WHEN API receives contractAddress query parameter, THE System SHALL add contractAddress filter to the where clause
2. WHEN both chainId and contractAddress are provided, THE System SHALL filter by both fields
3. WHEN contractAddress matches a launchpad, THE System SHALL return single launchpad in array format for consistency
4. WHEN contractAddress does not match any launchpad, THE System SHALL return empty array with success status
5. WHEN contractAddress is invalid format, THE System SHALL return 400 error with validation message

### Requirement 6: Chain Configuration Consistency

**User Story:** As a developer, I want consistent chain configuration across all components, so that chain-related features work reliably.

#### Acceptance Criteria

1. WHEN System initializes, THE System SHALL load chain configurations from a single source of truth
2. WHEN displaying chain names, THE System SHALL use the getChainName utility function consistently
3. WHEN converting chainId to chain name, THE System SHALL handle unknown chains gracefully
4. WHEN chain configuration is missing, THE System SHALL log a warning and use default values
5. WHEN multiple components need chain data, THE System SHALL use the same SUPPORTED_CHAINS constant

### Requirement 7: IPFS Image Display

**User Story:** As a user, I want to see collection images loaded from IPFS, so that I can view the visual representation of NFT collections.

#### Acceptance Criteria

1. WHEN collection metadata contains IPFS URLs, THE System SHALL convert them to HTTP gateway URLs
2. WHEN IPFS image fails to load, THE System SHALL display a fallback placeholder image
3. WHEN image is loading, THE System SHALL show a loading skeleton
4. WHEN IPFS gateway is slow, THE System SHALL timeout after 10 seconds and show fallback
5. WHEN image loads successfully, THE System SHALL cache it in browser for subsequent visits

### Requirement 8: Chain Selector State Management

**User Story:** As a user, I want the chain selector to properly update when I change networks, so that I can interact with collections on different chains.

#### Acceptance Criteria

1. WHEN user changes chain in selector, THE System SHALL update selectedChainId state immediately
2. WHEN selectedChainId changes, THE System SHALL update collectionData.chainId to match
3. WHEN user submits form, THE System SHALL use the current selectedChainId for deployment
4. WHEN chain selector initializes, THE System SHALL use getDefaultChain() to set initial value
5. WHEN selected chain has no factory address, THE System SHALL display warning message to user
