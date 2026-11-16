# Requirements Document

## Introduction

This document specifies the requirements for implementing comprehensive event listening and activity tracking for the OddsLaunchpad smart contract. Currently, only 2 out of 26 available contract events are being tracked (7.7% coverage). This feature will implement listeners for all critical contract events to provide complete visibility into user activities, administrative actions, and contract state changes.

## Glossary

- **Event Listener**: A blockchain monitoring component that watches for and processes specific smart contract events
- **Activity Feed**: A chronological record of all tracked events displayed to users
- **OddsLaunchpad Contract**: The main NFT launchpad smart contract that emits events for various operations
- **ActivityType**: An enumeration defining the types of activities that can be tracked in the system
- **Prisma Schema**: The database schema definition used by the application
- **Event Handler**: A function that processes a specific contract event and stores it in the database

## Requirements

### Requirement 1

**User Story:** As a user, I want to see when NFTs are burned, so that I can track supply changes and rarity updates.

#### Acceptance Criteria

1. WHEN a Burned event is emitted by the OddsLaunchpad contract THEN the system SHALL capture the owner address, token ID, and transaction details
2. WHEN a burn activity is captured THEN the system SHALL store it in the database with ActivityType BURN_OCCURRED
3. WHEN a burn occurs THEN the system SHALL update the collection's total supply count
4. WHEN displaying burn activities THEN the system SHALL show the burner address, token ID, and timestamp

### Requirement 2

**User Story:** As a user, I want to see when batch airdrops occur, so that I can track large distribution events.

#### Acceptance Criteria

1. WHEN an Airdropped event is emitted THEN the system SHALL capture the operator address, recipient count, and total quantity
2. WHEN an airdrop activity is captured THEN the system SHALL store it with ActivityType AIRDROP_OCCURRED
3. WHEN displaying airdrop activities THEN the system SHALL show the number of recipients and total NFTs distributed

### Requirement 3

**User Story:** As a user, I want to receive notifications when new mint phases are added, so that I can participate in new minting opportunities.

#### Acceptance Criteria

1. WHEN a PhaseAdded event is emitted THEN the system SHALL capture the phase ID, name, start time, end time, and price
2. WHEN a phase addition is captured THEN the system SHALL store it with ActivityType PHASE_CREATED
3. WHEN a new phase is added THEN the system SHALL update the collection's phase list in the database
4. WHEN displaying phase creation activities THEN the system SHALL show the phase name, timing, and price details

### Requirement 4

**User Story:** As a user, I want to be notified when mint phases are updated, so that I can adjust my minting strategy.

#### Acceptance Criteria

1. WHEN a PhaseUpdated event is emitted THEN the system SHALL capture all updated phase parameters
2. WHEN a phase update is captured THEN the system SHALL store it with ActivityType PHASE_UPDATED
3. WHEN a phase is updated THEN the system SHALL update the corresponding phase record in the database
4. WHEN displaying phase update activities THEN the system SHALL show what parameters changed

### Requirement 5

**User Story:** As a user, I want to know when a collection is revealed, so that I can view the final metadata and rarity of my NFTs.

#### Acceptance Criteria

1. WHEN a Revealed event is emitted THEN the system SHALL capture the new base URI
2. WHEN a reveal activity is captured THEN the system SHALL store it with ActivityType COLLECTION_REVEALED
3. WHEN a collection is revealed THEN the system SHALL update the collection's revealed status in the database
4. WHEN displaying reveal activities THEN the system SHALL show the reveal timestamp and collection details

### Requirement 6

**User Story:** As an administrator, I want to track treasury address changes, so that I can maintain transparency and security.

#### Acceptance Criteria

1. WHEN a TreasuryUpdated event is emitted THEN the system SHALL capture both old and new treasury addresses
2. WHEN a treasury update is captured THEN the system SHALL store it with ActivityType TREASURY_UPDATED
3. WHEN displaying treasury updates THEN the system SHALL show both the previous and new addresses

### Requirement 7

**User Story:** As an administrator, I want to track fund withdrawals, so that I can maintain financial transparency.

#### Acceptance Criteria

1. WHEN a Withdrawn event is emitted THEN the system SHALL capture the recipient address and withdrawal amount
2. WHEN a withdrawal is captured THEN the system SHALL store it with ActivityType EMERGENCY_WITHDRAW
3. WHEN displaying withdrawal activities THEN the system SHALL show the recipient, amount in ETH, and timestamp

### Requirement 8

**User Story:** As an administrator, I want to track ownership transfers, so that I can maintain a complete audit trail.

#### Acceptance Criteria

1. WHEN an OwnershipTransferred event is emitted THEN the system SHALL capture both previous and new owner addresses
2. WHEN an ownership transfer is captured THEN the system SHALL store it with ActivityType OWNERSHIP_TRANSFERRED
3. WHEN a collection ownership changes THEN the system SHALL update the collection's owner field in the database
4. WHEN displaying ownership transfers THEN the system SHALL show both addresses and timestamp

### Requirement 9

**User Story:** As an administrator, I want to track platform fee changes, so that I can maintain pricing transparency.

#### Acceptance Criteria

1. WHEN a PlatformFeeToggled event is emitted THEN the system SHALL capture the enabled status
2. WHEN a PlatformFlatFeeUpdated event is emitted THEN the system SHALL capture the new fee amount
3. WHEN fee changes are captured THEN the system SHALL store them with ActivityType FEE_UPDATED
4. WHEN displaying fee updates THEN the system SHALL show the fee status or amount and timestamp

### Requirement 10

**User Story:** As a creator, I want to track royalty updates, so that I can monitor my secondary sale earnings configuration.

#### Acceptance Criteria

1. WHEN a RoyaltyUpdated event is emitted THEN the system SHALL capture the recipient address and percentage
2. WHEN a royalty update is captured THEN the system SHALL store it with ActivityType ROYALTY_UPDATED
3. WHEN displaying royalty updates THEN the system SHALL show the recipient and royalty percentage

### Requirement 11

**User Story:** As an administrator, I want to track metadata URI updates, so that I can monitor collection metadata changes.

#### Acceptance Criteria

1. WHEN a BaseURIUpdated event is emitted THEN the system SHALL capture the new base URI
2. WHEN a ContractURIUpdated event is emitted THEN the system SHALL capture the new contract URI
3. WHEN metadata updates are captured THEN the system SHALL store them with ActivityType METADATA_UPDATED
4. WHEN displaying metadata updates THEN the system SHALL show the update type and timestamp

### Requirement 12

**User Story:** As an administrator, I want to track contract pause/unpause events, so that I can monitor emergency controls.

#### Acceptance Criteria

1. WHEN a Paused event is emitted THEN the system SHALL capture the pause action
2. WHEN an Unpaused event is emitted THEN the system SHALL capture the unpause action
3. WHEN pause events are captured THEN the system SHALL store them with ActivityType CONTRACT_PAUSED or CONTRACT_UNPAUSED
4. WHEN displaying pause events THEN the system SHALL show the action type and timestamp

### Requirement 13

**User Story:** As an administrator, I want to track transfer lock updates, so that I can monitor NFT transfer restrictions.

#### Acceptance Criteria

1. WHEN a TransferLockUpdated event is emitted THEN the system SHALL capture the new lock status
2. WHEN a transfer lock update is captured THEN the system SHALL store it with ActivityType TRANSFER_LOCK_UPDATED
3. WHEN displaying transfer lock updates THEN the system SHALL show the lock status and timestamp

### Requirement 14

**User Story:** As an administrator, I want to track role changes, so that I can maintain access control audit trails.

#### Acceptance Criteria

1. WHEN a RoleGranted event is emitted THEN the system SHALL capture the role, account, and sender
2. WHEN a RoleRevoked event is emitted THEN the system SHALL capture the role, account, and sender
3. WHEN role changes are captured THEN the system SHALL store them with ActivityType ROLE_GRANTED or ROLE_REVOKED
4. WHEN displaying role changes THEN the system SHALL show the role name, affected account, and timestamp

### Requirement 15

**User Story:** As a developer, I want all event listeners to handle errors gracefully, so that one failing event does not crash the entire listener system.

#### Acceptance Criteria

1. WHEN an event handler encounters an error THEN the system SHALL log the error with full context
2. WHEN an event handler fails THEN the system SHALL continue processing other events
3. WHEN an event handler fails repeatedly THEN the system SHALL alert administrators
4. WHEN processing events THEN the system SHALL validate all event data before storing

### Requirement 16

**User Story:** As a developer, I want event listeners to be configurable per chain, so that I can enable different events for different blockchain networks.

#### Acceptance Criteria

1. WHEN initializing event listeners THEN the system SHALL support chain-specific configuration
2. WHEN a chain is configured THEN the system SHALL only listen to events enabled for that chain
3. WHEN adding new chains THEN the system SHALL allow independent event configuration
