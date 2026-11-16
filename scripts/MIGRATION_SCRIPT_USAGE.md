# Icon Migration Script Usage

## Overview

The `migrate-icons.ts` script automatically transforms Lucide React icon usage to Huge Icons throughout your codebase.

## Features

- ✅ Transforms Lucide imports to Huge Icons imports
- ✅ Converts JSX usage from `<IconName />` to `<HugeiconsIcon icon={IconNameIcon} />`
- ✅ Preserves all props (className, color, strokeWidth, etc.)
- ✅ Extracts size from Tailwind classes (w-4 h-4 → size={16})
- ✅ Transforms TypeScript types (LucideIcon → React.ComponentType<any>)
- ✅ Handles multi-line props
- ✅ Provides detailed reporting

## Usage

### Basic Usage

```bash
# Migrate all files in src directory (dry run)
npx tsx scripts/migrate-icons.ts src --dry-run

# Migrate all files in src directory (live)
npx tsx scripts/migrate-icons.ts src

# Migrate specific directory with verbose output
npx tsx scripts/migrate-icons.ts src/components --verbose
```

### Command Line Options

- `--dry-run` - Preview changes without modifying files
- `--verbose` or `-v` - Show detailed progress for each file

### Examples

```bash
# Preview migration for UI components
npx tsx scripts/migrate-icons.ts src/components/ui --dry-run --verbose

# Migrate admin components
npx tsx scripts/migrate-icons.ts src/components/admin

# Migrate entire src directory
npx tsx scripts/migrate-icons.ts src
```

## Transformation Examples

### Import Transformation

**Before:**
```tsx
import { ChevronRight, X, Check } from 'lucide-react';
```

**After:**
```tsx
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronRightIcon, Cancel01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
```

### JSX Transformation

**Before:**
```tsx
<ChevronRight className="w-4 h-4 text-gray-500" />
```

**After:**
```tsx
<HugeiconsIcon icon={ChevronRightIcon} size={16} className="text-gray-500" />
```

### Props Preservation

**Before:**
```tsx
<AlertCircle className="w-6 h-6" color="red" strokeWidth={2} />
```

**After:**
```tsx
<HugeiconsIcon icon={AlertCircleIcon} size={24} color="red" strokeWidth={2} />
```

### Type Transformation

**Before:**
```tsx
interface Props {
  icon: LucideIcon;
}
```

**After:**
```tsx
interface Props {
  icon: React.ComponentType<any>;
}
```

## Output Report

The script provides a detailed report including:

- Total files processed
- Successful transformations
- Skipped files (no Lucide imports)
- Failed files (with error details)
- Total icons replaced
- Warnings (unmapped icons, etc.)
- Files needing manual review

## Error Handling

The script handles various edge cases:

- **Unmapped icons**: Icons without a mapping are logged as warnings
- **Parse errors**: Files with syntax errors are skipped and logged
- **File system errors**: Permission issues are caught and reported
- **Complex JSX**: Multi-line props and nested expressions are handled

## Manual Review

Files with unmapped icons will be flagged for manual review. Check the report for:

```
🔍 Files needing manual review: 3
  - src/components/example.tsx
```

## Programmatic Usage

You can also use the script programmatically:

```typescript
import { transformFile, migrateDirectory, printReport } from './scripts/migrate-icons';

// Transform a single file
const result = transformFile('src/components/example.tsx');
console.log(result.replacedIcons);

// Migrate a directory
const report = migrateDirectory('src/components', { 
  dryRun: false, 
  verbose: true 
});
printReport(report);
```

## Best Practices

1. **Always run with --dry-run first** to preview changes
2. **Use version control** - commit before running live migration
3. **Migrate incrementally** - start with small directories
4. **Review warnings** - check files with unmapped icons
5. **Test after migration** - run TypeScript compiler and tests
6. **Check visual output** - verify icons render correctly

## Troubleshooting

### Icons not transforming

- Check if icon has a mapping in `scripts/icon-mapping.ts`
- Verify import statement format matches expected pattern
- Run with `--verbose` to see detailed processing

### TypeScript errors after migration

- Ensure `@hugeicons/react` and `@hugeicons/core-free-icons` are installed
- Check that all icon names are correctly mapped
- Verify import statements are valid

### Visual differences

- Some icons may need size adjustments
- Check the design document for size conversion reference
- Review className props for any size-related classes
