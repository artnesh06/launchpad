# Requirements Document

## Introduction

This feature enhances the Market Activity Section to display real-time blockchain events from the NFT launchpad platform. The system will track and display mint events, collection creation events, and other relevant blockchain activities in real-time, replacing the current static mock data with live data from the platform's smart contracts and database.

## Glossary

- **Market Activity Section**: The component displaying global blockchain activity on the homepage
- **Activity Feed**: Real-time stream of blockchain events displayed in the Market Activity Section
- **Mint Event**: A blockchain event triggered when a new NFT is minted from a collection
- **Collection Creation Event**: A blockchain event triggered when a new NFT collection is deployed
- **Event Listener**: A service that monitors blockchain events and updates the database
- **Activity Item**: A single entry in the activity feed showing event details
- **Real-time Update**: Data that refreshes automatically without page reload
- **Blockchain Event**: An on-chain transaction event emitted by smart contracts
- **Chain Filter**: A user interface control that filters activity by blockchain network
- **Multi-chain Support**: The ability to display and filter events from multiple blockchain networks
- **Network Identifier**: A unique identifier for each supported blockchain (e.g., "intergaze", "ethereum", "polygon")

## Requirements

### Requirement 1

**User Story:** As a platform visitor, I want to see real-time mint events in the Latest Mint column, so that I can track the newest NFT drops as they happen on the blockchain.

#### Acceptance Criteria

1. WHEN a mint event occurs on the blockchain, THE Activity Feed SHALL display the minted NFT name, collection name, minter address (truncated), and timestamp within 5 seconds
2. THE Activity Feed SHALL display mint events in descending chronological order with the most recent event at the top
3. THE Activity Feed SHALL limit the display to the 3 most recent mint events
4. THE Activity Feed SHALL show the NFT collection thumbnail image for each mint event
5. THE Activity Feed SHALL format the timestamp as relative time (e.g., "1m 2s", "5m 30s")

### Requirement 2

**User Story:** As a platform visitor, I want to see real-time collection creation events in the Latest Collection column, so that I can discover newly launched NFT collections immediately.

#### Acceptance Criteria

1. WHEN a collection creation event occurs on the blockchain, THE Activity Feed SHALL display the collection name, creator address (truncated), and timestamp within 5 seconds
2. THE Activity Feed SHALL display collection creation events in descending chronological order
3. THE Activity Feed SHALL limit the display to the 3 most recent collection creation events
4. THE Activity Feed SHALL show the collection cover image or default placeholder for each collection
5. THE Activity Feed SHALL format the creator address to show first 6 and last 4 characters with ellipsis

### Requirement 3

**User Story:** As a platform visitor, I want the activity feed to update automatically, so that I can see new events without refreshing the page.

#### Acceptance Criteria

1. THE Activity Feed SHALL poll the backend API every 10 seconds to fetch new events
2. WHEN new events are received, THE Activity Feed SHALL update the display smoothly without page flicker
3. THE Activity Feed SHALL maintain scroll position when new events are added
4. IF the API request fails, THE Activity Feed SHALL retry after 30 seconds
5. THE Activity Feed SHALL display a loading state only on initial load, not on subsequent updates

### Requirement 4

**User Story:** As a platform administrator, I want blockchain events to be captured and stored in the database, so that the activity feed can display historical and real-time data reliably.

#### Acceptance Criteria

1. THE Event Listener SHALL monitor the LaunchpadFactory contract for CollectionCreated events
2. THE Event Listener SHALL monitor NFTCollection contracts for Transfer events where from address is zero address (mint events)
3. WHEN a blockchain event is detected, THE Event Listener SHALL store the event data in the database within 3 seconds
4. THE Event Listener SHALL store event type, contract address, transaction hash, block number, timestamp, and relevant event parameters
5. IF the Event Listener encounters an error, THE Event Listener SHALL log the error and continue monitoring without stopping

### Requirement 5

**User Story:** As a platform visitor, I want to see relevant event details in each activity item, so that I can understand what action occurred.

#### Acceptance Criteria

1. THE Activity Item SHALL display the primary entity name (NFT name or collection name) as the first line
2. THE Activity Item SHALL display the action description (e.g., "Minted by 0x1234...5678") as the second line
3. THE Activity Item SHALL display the relative timestamp on the same line as the action
4. THE Activity Item SHALL highlight the most recent event with a subtle green background
5. THE Activity Item SHALL show an avatar/thumbnail image on the left side of each item

### Requirement 6

**User Story:** As a developer, I want a backend API endpoint to fetch recent activity events, so that the frontend can display real-time data efficiently.

#### Acceptance Criteria

1. THE Backend API SHALL provide a GET endpoint at /api/activity/recent
2. THE Backend API SHALL accept query parameters for event type (mint, collection) and limit (default 3, max 10)
3. THE Backend API SHALL return events in JSON format with all necessary display fields
4. THE Backend API SHALL respond within 500 milliseconds for requests with default parameters
5. THE Backend API SHALL return events sorted by timestamp in descending order

### Requirement 7

**User Story:** As a platform visitor, I want to see a fallback message when no events are available, so that I understand the activity feed is working but empty.

#### Acceptance Criteria

1. WHEN no events exist in the database, THE Activity Feed SHALL display a message "No recent activity"
2. THE Activity Feed SHALL display the fallback message in the same styled container as activity items
3. THE Activity Feed SHALL replace the fallback message immediately when the first event is received
4. THE Activity Feed SHALL maintain the column layout and spacing even when showing the fallback message
5. THE Activity Feed SHALL not display loading indicators after the initial load completes

### Requirement 8

**User Story:** As a platform visitor, I want to filter activity by blockchain network, so that I can see events specific to the chain I'm interested in.

#### Acceptance Criteria

1. THE Market Activity Section SHALL display events from all supported blockchain networks by default
2. WHEN a user selects a specific chain from the Chain Filter, THE Activity Feed SHALL display only events from that blockchain network
3. THE Activity Feed SHALL show a chain badge or icon on each Activity Item indicating which blockchain the event occurred on
4. WHEN the chain filter changes, THE Activity Feed SHALL update within 2 seconds to show filtered events
5. THE Activity Feed SHALL maintain separate event counts per chain to ensure 3 most recent events per chain are available

### Requirement 9

**User Story:** As a platform administrator, I want the event listener to support multiple blockchain networks, so that events from all supported chains are captured and stored.

#### Acceptance Criteria

1. THE Event Listener SHALL monitor smart contracts on all configured blockchain networks simultaneously
2. THE Event Listener SHALL store the Network Identifier with each captured event in the database
3. THE Event Listener SHALL maintain separate RPC connections for each supported blockchain network
4. WHEN a new blockchain network is added to configuration, THE Event Listener SHALL automatically start monitoring that network within 60 seconds
5. IF one blockchain network connection fails, THE Event Listener SHALL continue monitoring other networks without interruption

### Requirement 10

**User Story:** As a developer, I want the backend API to support chain filtering, so that the frontend can request events for specific blockchain networks efficiently.

#### Acceptance Criteria

1. THE Backend API SHALL accept an optional "chain" query parameter at /api/activity/recent
2. WHEN the chain parameter is provided, THE Backend API SHALL return only events from that specific blockchain network
3. WHEN the chain parameter is omitted or set to "all", THE Backend API SHALL return events from all supported networks
4. THE Backend API SHALL validate the chain parameter against supported Network Identifiers and return 400 error for invalid chains
5. THE Backend API SHALL include the Network Identifier in each event object in the response
