# Design Document: Lucide to Huge Icons Migration

## Overview

This document outlines the design for migrating the entire codebase from Lucide React icons to Huge Icons. The migration will be performed systematically to ensure all icons are replaced correctly while maintaining visual consistency and functionality.

Huge Icons uses a different API pattern than Lucide React:
- **Lucide**: Individual named icon components (e.g., `<ChevronRight />`)
- **Huge Icons**: Single wrapper component with icon data (e.g., `<HugeiconsIcon icon={ChevronRightIcon} />`)

This fundamental difference requires not just import changes, but also JSX usage pattern changes throughout the codebase.

## Architecture

### Migration Strategy

The migration will follow a **file-by-file replacement strategy** with the following phases:

1. **Discovery Phase**: Scan and catalog all Lucide icon usage
2. **Mapping Phase**: Create icon name mappings between libraries
3. **Installation Phase**: Install Huge Icons packages
4. **Replacement Phase**: Replace imports and usage patterns
5. **Verification Phase**: Test and verify visual consistency
6. **Cleanup Phase**: Remove Lucide dependencies

### Package Structure

**Current (Lucide React)**:
```
lucide-react (single package with all icons)
```

**Target (Huge Icons)**:
```
@hugeicons/react (rendering component)
@hugeicons/core-free-icons (4,600+ free icons)
```

## Components and Interfaces

### Icon Discovery Service

**Purpose**: Scan codebase to identify all Lucide icon usage

**Interface**:
```typescript
interface IconUsage {
  filePath: string;
  iconNames: string[];
  lineNumbers: number[];
}

interface DiscoveryResult {
  totalFiles: number;
  totalIcons: number;
  uniqueIcons: string[];
  usageByFile: IconUsage[];
}

function discoverLucideIcons(): DiscoveryResult
```

**Implementation**:
- Use grep/ripgrep to find all files with `from 'lucide-react'`
- Parse import statements to extract icon names
- Track file paths and line numbers for each usage

### Icon Mapping Service

**Purpose**: Map Lucide icon names to Huge Icons equivalents

**Interface**:
```typescript
interface IconMapping {
  lucideName: string;
  hugeIconsName: string;
  notes?: string;
}

interface MappingResult {
  directMappings: IconMapping[];
  manualReviewNeeded: IconMapping[];
}

function createIconMapping(lucideIcons: string[]): MappingResult
```

**Mapping Strategy**:
1. **Direct matches**: Icons with identical or very similar names
2. **Semantic matches**: Icons with different names but same meaning
3. **Manual review**: Icons requiring human decision

**Common Mappings** (based on research):
- `ChevronRight` → `ChevronRightIcon`
- `ChevronDown` → `ChevronDownIcon`
- `ChevronUp` → `ChevronUpIcon`
- `X` → `Cancel01Icon` or `XCloseIcon`
- `Check` → `Tick01Icon` or `CheckmarkIcon`
- `AlertCircle` → `AlertCircleIcon`
- `Info` → `InformationCircleIcon`
- `Plus` → `Add01Icon` or `PlusSignIcon`
- `Trash2` → `Delete01Icon` or `Delete02Icon`
- `Edit` → `Edit01Icon` or `PencilEdit01Icon`

### File Replacement Service

**Purpose**: Replace Lucide imports and usage with Huge Icons

**Interface**:
```typescript
interface ReplacementConfig {
  filePath: string;
  iconMappings: IconMapping[];
}

interface ReplacementResult {
  success: boolean;
  filePath: string;
  replacedIcons: string[];
  errors?: string[];
}

function replaceIconsInFile(config: ReplacementConfig): ReplacementResult
```

**Replacement Steps**:
1. Read file content
2. Replace import statement:
   ```typescript
   // Before
   import { ChevronRight, X, Check } from 'lucide-react';
   
   // After
   import { HugeiconsIcon } from '@hugeicons/react';
   import { ChevronRightIcon, Cancel01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
   ```

3. Replace JSX usage:
   ```typescript
   // Before
   <ChevronRight className="w-4 h-4" />
   
   // After
   <HugeiconsIcon icon={ChevronRightIcon} size={16} className="w-4 h-4" />
   ```

4. Handle props transformation:
   - `className` → preserved as-is
   - Size from Tailwind classes → extract and use `size` prop
   - `color` → preserved as-is
   - `strokeWidth` → preserved as-is

## Data Models

### Icon Usage Record

```typescript
interface IconUsageRecord {
  id: string;
  filePath: string;
  iconName: string;
  lineNumber: number;
  context: string; // surrounding code
  replaced: boolean;
  verifiedVisually: boolean;
}
```

### Migration Progress

```typescript
interface MigrationProgress {
  totalFiles: number;
  filesProcessed: number;
  totalIcons: number;
  iconsReplaced: number;
  errors: string[];
  warnings: string[];
  startTime: Date;
  endTime?: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified the following properties and their relationships:

**Redundancy Analysis**:
1. Properties 1.1-1.4 (scanning and discovery) can be combined into comprehensive discovery properties
2. Properties 3.1-3.4 (import replacement) overlap significantly and can be consolidated
3. Properties 4.1-4.3 and 5.1-5.4 (JSX and props transformation) have overlapping concerns about prop handling
4. Properties 6.1-6.2 (type updates) can be combined into a single type transformation property
5. Properties 9.1-9.4 (documentation) are all examples of documentation creation, not properties

**Consolidated Properties**:
- Discovery properties → Single comprehensive discovery property
- Import replacement properties → Single import transformation property  
- JSX and props properties → Single JSX transformation property with prop preservation
- Type properties → Single type transformation property
- Build verification → Keep as examples since they're one-time checks

### Correctness Properties

Property 1: Complete Icon Discovery
*For any* codebase with Lucide React imports, the discovery process should identify all files containing Lucide imports, extract all unique icon names, and correctly count the total number of icon usages without missing any instances.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

Property 2: Import Statement Transformation
*For any* file containing Lucide React imports, the replacement process should transform the imports to use @hugeicons/react and @hugeicons/core-free-icons packages while preserving all non-Lucide imports unchanged and maintaining the named import structure.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 3: JSX Component Transformation with Prop Preservation
*For any* JSX element using a Lucide icon component, the transformation should convert it to use HugeiconsIcon wrapper with the correct icon prop, preserve all original props (className, color, strokeWidth), and transform size-related props appropriately.
**Validates: Requirements 4.1, 4.2, 4.3, 5.2, 5.3, 5.4**

Property 4: TypeScript Type Transformation
*For any* TypeScript file using LucideIcon type or icon-related interfaces, the transformation should replace these with equivalent Huge Icons types while maintaining type safety and strict type checking.
**Validates: Requirements 6.1, 6.2**

Property 5: Documentation Reference Updates
*For any* documentation file referencing Lucide React, the update process should replace these references with Huge Icons equivalents while preserving the document structure and other content.
**Validates: Requirements 9.1**

## Error Handling

### Error Categories

1. **File System Errors**
   - File not found
   - Permission denied
   - File read/write failures
   - **Handling**: Log error, skip file, continue with others, report at end

2. **Parsing Errors**
   - Invalid TypeScript/TSX syntax
   - Malformed import statements
   - **Handling**: Log error, skip file, flag for manual review

3. **Mapping Errors**
   - Icon not found in Huge Icons
   - Ambiguous icon mapping
   - **Handling**: Use fallback icon, log warning, flag for manual review

4. **Transformation Errors**
   - Complex JSX patterns that can't be automatically transformed
   - Dynamic icon usage (icon name from variable)
   - **Handling**: Log error, skip transformation, flag for manual review

5. **Build Errors**
   - TypeScript compilation failures
   - Missing dependencies
   - Import resolution failures
   - **Handling**: Report errors, provide fix suggestions, halt if critical

### Error Recovery Strategy

```typescript
interface ErrorHandler {
  onFileError(filePath: string, error: Error): void;
  onParsingError(filePath: string, line: number, error: Error): void;
  onMappingError(iconName: string, error: Error): void;
  onTransformationError(filePath: string, context: string, error: Error): void;
  onBuildError(error: Error): void;
  
  getErrorReport(): ErrorReport;
}

interface ErrorReport {
  totalErrors: number;
  errorsByCategory: Map<string, number>;
  filesNeedingManualReview: string[];
  criticalErrors: Error[];
  warnings: string[];
}
```

**Recovery Actions**:
- Non-critical errors: Continue processing, collect for report
- Critical errors: Stop processing, report immediately
- Warnings: Log but don't stop processing
- Manual review queue: Collect files that need human intervention

## Testing Strategy

### Dual Testing Approach

This migration will use both **unit tests** and **property-based tests** to ensure correctness:

**Unit Tests** will verify:
- Specific example transformations work correctly
- Edge cases like empty files, files with no icons
- Error conditions like invalid syntax
- Integration between components
- Build process succeeds after migration

**Property-Based Tests** will verify:
- Universal properties hold across all inputs
- Transformation correctness for any valid input
- No data loss during transformation
- Idempotency of transformations

Both testing approaches are complementary and necessary for comprehensive coverage.

### Property-Based Testing Configuration

- **Library**: fast-check (for TypeScript/JavaScript)
- **Minimum iterations**: 100 per property test
- **Test tagging**: Each property test must reference its design document property
- **Tag format**: `// Feature: lucide-to-huge-icons-migration, Property {number}: {property_text}`

### Test Cases

#### Unit Tests

1. **Discovery Tests**
   - Test scanning a directory with known Lucide imports
   - Test extracting icon names from various import patterns
   - Test counting icon usages in sample files
   - Test handling files with no Lucide imports

2. **Mapping Tests**
   - Test direct icon name mappings (ChevronRight → ChevronRightIcon)
   - Test common icon mappings (X → Cancel01Icon)
   - Test handling unknown icons

3. **Import Replacement Tests**
   - Test replacing simple import statements
   - Test preserving other imports
   - Test handling multiple icon imports
   - Test handling aliased imports

4. **JSX Transformation Tests**
   - Test transforming simple icon usage: `<ChevronRight />` → `<HugeiconsIcon icon={ChevronRightIcon} />`
   - Test preserving className props
   - Test transforming size props
   - Test handling icons with multiple props

5. **Type Transformation Tests**
   - Test replacing LucideIcon type
   - Test updating icon prop interfaces
   - Test maintaining type safety

6. **Build Verification Tests**
   - Test that transformed code compiles
   - Test that ESLint passes
   - Test that imports resolve

#### Property-Based Tests

1. **Property 1 Test: Complete Icon Discovery**
   ```typescript
   // Feature: lucide-to-huge-icons-migration, Property 1: Complete Icon Discovery
   test('discovers all Lucide icons in any codebase structure', () => {
     // Generate random file structures with Lucide imports
     // Verify all icons are discovered
     // Verify counts are accurate
   });
   ```

2. **Property 2 Test: Import Statement Transformation**
   ```typescript
   // Feature: lucide-to-huge-icons-migration, Property 2: Import Statement Transformation
   test('transforms any Lucide import to Huge Icons correctly', () => {
     // Generate random import statements
     // Verify transformation is correct
     // Verify other imports are preserved
   });
   ```

3. **Property 3 Test: JSX Component Transformation with Prop Preservation**
   ```typescript
   // Feature: lucide-to-huge-icons-migration, Property 3: JSX Component Transformation with Prop Preservation
   test('transforms any Lucide JSX usage while preserving props', () => {
     // Generate random JSX with Lucide icons
     // Verify transformation to HugeiconsIcon
     // Verify all props are preserved
   });
   ```

4. **Property 4 Test: TypeScript Type Transformation**
   ```typescript
   // Feature: lucide-to-huge-icons-migration, Property 4: TypeScript Type Transformation
   test('transforms any LucideIcon type usage correctly', () => {
     // Generate random TypeScript with LucideIcon types
     // Verify transformation to Huge Icons types
     // Verify type safety is maintained
   });
   ```

5. **Property 5 Test: Documentation Reference Updates**
   ```typescript
   // Feature: lucide-to-huge-icons-migration, Property 5: Documentation Reference Updates
   test('updates any Lucide reference in documentation', () => {
     // Generate random documentation with Lucide references
     // Verify references are updated
     // Verify document structure is preserved
   });
   ```

### Manual Verification Checklist

After automated migration, manually verify:
- [ ] Icons render correctly in the browser
- [ ] Icon sizes match the original design
- [ ] Icon colors are correct
- [ ] Icon spacing and alignment are preserved
- [ ] Hover states work correctly
- [ ] Click handlers still work
- [ ] Accessibility attributes are preserved
- [ ] Dark mode icons work correctly
- [ ] Responsive behavior is maintained

## Implementation Notes

### Icon Name Mapping Reference

Based on research and common patterns, here are key mappings:

| Lucide Icon | Huge Icons Equivalent | Notes |
|-------------|----------------------|-------|
| ChevronRight | ChevronRightIcon | Direct match |
| ChevronDown | ChevronDownIcon | Direct match |
| ChevronUp | ChevronUpIcon | Direct match |
| ChevronLeft | ChevronLeftIcon | Direct match |
| X | Cancel01Icon | Close/cancel action |
| Check | Tick01Icon | Checkmark |
| CheckCircle | TickDouble02Icon | Completed state |
| AlertCircle | AlertCircleIcon | Direct match |
| Info | InformationCircleIcon | Information |
| Plus | Add01Icon | Add action |
| Trash2 | Delete02Icon | Delete action |
| Edit | PencilEdit01Icon | Edit action |
| Search | Search01Icon | Search |
| Settings | Settings01Icon | Settings |
| User | User01Icon | User profile |
| Calendar | Calendar01Icon | Calendar |
| Clock | Clock01Icon | Time |
| DollarSign | DollarCircleIcon | Currency |
| Upload | Upload01Icon | Upload |
| Download | Download01Icon | Download |
| ExternalLink | ExternalLinkIcon | External link |
| Eye | View01Icon | View/visibility |
| EyeOff | ViewOff01Icon | Hidden |
| Lock | Lock01Icon | Locked |
| Unlock | Unlock01Icon | Unlocked |
| Loader2 | Loading01Icon | Loading spinner |
| RefreshCw | Refresh01Icon | Refresh |
| ArrowRight | ArrowRight01Icon | Arrow right |
| ArrowLeft | ArrowLeft01Icon | Arrow left |
| ArrowUp | ArrowUp01Icon | Arrow up |
| ArrowDown | ArrowDown01Icon | Arrow down |

### Size Conversion

Lucide uses Tailwind classes for sizing (w-4, h-4), while Huge Icons uses a `size` prop:

| Tailwind Class | Huge Icons Size |
|----------------|-----------------|
| w-3 h-3 | 12 |
| w-4 h-4 | 16 |
| w-5 h-5 | 20 |
| w-6 h-6 | 24 |
| w-8 h-8 | 32 |

### Migration Order

1. Install Huge Icons packages
2. Create icon mapping document
3. Start with utility components (buttons, inputs)
4. Move to layout components (headers, sidebars)
5. Migrate page components
6. Update admin components
7. Remove Lucide dependency
8. Run full build and test

### Rollback Strategy

If migration fails:
1. Revert all file changes using git
2. Remove Huge Icons packages
3. Reinstall Lucide React
4. Analyze failures and adjust strategy
5. Retry with improved approach

## References

- [Huge Icons React Documentation](https://hugeicons.com/docs/integrations/react)
- [Huge Icons NPM Package](https://www.npmjs.com/package/@hugeicons/react)
- [Lucide React Documentation](https://lucide.dev/guide/packages/lucide-react)
