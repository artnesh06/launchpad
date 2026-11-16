/**
 * Icon Mapping Configuration
 * Maps Lucide React icon names to their Huge Icons equivalents
 * 
 * Based on the design document mapping reference table
 */

export interface IconMapping {
  lucideName: string;
  hugeIconsName: string;
  notes?: string;
  needsManualReview?: boolean;
}

/**
 * Comprehensive mapping of Lucide icons to Huge Icons equivalents
 * Organized by category for easier maintenance
 */
export const iconMappings: IconMapping[] = [
  // Chevrons (mapped to Arrow icons since Chevron icons don't exist in Huge Icons free package)
  { lucideName: 'ChevronRight', hugeIconsName: 'ArrowRight01Icon', notes: 'Mapped to Arrow icon' },
  { lucideName: 'ChevronDown', hugeIconsName: 'ArrowDown01Icon', notes: 'Mapped to Arrow icon' },
  { lucideName: 'ChevronUp', hugeIconsName: 'ArrowUp01Icon', notes: 'Mapped to Arrow icon' },
  { lucideName: 'ChevronLeft', hugeIconsName: 'ArrowLeft01Icon', notes: 'Mapped to Arrow icon' },
  
  // Actions
  { lucideName: 'X', hugeIconsName: 'Cancel01Icon', notes: 'Close/cancel action' },
  { lucideName: 'Check', hugeIconsName: 'Tick01Icon', notes: 'Checkmark' },
  { lucideName: 'CheckCircle', hugeIconsName: 'TickDouble02Icon', notes: 'Completed state' },
  { lucideName: 'Plus', hugeIconsName: 'Add01Icon', notes: 'Add action' },
  { lucideName: 'Trash2', hugeIconsName: 'Delete02Icon', notes: 'Delete action' },
  { lucideName: 'Edit', hugeIconsName: 'PencilEdit01Icon', notes: 'Edit action' },
  { lucideName: 'Copy', hugeIconsName: 'Copy01Icon', notes: 'Copy action' },
  { lucideName: 'Save', hugeIconsName: 'Save01Icon', notes: 'Save action' },
  
  // Alerts and Info
  { lucideName: 'AlertCircle', hugeIconsName: 'AlertCircleIcon', notes: 'Direct match' },
  { lucideName: 'Info', hugeIconsName: 'InformationCircleIcon', notes: 'Information' },
  { lucideName: 'AlertTriangle', hugeIconsName: 'AlertTriangleIcon', notes: 'Warning' },
  
  // Search and Navigation
  { lucideName: 'Search', hugeIconsName: 'Search01Icon', notes: 'Search' },
  { lucideName: 'Menu', hugeIconsName: 'Menu01Icon', notes: 'Menu/hamburger' },
  { lucideName: 'MoreVertical', hugeIconsName: 'MoreVerticalIcon', notes: 'More options vertical' },
  { lucideName: 'MoreHorizontal', hugeIconsName: 'MoreHorizontalIcon', notes: 'More options horizontal' },
  
  // Settings and Configuration
  { lucideName: 'Settings', hugeIconsName: 'Settings01Icon', notes: 'Settings' },
  { lucideName: 'Sliders', hugeIconsName: 'Slider01Icon', notes: 'Adjustments/filters' },
  
  // User and Profile
  { lucideName: 'User', hugeIconsName: 'User01Icon', notes: 'User profile' },
  { lucideName: 'Users', hugeIconsName: 'UserMultiple01Icon', notes: 'Multiple users' },
  
  // Date and Time
  { lucideName: 'Calendar', hugeIconsName: 'Calendar01Icon', notes: 'Calendar' },
  { lucideName: 'Clock', hugeIconsName: 'Clock01Icon', notes: 'Time' },
  
  // Finance
  { lucideName: 'DollarSign', hugeIconsName: 'DollarCircleIcon', notes: 'Currency' },
  
  // File Operations
  { lucideName: 'Upload', hugeIconsName: 'Upload01Icon', notes: 'Upload' },
  { lucideName: 'Download', hugeIconsName: 'Download01Icon', notes: 'Download' },
  { lucideName: 'File', hugeIconsName: 'File01Icon', notes: 'File' },
  { lucideName: 'FileCode', hugeIconsName: 'FileScriptIcon', notes: 'Code file' },
  { lucideName: 'Folder', hugeIconsName: 'Folder01Icon', notes: 'Folder' },
  
  // Links and External
  { lucideName: 'ExternalLink', hugeIconsName: 'ExternalLinkIcon', notes: 'External link' },
  { lucideName: 'Link', hugeIconsName: 'Link01Icon', notes: 'Link' },
  
  // Visibility
  { lucideName: 'Eye', hugeIconsName: 'View01Icon', notes: 'View/visibility' },
  { lucideName: 'EyeOff', hugeIconsName: 'ViewOff01Icon', notes: 'Hidden' },
  
  // Security
  { lucideName: 'Lock', hugeIconsName: 'Lock01Icon', notes: 'Locked' },
  { lucideName: 'Unlock', hugeIconsName: 'Unlock01Icon', notes: 'Unlocked' },
  
  // Loading and Refresh
  { lucideName: 'Loader2', hugeIconsName: 'Loading01Icon', notes: 'Loading spinner' },
  { lucideName: 'Loader', hugeIconsName: 'Loading01Icon', notes: 'Loading spinner' },
  { lucideName: 'RefreshCw', hugeIconsName: 'Refresh01Icon', notes: 'Refresh' },
  
  // Arrows
  { lucideName: 'ArrowRight', hugeIconsName: 'ArrowRight01Icon', notes: 'Arrow right' },
  { lucideName: 'ArrowLeft', hugeIconsName: 'ArrowLeft01Icon', notes: 'Arrow left' },
  { lucideName: 'ArrowUp', hugeIconsName: 'ArrowUp01Icon', notes: 'Arrow up' },
  { lucideName: 'ArrowDown', hugeIconsName: 'ArrowDown01Icon', notes: 'Arrow down' },
  
  // Communication
  { lucideName: 'Mail', hugeIconsName: 'Mail01Icon', notes: 'Email' },
  { lucideName: 'MessageSquare', hugeIconsName: 'Message01Icon', notes: 'Message/chat' },
  { lucideName: 'Bell', hugeIconsName: 'Notification01Icon', notes: 'Notifications' },
  
  // Media
  { lucideName: 'Image', hugeIconsName: 'Image01Icon', notes: 'Image' },
  { lucideName: 'Video', hugeIconsName: 'Video01Icon', notes: 'Video' },
  { lucideName: 'Play', hugeIconsName: 'Play01Icon', notes: 'Play' },
  { lucideName: 'Pause', hugeIconsName: 'Pause01Icon', notes: 'Pause' },
  
  // Layout
  { lucideName: 'Grid', hugeIconsName: 'Grid01Icon', notes: 'Grid layout' },
  { lucideName: 'List', hugeIconsName: 'List01Icon', notes: 'List view' },
  { lucideName: 'Columns', hugeIconsName: 'Column01Icon', notes: 'Columns' },
  
  // Status
  { lucideName: 'CheckCircle2', hugeIconsName: 'CheckmarkCircle01Icon', notes: 'Success/completed' },
  { lucideName: 'XCircle', hugeIconsName: 'CancelCircleIcon', notes: 'Error/cancelled' },
  
  // Misc
  { lucideName: 'Home', hugeIconsName: 'Home01Icon', notes: 'Home' },
  { lucideName: 'Globe', hugeIconsName: 'Globe01Icon', notes: 'Globe/world/web' },
  { lucideName: 'Star', hugeIconsName: 'Star01Icon', notes: 'Star/favorite' },
  { lucideName: 'Heart', hugeIconsName: 'FavouriteIcon', notes: 'Heart/like' },
  { lucideName: 'Share', hugeIconsName: 'Share01Icon', notes: 'Share' },
  { lucideName: 'Filter', hugeIconsName: 'FilterIcon', notes: 'Filter' },
  { lucideName: 'Zap', hugeIconsName: 'FlashIcon', notes: 'Lightning/flash' },
  { lucideName: 'LogOut', hugeIconsName: 'Logout01Icon', notes: 'Logout' },
  { lucideName: 'Send', hugeIconsName: 'Sent01Icon', notes: 'Send' },
  { lucideName: 'ShoppingBasket', hugeIconsName: 'ShoppingBasket01Icon', notes: 'Shopping basket' },
  { lucideName: 'Flame', hugeIconsName: 'Fire01Icon', notes: 'Flame/fire' },
  { lucideName: 'Circle', hugeIconsName: 'Circle', notes: 'Circle' },
  { lucideName: 'Smartphone', hugeIconsName: 'SmartPhone01Icon', notes: 'Smartphone' },
  { lucideName: 'Monitor', hugeIconsName: 'ComputerIcon', notes: 'Monitor/computer' },
  { lucideName: 'Menu', hugeIconsName: 'Menu01Icon', notes: 'Menu' },
  { lucideName: 'Timer', hugeIconsName: 'Timer01Icon', notes: 'Timer' },
  { lucideName: 'GripVertical', hugeIconsName: 'DragVerticalIcon', notes: 'Vertical grip/drag handle' },
  { lucideName: 'Rocket', hugeIconsName: 'Rocket01Icon', notes: 'Rocket' },
  { lucideName: 'FileQuestion', hugeIconsName: 'FileUnknownIcon', notes: 'File with question mark' },
  { lucideName: 'Coins', hugeIconsName: 'Coins01Icon', notes: 'Coins' },
  { lucideName: 'Twitter', hugeIconsName: 'NewTwitterIcon', notes: 'Twitter/X social media' },
  { lucideName: 'Wallet', hugeIconsName: 'Wallet01Icon', notes: 'Wallet' },
  { lucideName: 'TrendingUp', hugeIconsName: 'TrendingUp01Icon', notes: 'Trending up' },
  { lucideName: 'ArrowUpRight', hugeIconsName: 'ArrowUpRight01Icon', notes: 'Arrow up right' },
  { lucideName: 'ArrowDownRight', hugeIconsName: 'ArrowDownRight01Icon', notes: 'Arrow down right' },
  { lucideName: 'Layers', hugeIconsName: 'Layers01Icon', notes: 'Layers' },
  { lucideName: 'Activity', hugeIconsName: 'Activity01Icon', notes: 'Activity' },
  { lucideName: 'BarChart3', hugeIconsName: 'BarChart01Icon', notes: 'Bar chart' },
  { lucideName: 'Shield', hugeIconsName: 'Shield01Icon', notes: 'Shield' },
  { lucideName: 'Factory', hugeIconsName: 'Factory01Icon', notes: 'Factory' },
  { lucideName: 'TrendingDown', hugeIconsName: 'TrendingDown01Icon', notes: 'Trending down' },
  { lucideName: 'Crown', hugeIconsName: 'Crown01Icon', notes: 'Crown' },
  { lucideName: 'ShieldAlert', hugeIconsName: 'ShieldBlockedIcon', notes: 'Shield with alert' },
  { lucideName: 'Youtube', hugeIconsName: 'YoutubeIcon', notes: 'YouTube' },
  { lucideName: 'FileText', hugeIconsName: 'FileTextIcon', notes: 'Text file' },
  { lucideName: 'ArrowUpDown', hugeIconsName: 'ArrowUpDown01Icon', notes: 'Arrow up down' },
  { lucideName: 'CreditCard', hugeIconsName: 'CreditCard01Icon', notes: 'Credit card' },
  { lucideName: 'Database', hugeIconsName: 'Database01Icon', notes: 'Database' },
  { lucideName: 'LayoutDashboard', hugeIconsName: 'LayoutDashboard01Icon', notes: 'Dashboard layout' },
  { lucideName: 'Layers', hugeIconsName: 'Layers01Icon', notes: 'Layers' },
  { lucideName: 'MessageCircle', hugeIconsName: 'Message01Icon', notes: 'Message circle' },
  { lucideName: 'Hash', hugeIconsName: 'Hashtag01Icon', notes: 'Hashtag' },
  { lucideName: 'Github', hugeIconsName: 'Github01Icon', notes: 'GitHub' },
  { lucideName: 'Linkedin', hugeIconsName: 'Linkedin01Icon', notes: 'LinkedIn' },
  { lucideName: 'Instagram', hugeIconsName: 'Instagram01Icon', notes: 'Instagram' },
  { lucideName: 'Play', hugeIconsName: 'Play01Icon', notes: 'Play' },
  { lucideName: 'Pause', hugeIconsName: 'Pause01Icon', notes: 'Pause' },
  { lucideName: 'Square', hugeIconsName: 'Square01Icon', notes: 'Square' },
  { lucideName: 'XCircle', hugeIconsName: 'CancelCircleIcon', notes: 'X circle' },
  { lucideName: 'ArrowLeft', hugeIconsName: 'ArrowLeft01Icon', notes: 'Arrow left' },
];

/**
 * Create a lookup map for faster icon name resolution
 */
const iconMappingMap = new Map<string, IconMapping>(
  iconMappings.map(mapping => [mapping.lucideName, mapping])
);

/**
 * Look up the Huge Icons equivalent for a Lucide icon name
 * 
 * @param lucideName - The Lucide icon name to look up
 * @returns The icon mapping if found, undefined otherwise
 */
export function getHugeIconsEquivalent(lucideName: string): IconMapping | undefined {
  return iconMappingMap.get(lucideName);
}

/**
 * Get the Huge Icons name for a Lucide icon, or return undefined if not found
 * 
 * @param lucideName - The Lucide icon name
 * @returns The Huge Icons name or undefined
 */
export function getHugeIconsName(lucideName: string): string | undefined {
  return iconMappingMap.get(lucideName)?.hugeIconsName;
}

/**
 * Check if a Lucide icon has a known mapping
 * 
 * @param lucideName - The Lucide icon name to check
 * @returns True if a mapping exists, false otherwise
 */
export function hasMapping(lucideName: string): boolean {
  return iconMappingMap.has(lucideName);
}

/**
 * Get all Lucide icon names that have mappings
 * 
 * @returns Array of all mapped Lucide icon names
 */
export function getAllMappedLucideIcons(): string[] {
  return Array.from(iconMappingMap.keys());
}

/**
 * Get icons that need manual review
 * 
 * @returns Array of icon mappings that need manual review
 */
export function getIconsNeedingReview(): IconMapping[] {
  return iconMappings.filter(mapping => mapping.needsManualReview);
}

/**
 * Get mapping statistics
 * 
 * @returns Statistics about the icon mappings
 */
export function getMappingStats() {
  return {
    totalMappings: iconMappings.length,
    needsReview: iconMappings.filter(m => m.needsManualReview).length,
    directMatches: iconMappings.filter(m => m.notes?.includes('Direct match')).length,
  };
}
