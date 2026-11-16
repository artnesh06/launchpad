# Implementation Plan

- [x] 1. Set up shared utilities and types





  - Create TypeScript interfaces for all admin data models
  - Create AdminApiClient class for centralized API calls
  - Create error handling utilities (AdminPanelError class, handleApiError function)
  - Set up toast notification system integration
  - _Requirements: 10.1, 10.2, 10.3_

- [ ]* 1.1 Write property test for API client error handling
  - **Property 29: API errors display error messages**
  - **Validates: Requirements 10.2**

- [x] 2. Create custom hooks for data fetching





- [x] 2.1 Implement useAdminStats hook


  - Create hook to fetch dashboard statistics
  - Handle loading and error states
  - Implement refetch functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 2.2 Write property test for useAdminStats
  - **Property 1: Dashboard stats API returns all required fields**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 2.3 Implement useAdminLaunchpads hook


  - Create hook to fetch launchpads with filters
  - Implement pagination support
  - Handle search, chain filter, and status filter
  - Implement updateStatus function
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 2.4 Write property tests for useAdminLaunchpads
  - **Property 3: Launchpads API returns paginated results**
  - **Property 4: Launchpad data contains all required fields**
  - **Property 5: Chain filter returns only matching launchpads**
  - **Property 6: Status filter returns only matching launchpads**
  - **Property 7: Search returns matching launchpads**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [x] 2.5 Implement useAdminBanners hook


  - Create hook to fetch banners
  - Implement CRUD operations (create, update, delete)
  - Implement reorderBanners function
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 2.6 Write property tests for useAdminBanners
  - **Property 17: Banner creation includes all required fields**
  - **Property 18: Banner updates are persisted**
  - **Property 19: Banner deletion removes from database**
  - **Property 20: Banner reordering updates sequences**
  - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

- [x] 2.7 Implement useAdminActivity hook


  - Create hook to fetch recent activities
  - Implement limit parameter
  - Format timestamps as relative time
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 2.8 Write property tests for useAdminActivity
  - **Property 21: Activity data contains all required fields**
  - **Property 22: Activity results are limited**
  - **Property 23: Timestamps are formatted as relative time**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 2.9 Implement useAdminSync hook


  - Create hook to handle sync operations
  - Implement syncLaunchpads function with progress tracking
  - Implement syncSingleLaunchpad function
  - Handle sync errors and display messages
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 2.10 Write property tests for useAdminSync
  - **Property 8: Sync operation fetches blockchain data**
  - **Property 9: Sync updates database with blockchain data**
  - **Property 10: Sync displays progress indicators**
  - **Property 11: Sync completion shows count**
  - **Property 12: Sync errors are displayed**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 3. Update Dashboard page with real data





- [x] 3.1 Integrate useAdminStats hook into dashboard


  - Replace mock data with real stats from hook
  - Add loading states for stat cards
  - Display error states if fetch fails
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 3.2 Write property test for dashboard loading states
  - **Property 2: Loading states are displayed during data fetching**
  - **Validates: Requirements 1.5**

- [x] 3.3 Integrate useAdminActivity hook into dashboard


  - Replace mock activity data with real data
  - Format activity timestamps
  - Handle empty state when no activities exist
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3.4 Update quick actions to use real navigation


  - Link "Create Banner" to banners page
  - Link "Manage Collections" to collections page
  - Link "View Analytics" to analytics page
  - Remove placeholder actions

- [x] 4. Update Collections page with real data





- [x] 4.1 Integrate useAdminLaunchpads hook


  - Replace mock data with real launchpads from hook
  - Implement pagination controls
  - Add loading states for table
  - _Requirements: 2.1, 2.2_

- [x] 4.2 Implement filter controls

  - Add chain selector dropdown
  - Add status filter dropdown
  - Add search input with debouncing
  - Wire filters to useAdminLaunchpads hook
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 4.3 Add launchpad detail navigation

  - Make table rows clickable
  - Navigate to detail page on click
  - Pass launchpad ID in URL
  - _Requirements: 9.1_

- [x] 4.4 Implement status update functionality

  - Add status dropdown in table
  - Call updateStatus from hook on change
  - Show success/error toast notifications
  - _Requirements: 9.3_

- [ ]* 4.5 Write property test for status updates
  - **Property 26: Status updates are persisted**
  - **Validates: Requirements 9.3**

- [x] 5. Create Launchpad Detail page





- [x] 5.1 Create launchpad detail page component


  - Create new page at /admin/collections/[id]
  - Fetch launchpad details by ID
  - Display all metadata, phases, and whitelist info
  - _Requirements: 9.2_

- [ ]* 5.2 Write property test for launchpad details
  - **Property 25: Launchpad details contain complete information**
  - **Property 28: Phase data contains all required fields**
  - **Validates: Requirements 9.2, 9.5**

- [x] 5.3 Implement mint sync functionality


  - Add "Sync Mints" button
  - Call mint sync API endpoint
  - Display sync progress
  - Show success/error messages
  - _Requirements: 9.4_

- [ ]* 5.4 Write property test for mint sync
  - **Property 27: Mint sync fetches blockchain transactions**
  - **Validates: Requirements 9.4**
-

- [x] 6. Update Factory page with real data




- [x] 6.1 Fetch factory information from API


  - Call /api/admin/factory-info endpoint
  - Display all factory fields (address, owner, treasury, fees)
  - Add loading states
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 6.2 Write property test for factory data
  - **Property 13: Factory API returns all required fields**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 6.3 Integrate sync functionality

  - Add "Sync All Launchpads" button
  - Use useAdminSync hook
  - Display sync progress modal
  - Show sync results
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7. Update Banners page with real data







- [x] 7.1 Integrate useAdminBanners hook


  - Replace mock data with real banners
  - Add loading states
  - Display error states
  - _Requirements: 6.1_

- [x] 7.2 Implement banner creation


  - Create banner form modal
  - Validate form inputs
  - Call createBanner from hook
  - Show success/error notifications
  - _Requirements: 6.2_

- [x] 7.3 Implement banner editing

  - Create edit modal with pre-filled data
  - Call updateBanner from hook
  - Show success/error notifications
  - _Requirements: 6.3_

- [x] 7.4 Implement banner deletion

  - Add confirmation dialog
  - Call deleteBanner from hook
  - Show success/error notifications
  - _Requirements: 6.4_

- [x] 7.5 Implement drag-and-drop reordering

  - Add drag-and-drop library (dnd-kit or react-beautiful-dnd)
  - Update sequence numbers on drop
  - Call reorderBanners from hook
  - Show success/error notifications
  - _Requirements: 6.5_

- [x] 8. Implement Analytics page





- [x] 8.1 Create analytics API endpoint

  - Create /api/admin/analytics route
  - Fetch volume over time data
  - Fetch mints over time data
  - Fetch top collections by volume
  - Fetch top creators by volume
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 8.2 Write property tests for analytics
  - **Property 14: Analytics API returns time-series data**
  - **Property 15: Top collections are sorted by volume**
  - **Property 16: Top creators are sorted by volume**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**


- [x] 8.3 Create analytics page UI

  - Add volume chart using recharts or chart.js
  - Add mints chart
  - Display top collections table
  - Display top creators table
  - Add loading states


- [x] 8.4 Implement export functionality

  - Add "Export" button for each data type
  - Call export API endpoints
  - Generate CSV files
  - Trigger file download
  - _Requirements: 8.1, 8.2, 8.3_

- [ ]* 8.5 Write property test for CSV export
  - **Property 24: CSV export contains all fields**
  - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 9. Implement error boundaries and loading states




- [x] 9.1 Create error boundary component


  - Create ErrorBoundary component with retry option
  - Wrap admin layout with error boundary
  - Display user-friendly error messages
  - _Requirements: 10.4_

- [ ]* 9.2 Write property test for error boundary
  - **Property 31: Critical errors display error boundary**
  - **Validates: Requirements 10.4**

- [x] 9.3 Create loading skeleton components


  - Create StatCardSkeleton component
  - Create TableSkeleton component
  - Create ChartSkeleton component
  - Use skeletons in all pages during loading
  - _Requirements: 1.5, 4.5, 8.4, 10.1_

- [x] 9.4 Implement toast notifications


  - Configure toast notification system (sonner or react-hot-toast)
  - Use toasts for success messages
  - Use toasts for non-critical errors
  - _Requirements: 10.3, 10.5_

- [ ]* 9.5 Write property tests for notifications
  - **Property 30: Non-critical errors use toast notifications**
  - **Property 32: Success operations show confirmation**
  - **Validates: Requirements 10.3, 10.5**
- [x] 10. Checkpoint - Ensure all tests pass




- [ ] 10. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.


- [x] 11. Final integration and polish




- [x] 11.1 Test all admin pages end-to-end


  - Verify dashboard displays real data
  - Verify collections page with filters and pagination
  - Verify factory page with sync functionality
  - Verify banners page with CRUD operations
  - Verify analytics page with charts and export

- [x] 11.2 Optimize performance


  - Add React Query or SWR for caching
  - Implement debouncing for search inputs
  - Add lazy loading for heavy components
  - Optimize database queries if needed

- [x] 11.3 Accessibility improvements


  - Add ARIA labels to all interactive elements
  - Ensure keyboard navigation works
  - Test with screen reader
  - Verify color contrast meets WCAG AA

- [ ]* 11.4 Write integration tests
  - Test dashboard flow
  - Test collections flow with filters
  - Test sync flow
  - Test banner management flow
  - Test export flow
