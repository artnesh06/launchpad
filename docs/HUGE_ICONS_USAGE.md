# Huge Icons Usage Guide

This document provides guidelines for using Huge Icons in the project after migrating from Lucide React.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Icon Naming Conventions](#icon-naming-conventions)
- [Size Conversion Reference](#size-conversion-reference)
- [Common Usage Examples](#common-usage-examples)
- [Props and Styling](#props-and-styling)
- [Best Practices](#best-practices)

## Installation

Huge Icons is already installed in this project. The packages used are:

```bash
bun add @hugeicons/react @hugeicons/core-free-icons
```

- `@hugeicons/react` - The React wrapper component
- `@hugeicons/core-free-icons` - 4,600+ free icon definitions

## Basic Usage

Unlike Lucide React which exports individual icon components, Huge Icons uses a single wrapper component with icon data passed as a prop.

### Import Pattern

```typescript
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronRightIcon, Cancel01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
```

### JSX Usage

```tsx
// Basic usage
<HugeiconsIcon icon={ChevronRightIcon} />

// With size
<HugeiconsIcon icon={ChevronRightIcon} size={24} />

// With className
<HugeiconsIcon icon={ChevronRightIcon} className="text-blue-500" />

// With multiple props
<HugeiconsIcon 
  icon={ChevronRightIcon} 
  size={20}
  className="text-gray-600 hover:text-gray-900"
/>
```

## Icon Naming Conventions

Huge Icons follows a consistent naming pattern:

1. **Icon names end with "Icon"**: `ChevronRightIcon`, `Cancel01Icon`, `Tick01Icon`
2. **Numbered variants**: When multiple versions exist, they're numbered (e.g., `Add01Icon`, `Add02Icon`)
3. **Descriptive names**: Icons use clear, descriptive names (e.g., `PencilEdit01Icon` for edit)

### Common Icon Mappings from Lucide

| Lucide Icon | Huge Icons Equivalent | Usage |
|-------------|----------------------|-------|
| `ChevronRight` | `ChevronRightIcon` | Navigation arrows |
| `ChevronDown` | `ChevronDownIcon` | Dropdowns |
| `ChevronUp` | `ChevronUpIcon` | Collapse/expand |
| `ChevronLeft` | `ChevronLeftIcon` | Back navigation |
| `X` | `Cancel01Icon` | Close buttons |
| `Check` | `Tick01Icon` | Checkmarks |
| `CheckCircle` | `TickDouble02Icon` | Success states |
| `AlertCircle` | `AlertCircleIcon` | Alerts/warnings |
| `Info` | `InformationCircleIcon` | Information |
| `Plus` | `Add01Icon` | Add actions |
| `Trash2` | `Delete02Icon` | Delete actions |
| `Edit` | `PencilEdit01Icon` | Edit actions |
| `Search` | `Search01Icon` | Search |
| `Settings` | `Settings01Icon` | Settings |
| `User` | `User01Icon` | User profile |
| `Calendar` | `Calendar01Icon` | Calendar/dates |
| `Clock` | `Clock01Icon` | Time |
| `DollarSign` | `DollarCircleIcon` | Currency |
| `Upload` | `Upload01Icon` | Upload |
| `Download` | `Download01Icon` | Download |
| `ExternalLink` | `ExternalLinkIcon` | External links |
| `Eye` | `View01Icon` | Visibility |
| `EyeOff` | `ViewOff01Icon` | Hidden |
| `Lock` | `Lock01Icon` | Locked state |
| `Unlock` | `Unlock01Icon` | Unlocked state |
| `Loader2` | `Loading01Icon` | Loading spinner |
| `RefreshCw` | `Refresh01Icon` | Refresh |
| `ArrowRight` | `ArrowRight01Icon` | Arrow right |
| `ArrowLeft` | `ArrowLeft01Icon` | Arrow left |
| `ArrowUp` | `ArrowUp01Icon` | Arrow up |
| `ArrowDown` | `ArrowDown01Icon` | Arrow down |

## Size Conversion Reference

Huge Icons uses a numeric `size` prop instead of Tailwind width/height classes.

### Tailwind to Size Prop Conversion

| Tailwind Classes | Size Prop | Pixels |
|------------------|-----------|--------|
| `w-3 h-3` | `12` | 12px |
| `w-4 h-4` | `16` | 16px |
| `w-5 h-5` | `20` | 20px |
| `w-6 h-6` | `24` | 24px |
| `w-8 h-8` | `32` | 32px |
| `w-10 h-10` | `40` | 40px |
| `w-12 h-12` | `48` | 48px |

### Example Conversions

```tsx
// Before (Lucide)
<ChevronRight className="w-4 h-4" />

// After (Huge Icons)
<HugeiconsIcon icon={ChevronRightIcon} size={16} />

// Before (Lucide)
<Search className="w-6 h-6 text-gray-500" />

// After (Huge Icons)
<HugeiconsIcon icon={Search01Icon} size={24} className="text-gray-500" />
```

## Common Usage Examples

### Button with Icon

```tsx
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';

function AddButton() {
  return (
    <button className="flex items-center gap-2">
      <HugeiconsIcon icon={Add01Icon} size={16} />
      <span>Add Item</span>
    </button>
  );
}
```

### Icon Button

```tsx
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-2 hover:bg-gray-100 rounded"
      aria-label="Close"
    >
      <HugeiconsIcon icon={Cancel01Icon} size={20} />
    </button>
  );
}
```

### Navigation with Icons

```tsx
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronRightIcon } from '@hugeicons/core-free-icons';

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-2">
      <a href="/">Home</a>
      <HugeiconsIcon icon={ChevronRightIcon} size={16} className="text-gray-400" />
      <a href="/products">Products</a>
      <HugeiconsIcon icon={ChevronRightIcon} size={16} className="text-gray-400" />
      <span>Details</span>
    </nav>
  );
}
```

### Dropdown Indicator

```tsx
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronDownIcon } from '@hugeicons/core-free-icons';

function Dropdown({ isOpen }: { isOpen: boolean }) {
  return (
    <button className="flex items-center gap-2">
      <span>Select Option</span>
      <HugeiconsIcon 
        icon={ChevronDownIcon} 
        size={16}
        className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );
}
```

### Status Indicators

```tsx
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick01Icon, Cancel01Icon, Loading01Icon } from '@hugeicons/core-free-icons';

function StatusIcon({ status }: { status: 'success' | 'error' | 'loading' }) {
  const iconMap = {
    success: { icon: Tick01Icon, className: 'text-green-500' },
    error: { icon: Cancel01Icon, className: 'text-red-500' },
    loading: { icon: Loading01Icon, className: 'text-blue-500 animate-spin' },
  };

  const { icon, className } = iconMap[status];

  return <HugeiconsIcon icon={icon} size={20} className={className} />;
}
```

### Search Input

```tsx
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon } from '@hugeicons/core-free-icons';

function SearchInput() {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <HugeiconsIcon icon={Search01Icon} size={20} className="text-gray-400" />
      </div>
      <input
        type="text"
        placeholder="Search..."
        className="pl-10 pr-4 py-2 border rounded-lg"
      />
    </div>
  );
}
```

### Card Actions

```tsx
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit01Icon, Delete02Icon, View01Icon } from '@hugeicons/core-free-icons';

function CardActions() {
  return (
    <div className="flex gap-2">
      <button className="p-2 hover:bg-gray-100 rounded" aria-label="View">
        <HugeiconsIcon icon={View01Icon} size={18} />
      </button>
      <button className="p-2 hover:bg-gray-100 rounded" aria-label="Edit">
        <HugeiconsIcon icon={PencilEdit01Icon} size={18} />
      </button>
      <button className="p-2 hover:bg-red-100 rounded" aria-label="Delete">
        <HugeiconsIcon icon={Delete02Icon} size={18} className="text-red-600" />
      </button>
    </div>
  );
}
```

## Props and Styling

### Available Props

```typescript
interface HugeiconsIconProps {
  icon: IconSvgElement;        // Required: The icon data
  size?: number;               // Optional: Icon size in pixels (default: 24)
  className?: string;          // Optional: CSS classes
  color?: string;              // Optional: Icon color
  strokeWidth?: number;        // Optional: Stroke width
  style?: React.CSSProperties; // Optional: Inline styles
}
```

### Styling Examples

```tsx
// Using Tailwind classes
<HugeiconsIcon 
  icon={ChevronRightIcon} 
  className="text-blue-500 hover:text-blue-700"
/>

// Using inline color
<HugeiconsIcon 
  icon={ChevronRightIcon} 
  color="#3B82F6"
/>

// Using inline styles
<HugeiconsIcon 
  icon={ChevronRightIcon} 
  style={{ color: '#3B82F6', cursor: 'pointer' }}
/>

// Custom stroke width
<HugeiconsIcon 
  icon={ChevronRightIcon} 
  strokeWidth={2}
/>
```

## Best Practices

### 1. Import Only What You Need

```tsx
// ✅ Good: Import only the icons you use
import { ChevronRightIcon, Cancel01Icon } from '@hugeicons/core-free-icons';

// ❌ Avoid: Don't import everything
import * as Icons from '@hugeicons/core-free-icons';
```

### 2. Use Consistent Sizing

```tsx
// ✅ Good: Use consistent sizes across similar UI elements
const ICON_SIZES = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

<HugeiconsIcon icon={ChevronRightIcon} size={ICON_SIZES.md} />
```

### 3. Provide Accessibility

```tsx
// ✅ Good: Add aria-label for icon-only buttons
<button aria-label="Close dialog">
  <HugeiconsIcon icon={Cancel01Icon} size={20} />
</button>

// ✅ Good: Use aria-hidden for decorative icons
<div>
  <HugeiconsIcon icon={ChevronRightIcon} size={16} aria-hidden="true" />
  <span>Next</span>
</div>
```

### 4. Use Semantic Color Classes

```tsx
// ✅ Good: Use semantic color classes
<HugeiconsIcon 
  icon={AlertCircleIcon} 
  className="text-red-500" // Error state
/>

<HugeiconsIcon 
  icon={Tick01Icon} 
  className="text-green-500" // Success state
/>
```

### 5. Optimize for Performance

```tsx
// ✅ Good: Memoize icon components in lists
const IconButton = React.memo(({ icon, onClick }) => (
  <button onClick={onClick}>
    <HugeiconsIcon icon={icon} size={20} />
  </button>
));
```

### 6. Type Safety

```tsx
// ✅ Good: Use TypeScript for icon props
import type { IconSvgElement } from '@hugeicons/core-free-icons';

interface IconButtonProps {
  icon: IconSvgElement;
  label: string;
  onClick: () => void;
}

function IconButton({ icon, label, onClick }: IconButtonProps) {
  return (
    <button onClick={onClick} aria-label={label}>
      <HugeiconsIcon icon={icon} size={20} />
    </button>
  );
}
```

## Finding Icons

To find available icons:

1. Visit [Huge Icons website](https://hugeicons.com/)
2. Search for the icon you need
3. Check if it's available in the free tier
4. Use the exact icon name with "Icon" suffix in your imports

## Troubleshooting

### Icon Not Rendering

```tsx
// ❌ Wrong: Missing icon prop
<HugeiconsIcon />

// ✅ Correct: Include icon prop
<HugeiconsIcon icon={ChevronRightIcon} />
```

### Import Errors

```tsx
// ❌ Wrong: Importing from wrong package
import { ChevronRightIcon } from '@hugeicons/react';

// ✅ Correct: Import icons from core package
import { ChevronRightIcon } from '@hugeicons/core-free-icons';
```

### Size Not Working

```tsx
// ❌ Wrong: Using Tailwind classes for size
<HugeiconsIcon icon={ChevronRightIcon} className="w-4 h-4" />

// ✅ Correct: Use size prop
<HugeiconsIcon icon={ChevronRightIcon} size={16} />

// ✅ Also correct: Combine both for flexibility
<HugeiconsIcon icon={ChevronRightIcon} size={16} className="w-4 h-4" />
```

## Migration Notes

This project was migrated from Lucide React to Huge Icons. Key differences:

1. **Component Pattern**: Single `HugeiconsIcon` wrapper instead of individual components
2. **Icon Prop**: Icons are passed as data via the `icon` prop
3. **Naming**: Icon names end with "Icon" suffix
4. **Sizing**: Use numeric `size` prop instead of Tailwind classes

For more details on the migration, see the migration spec in `.kiro/specs/lucide-to-huge-icons-migration/`.

## Resources

- [Huge Icons Documentation](https://hugeicons.com/docs)
- [Huge Icons React Integration](https://hugeicons.com/docs/integrations/react)
- [NPM Package: @hugeicons/react](https://www.npmjs.com/package/@hugeicons/react)
- [NPM Package: @hugeicons/core-free-icons](https://www.npmjs.com/package/@hugeicons/core-free-icons)
