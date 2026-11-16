# Implementation Plan: Lucide to Huge Icons Migration

## Overview

This implementation plan breaks down the migration from Lucide React to Huge Icons into discrete, manageable tasks. Each task builds on previous work and includes verification steps to ensure correctness. The migration follows a systematic approach: install dependencies, create tooling, migrate files, verify, and clean up.

**Current Status:** 91 files in the `src` directory currently use Lucide React icons. Huge Icons packages are not yet installed. No migration tooling exists yet.

## Tasks

- [x] 1. Install Huge Icons packages and update dependencies
  - Install @hugeicons/react and @hugeicons/core-free-icons packages via bun
  - Verify packages are installed in node_modules
  - Do NOT remove lucide-react yet (will be removed at the end)
  - _Requirements: 7.1, 7.3, 7.4_

- [-] 2. Create icon discovery and analysis script
  - [x] 2.1 Create scripts/icon-discovery.ts to scan codebase for Lucide usage
    - Scan all TypeScript/TSX files in src directory for 'from lucide-react' imports
    - Parse import statements to extract icon names (handle single, multiple, aliased imports)
    - Count total occurrences of each icon in JSX usage
    - Generate JSON report with: file paths, icon names, usage counts, line numbers
    - Output summary statistics (total files, total icons, unique icons)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 2.2 Write property test for icon discovery
    - **Property 1: Complete Icon Discovery**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 3. Create icon mapping configuration
  - [x] 3.1 Create scripts/icon-mapping.ts with Lucide to Huge Icons mappings
    - Use the mapping reference table from design document
    - Create TypeScript mapping object/JSON file with icon name pairs
    - Include common mappings (ChevronRight → ChevronRightIcon, X → Cancel01Icon, etc.)
    - Flag icons that may need manual review (add notes field)
    - Export function to look up Huge Icons equivalent for any Lucide icon
    - _Requirements: 2.1, 2.2, 2.3_

- [-] 4. Create automated migration script
  - [x] 4.1 Create scripts/migrate-icons.ts with core transformation logic
    - Implement function to transform Lucide imports to Huge Icons imports
      - Parse existing import statement and extract icon names
      - Generate: `import { HugeiconsIcon } from '@hugeicons/react'`
      - Generate: `import { IconName1, IconName2 } from '@hugeicons/core-free-icons'`
      - Preserve other non-Lucide imports in the file
    - Implement function to transform JSX usage
      - Find all JSX elements using Lucide icons (e.g., `<ChevronRight />`)
      - Transform to: `<HugeiconsIcon icon={ChevronRightIcon} />`
      - Extract and preserve all props (className, color, strokeWidth, etc.)
      - Transform size props from Tailwind classes to size prop when possible
    - Implement function to transform TypeScript types
      - Find LucideIcon type references
      - Replace with appropriate Huge Icons type (IconSvgElement)
    - Add error handling for edge cases
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.2, 5.3, 5.4, 6.1, 6.2_

  - [ ]* 4.2 Write property test for import transformation
    - **Property 2: Import Statement Transformation**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 4.3 Write property test for JSX transformation with prop preservation
    - **Property 3: JSX Component Transformation with Prop Preservation**
    - **Validates: Requirements 4.1, 4.2, 4.3, 5.2, 5.3, 5.4**

  - [ ]* 4.4 Write property test for type transformation
    - **Property 4: TypeScript Type Transformation**
    - **Validates: Requirements 6.1, 6.2**

- [x] 5. Run discovery script and review findings
  - Execute scripts/icon-discovery.ts to analyze current Lucide usage
  - Review generated report for icon usage patterns
  - Identify any icons that may need special handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6. Checkpoint - Review migration plan
  - Ensure discovery script ran successfully
  - Review icon mappings for completeness
  - Ask the user if questions arise about specific icon mappings

- [x] 7. Migrate UI component files (src/components/ui)
  - [x] 7.1 Run migration script on src/components/ui directory
    - Execute scripts/migrate-icons.ts on all files in src/components/ui
    - Log all transformations and any errors
    - Collect files that need manual review
    - _Requirements: 3.1, 4.1, 6.1_

  - [x] 7.2 Review and fix any migration errors in UI components
    - Address any files flagged for manual review
    - Fix any transformation errors
    - Verify imports are correct
    - _Requirements: 3.1, 4.1_

- [x] 8. Migrate general component files (src/components, excluding admin)
  - [x] 8.1 Run migration script on src/components directory (non-admin files)
    - Execute scripts/migrate-icons.ts on component files
    - Skip src/components/admin for now
    - Log all transformations and any errors
    - _Requirements: 3.1, 4.1_

  - [x] 8.2 Review and fix any migration errors in general components
    - Address any files flagged for manual review
    - Fix any transformation errors
    - Fixed Chevron icon mappings (Chevron icons don't exist in Huge Icons, mapped to Arrow icons)
    - Re-migrated 10 files with correct icon mappings
    - _Requirements: 3.1, 4.1_

- [x] 9. Checkpoint - Verify component migrations
  - Run TypeScript compiler to check for type errors
  - Ensure all tests pass, ask the user if questions arise

- [x] 10. Migrate admin component files (src/components/admin)
  - [x] 10.1 Run migration script on src/components/admin directory
    - Execute scripts/migrate-icons.ts on all admin component files
    - Log all transformations and any errors
    - _Requirements: 3.1, 4.1_

  - [x] 10.2 Review and fix any migration errors in admin components
    - Address any files flagged for manual review
    - Fix any transformation errors
    - _Requirements: 3.1, 4.1_

- [x] 11. Migrate page and hook files
  - [x] 11.1 Run migration script on src/app directory
    - Execute scripts/migrate-icons.ts on all page files
    - Log all transformations and any errors
    - _Requirements: 3.1, 4.1_

  - [x] 11.2 Run migration script on src/hooks directory
    - Execute scripts/migrate-icons.ts on all hook files
    - Log all transformations and any errors
    - _Requirements: 3.1, 4.1_

  - [x] 11.3 Review and fix any migration errors in pages and hooks
    - Address any files flagged for manual review
    - Fix any transformation errors
    - _Requirements: 3.1, 4.1_

- [x] 12. Verify build and type checking
  - [x] 12.1 Run TypeScript compiler to verify no type errors
    - Execute: npm run build or tsc --noEmit
    - Review and fix any type errors that appear
    - _Requirements: 10.1, 6.3_

  - [x] 12.2 Run ESLint to verify no linting errors
    - Execute: npm run lint
    - Fix any icon-related linting errors
    - _Requirements: 10.2_

  - [x] 12.3 Verify all imports resolve correctly
    - Run build process: npm run build
    - Check for import resolution errors
    - Verify all Huge Icons imports are found
    - _Requirements: 10.3_

  - [ ]* 12.4 Write unit tests for build verification
    - Test that build succeeds
    - Test that no runtime errors occur
    - _Requirements: 10.1, 10.4_

- [x] 13. Update documentation
  - [x] 13.1 Create docs/HUGE_ICONS_USAGE.md with usage guidelines
    - Document how to import and use Huge Icons
    - Provide common usage examples
    - Document icon naming conventions
    - Include size conversion reference
    - _Requirements: 9.2, 9.3, 9.4_

  - [x] 13.2 Update existing documentation that references Lucide
    - Search for Lucide references in docs directory
    - Replace with Huge Icons equivalents
    - Update code examples
    - _Requirements: 9.1_

  - [ ]* 13.3 Write property test for documentation updates
    - **Property 5: Documentation Reference Updates**
    - **Validates: Requirements 9.1**

- [x] 14. Create visual verification checklist
  - Generate checklist of all migrated components
  - List icons that may need size adjustments
  - Provide manual testing instructions for key UI areas
  - _Requirements: 8.3_

- [x] 15. Remove Lucide React dependency
  - [x] 15.1 Verify no remaining Lucide imports in codebase
    - Search for any remaining 'lucide-react' references in src directory
    - Fix any remaining usages
    - _Requirements: 10.3_

  - [x] 15.2 Remove lucide-react from package.json
    - Edit package.json to remove lucide-react dependency
    - Run package manager to update lock file: npm install or pnpm install
    - _Requirements: 7.2_

- [-] 16. Final checkpoint - Complete migration verification
  - Run full build and verify success: npm run build
  - Run all tests: npm test
  - Review error report and manual review queue
  - Confirm visual verification checklist is complete
  - Ask the user to perform manual visual testing of key UI areas

## Notes

- Tasks marked with `*` are optional and can be skipped for faster migration
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Manual visual verification is required after automated migration
- Keep git commits small and focused for easy rollback if needed
