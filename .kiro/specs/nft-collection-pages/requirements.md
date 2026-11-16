# Requirements Document

## Introduction

This feature implements comprehensive NFT collection and individual NFT detail pages for the launchpad platform. The pages will display NFT collections and individual tokens with detailed information, similar to OpenSea and Magic Eden, but focused on launchpad collections rather than marketplace functionality. The implementation will leverage Alchemy NFT API for fetching NFT data and metadata, and will follow the existing project's design system with banner and thumbnail displays.

## Glossary

- **NFT Collection Page**: A page displaying all NFTs within a specific collection contract, accessible via `/collection/[address]`
- **NFT Detail Page**: A page displaying detailed information about a single NFT token, accessible via `/nft/[address]/[tokenid]`
- **Alchemy NFT API**: Third-party API service for fetching NFT metadata, ownership, and collection information
- **Collection Contract**: The smart contract address that represents an NFT collection
- **Token ID**: The unique identifier for an individual NFT within a collection
- **Launchpad Collection**: An NFT collection created through the platform's launchpad system
- **IPFS**: InterPlanetary File System used for decentralized storage of NFT images and metadata
- **Metadata**: JSON data containing NFT properties including name, description, image, and attributes
- **Banner Image**: Large header image displayed at the top of collection pages
- **Thumbnail Image**: Smaller preview image representing the collection or NFT
- **Mint Phase**: Time-based periods during which NFTs can be minted with specific parameters
- **Total Supply**: The maximum number of NFTs that can exist in a collection
- **Minted Count**: The current number of NFTs that have been minted in a collection

## Requirements

### Requirement 1

**User Story:** As a user, I want to view all NFTs in a collection, so that I can browse the complete collection and see what tokens are available.

#### Acceptance Criteria

1. WHEN a user navigates to `/collection/[address]`, THE system SHALL fetch and display all NFTs for the specified contract address using Alchemy API
2. WHEN displaying the collection page, THE system SHALL show collection metadata including name, description, banner image, and thumbnail image
3. WHEN displaying NFTs, THE system SHALL render them in a grid layout with thumbnail images, token IDs, and names
4. WHEN the collection has more NFTs than can be displayed on one page, THE system SHALL implement pagination using Alchemy's pageKey mechanism
5. WHEN NFT images use IPFS URLs, THE system SHALL convert them to HTTP gateway URLs for display

### Requirement 2

**User Story:** As a user, I want to view detailed information about a specific NFT, so that I can see its properties, metadata, and ownership details.

#### Acceptance Criteria

1. WHEN a user navigates to `/nft/[address]/[tokenid]`, THE system SHALL fetch and display metadata for the specific NFT using Alchemy API
2. WHEN displaying the NFT detail page, THE system SHALL show the NFT image, name, description, and all attributes
3. WHEN displaying the NFT detail page, THE system SHALL show ownership information including current owner address
4. WHEN displaying the NFT detail page, THE system SHALL show collection information including collection name and contract address
5. WHEN the NFT has attributes, THE system SHALL display them in a structured format with trait types and values

### Requirement 3

**User Story:** As a user, I want to see collection statistics and information, so that I can understand the collection's size, mint status, and key details.

#### Acceptance Criteria

1. WHEN viewing a collection page, THE system SHALL display total supply and minted count statistics
2. WHEN viewing a collection page, THE system SHALL display mint progress as a percentage
3. WHEN viewing a collection page, THE system SHALL display active mint phases with start times, end times, and prices
4. WHEN viewing a collection page, THE system SHALL display creator address and contract address with copy functionality
5. WHEN collection metadata includes social links, THE system SHALL display them as clickable icons

### Requirement 4

**User Story:** As a user, I want the pages to follow the project's design system, so that the experience is consistent with the rest of the platform.

#### Acceptance Criteria

1. WHEN rendering collection pages, THE system SHALL use the same color scheme and typography as the existing create-studio pages
2. WHEN displaying images, THE system SHALL show banner images at the top similar to the create-studio header
3. WHEN displaying collection thumbnails, THE system SHALL use the same avatar component and styling as the create-studio
4. WHEN rendering borders and containers, THE system SHALL use the border color `#1E1F22` consistent with existing pages
5. WHEN displaying text, THE system SHALL use the mono font family for headings and labels consistent with existing pages

### Requirement 5

**User Story:** As a user, I want to filter and search NFTs within a collection, so that I can find specific tokens based on attributes or token IDs.

#### Acceptance Criteria

1. WHEN viewing a collection page, THE system SHALL provide a search input to filter NFTs by token ID or name
2. WHEN viewing a collection page with attributes, THE system SHALL provide filter options for each attribute type
3. WHEN a user applies filters, THE system SHALL update the displayed NFTs to match the selected criteria
4. WHEN a user clears filters, THE system SHALL reset to show all NFTs in the collection
5. WHEN filters are applied, THE system SHALL maintain the filter state in the URL query parameters

### Requirement 6

**User Story:** As a user, I want to see loading states and error handling, so that I understand when data is being fetched or if something went wrong.

#### Acceptance Criteria

1. WHEN the system is fetching NFT data, THE system SHALL display a loading indicator
2. WHEN an API request fails, THE system SHALL display an error message with retry functionality
3. WHEN a collection address is invalid, THE system SHALL display a user-friendly error message
4. WHEN an NFT does not exist, THE system SHALL display a "not found" message
5. WHEN images fail to load, THE system SHALL display a fallback placeholder image

### Requirement 7

**User Story:** As a user, I want to navigate between collection and NFT detail pages, so that I can explore the collection hierarchy easily.

#### Acceptance Criteria

1. WHEN viewing an NFT detail page, THE system SHALL provide a breadcrumb or back button to return to the collection page
2. WHEN viewing a collection page, THE system SHALL make each NFT clickable to navigate to its detail page
3. WHEN viewing an NFT detail page, THE system SHALL provide navigation to view adjacent NFTs in the collection
4. WHEN viewing collection information on an NFT detail page, THE system SHALL make the collection name clickable to navigate to the collection page
5. WHEN navigating between pages, THE system SHALL preserve scroll position when returning to the collection page

### Requirement 8

**User Story:** As a developer, I want to integrate Alchemy NFT API efficiently, so that the application can fetch NFT data reliably and performantly.

#### Acceptance Criteria

1. WHEN making API requests to Alchemy, THE system SHALL use the existing AlchemyNFTService class
2. WHEN fetching collection NFTs, THE system SHALL use the `getNFTsForContract` method with metadata enabled
3. WHEN fetching individual NFT metadata, THE system SHALL use the `getNFTMetadata` method
4. WHEN fetching contract metadata, THE system SHALL use the `getContractMetadata` method
5. WHEN handling IPFS URLs, THE system SHALL use the existing `ipfsToHttp` utility function

### Requirement 9

**User Story:** As a user, I want to see launchpad-specific information, so that I understand the minting details and phases for collections created on this platform.

#### Acceptance Criteria

1. WHEN viewing a launchpad collection, THE system SHALL display mint phase information including whitelist and public mint phases
2. WHEN a mint phase is active, THE system SHALL highlight it with visual indicators
3. WHEN viewing mint phases, THE system SHALL display countdown timers for upcoming phases
4. WHEN viewing mint phases, THE system SHALL display price, max per wallet, and total limit for each phase
5. WHEN a collection is from the launchpad database, THE system SHALL merge database information with Alchemy API data

### Requirement 10

**User Story:** As a user, I want to view NFT rarity information, so that I can understand how rare specific traits and tokens are within the collection.

#### Acceptance Criteria

1. WHEN viewing an NFT detail page, THE system SHALL fetch and display rarity data using Alchemy's `computeRarity` method
2. WHEN rarity data is available, THE system SHALL display the NFT's rank within the collection
3. WHEN rarity data is available, THE system SHALL display the rarity score and percentile
4. WHEN viewing attributes, THE system SHALL display the prevalence percentage for each trait value
5. WHEN rarity data is unavailable, THE system SHALL gracefully hide the rarity section
