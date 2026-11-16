/**
 * Icon Migration Script
 * Transforms Lucide React icon usage to Huge Icons
 * 
 * This script performs the following transformations:
 * 1. Replaces Lucide imports with Huge Icons imports
 * 2. Transforms JSX usage from <IconName /> to <HugeiconsIcon icon={IconNameIcon} />
 * 3. Preserves all props (className, color, strokeWidth, etc.)
 * 4. Transforms TypeScript types from LucideIcon to IconSvgElement
 */

import * as fs from 'fs';
import * as path from 'path';
import { getHugeIconsName, hasMapping } from './icon-mapping';

interface TransformResult {
  success: boolean;
  filePath: string;
  originalContent: string;
  transformedContent: string;
  replacedIcons: string[];
  errors: string[];
  warnings: string[];
  skipped: boolean;
  skipReason?: string;
}

interface MigrationReport {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  skippedFiles: number;
  totalIconsReplaced: number;
  errors: Array<{ file: string; error: string }>;
  warnings: Array<{ file: string; warning: string }>;
  filesNeedingManualReview: string[];
}

/**
 * Extract icon names from a Lucide import statement
 * Handles: import { Icon1, Icon2 as Alias, Icon3 } from 'lucide-react'
 */
function extractLucideIcons(importLine: string): string[] {
  const iconNames: string[] = [];
  
  // Match the content between curly braces
  const match = importLine.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  
  if (match) {
    const imports = match[1];
    // Split by comma and process each import
    const importParts = imports.split(',');
    
    importParts.forEach((part) => {
      const trimmed = part.trim();
      // Handle aliased imports (Icon as Alias) - we only care about the original name
      if (trimmed.includes(' as ')) {
        const [originalName] = trimmed.split(' as ');
        iconNames.push(originalName.trim());
      } else if (trimmed.includes(' type ')) {
        // Skip type imports like "type LucideIcon"
        return;
      } else {
        iconNames.push(trimmed);
      }
    });
  }
  
  return iconNames;
}

/**
 * Transform Lucide import statement to Huge Icons imports
 * 
 * Before:
 *   import { ChevronRight, X, Check } from 'lucide-react';
 * 
 * After:
 *   import { HugeiconsIcon } from '@hugeicons/react';
 *   import { ChevronRightIcon, Cancel01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
 */
function transformImports(content: string, lucideIcons: string[]): {
  content: string;
  mappedIcons: Map<string, string>;
  unmappedIcons: string[];
} {
  const mappedIcons = new Map<string, string>();
  const unmappedIcons: string[] = [];
  const hugeIconNames: string[] = [];
  
  // Map each Lucide icon to its Huge Icons equivalent
  lucideIcons.forEach((lucideIcon) => {
    const hugeIconName = getHugeIconsName(lucideIcon);
    if (hugeIconName) {
      mappedIcons.set(lucideIcon, hugeIconName);
      hugeIconNames.push(hugeIconName);
    } else {
      unmappedIcons.push(lucideIcon);
    }
  });
  
  // Find and replace the Lucide import line
  const lucideImportRegex = /import\s*\{[^}]+\}\s*from\s*['"]lucide-react['"];?\s*\n?/g;
  
  let newContent = content;
  
  if (hugeIconNames.length > 0) {
    // Create new import statements
    const hugeIconsImport = `import { HugeiconsIcon } from '@hugeicons/react';\n`;
    const coreIconsImport = `import { ${hugeIconNames.join(', ')} } from '@hugeicons/core-free-icons';\n`;
    
    // Replace Lucide import with Huge Icons imports
    newContent = newContent.replace(lucideImportRegex, hugeIconsImport + coreIconsImport);
  }
  
  return {
    content: newContent,
    mappedIcons,
    unmappedIcons,
  };
}

/**
 * Extract size from Tailwind classes (w-4 h-4 -> 16)
 */
function extractSizeFromClasses(className: string): number | null {
  // Match patterns like w-4, w-5, etc.
  const sizeMatch = className.match(/w-(\d+)/);
  if (sizeMatch) {
    const tailwindSize = parseInt(sizeMatch[1]);
    // Convert Tailwind size to pixels (Tailwind uses 0.25rem per unit, 1rem = 16px)
    return tailwindSize * 4;
  }
  return null;
}

/**
 * Transform JSX usage of Lucide icons to Huge Icons
 * 
 * Before:
 *   <ChevronRight className="w-4 h-4 text-gray-500" />
 * 
 * After:
 *   <HugeiconsIcon icon={ChevronRightIcon} size={16} className="text-gray-500" />
 */
function transformJSXUsage(
  content: string,
  mappedIcons: Map<string, string>
): string {
  let newContent = content;
  
  mappedIcons.forEach((hugeIconName, lucideIconName) => {
    // Match JSX usage patterns:
    // 1. Self-closing: <IconName />
    // 2. Self-closing with props: <IconName className="..." />
    // 3. With children: <IconName>...</IconName> (rare for icons)
    
    // Pattern to match icon usage with optional props
    const iconRegex = new RegExp(
      `<${lucideIconName}([^>]*?)\\s*\\/?>`,
      'g'
    );
    
    newContent = newContent.replace(iconRegex, (match, propsString) => {
      // Extract props - normalize whitespace for easier parsing
      const props = propsString.replace(/\s+/g, ' ').trim();
      
      if (!props) {
        // No props, simple replacement
        return `<HugeiconsIcon icon={${hugeIconName}} />`;
      }
      
      // Parse all props
      const propMap = new Map<string, string>();
      
      // Match all prop patterns: propName="value" or propName={value}
      // This regex handles both quoted strings and brace expressions
      const propRegex = /(\w+)=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g;
      let propMatch;
      
      while ((propMatch = propRegex.exec(props)) !== null) {
        const [, propName, doubleQuoted, singleQuoted, braced] = propMatch;
        const propValue = doubleQuoted || singleQuoted || braced;
        
        // Store with appropriate wrapper
        if (braced !== undefined) {
          propMap.set(propName, `{${propValue}}`);
        } else {
          propMap.set(propName, `"${propValue}"`);
        }
      }
      
      // Extract className and handle size
      let className = propMap.get('className') || '';
      // Remove quotes from className value for processing
      className = className.replace(/^["']|["']$/g, '');
      const size = extractSizeFromClasses(className);
      
      // Remove size classes from className if we extracted a size
      if (size && className) {
        className = className.replace(/\s*w-\d+\s*/g, ' ').replace(/\s*h-\d+\s*/g, ' ').trim();
      }
      
      // Build new props array
      const newProps: string[] = [];
      newProps.push(`icon={${hugeIconName}}`);
      
      if (size) {
        newProps.push(`size={${size}}`);
      }
      
      // Add all other props (excluding className, we'll add it back)
      propMap.forEach((value, key) => {
        if (key !== 'className') {
          newProps.push(`${key}=${value}`);
        }
      });
      
      // Add className back if it still has content
      if (className) {
        newProps.push(`className="${className}"`);
      }
      
      return `<HugeiconsIcon ${newProps.join(' ')} />`;
    });
  });
  
  return newContent;
}

/**
 * Transform TypeScript type references
 * 
 * Before:
 *   icon: LucideIcon
 *   import { LucideIcon } from 'lucide-react'
 * 
 * After:
 *   icon: React.ComponentType<any>
 *   (remove the import)
 */
function transformTypes(content: string): string {
  let newContent = content;
  
  // Remove LucideIcon from imports
  newContent = newContent.replace(
    /import\s*\{([^}]*),?\s*type\s+LucideIcon\s*,?([^}]*)\}\s*from\s*['"]lucide-react['"];?\s*\n?/g,
    (match, before, after) => {
      const beforeClean = before.trim();
      const afterClean = after.trim();
      
      if (!beforeClean && !afterClean) {
        // Only LucideIcon was imported, remove the entire line
        return '';
      }
      
      // Reconstruct import without LucideIcon
      const remaining = [beforeClean, afterClean].filter(Boolean).join(', ');
      return `import { ${remaining} } from 'lucide-react';\n`;
    }
  );
  
  // Also handle standalone type import
  newContent = newContent.replace(
    /import\s*\{\s*type\s+LucideIcon\s*\}\s*from\s*['"]lucide-react['"];?\s*\n?/g,
    ''
  );
  
  // Replace LucideIcon type usage with React.ComponentType<any>
  newContent = newContent.replace(
    /:\s*LucideIcon\b/g,
    ': React.ComponentType<any>'
  );
  
  return newContent;
}

/**
 * Transform a single file
 */
export function transformFile(filePath: string): TransformResult {
  const result: TransformResult = {
    success: false,
    filePath,
    originalContent: '',
    transformedContent: '',
    replacedIcons: [],
    errors: [],
    warnings: [],
    skipped: false,
  };
  
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    result.originalContent = content;
    
    // Check if file has Lucide imports
    if (!content.includes("from 'lucide-react'") && !content.includes('from "lucide-react"')) {
      result.skipped = true;
      result.skipReason = 'No Lucide imports found';
      result.success = true;
      return result;
    }
    
    // Extract Lucide icons from imports
    const lines = content.split('\n');
    let lucideIcons: string[] = [];
    
    for (const line of lines) {
      if (line.includes("from 'lucide-react'") || line.includes('from "lucide-react"')) {
        lucideIcons = extractLucideIcons(line);
        break;
      }
    }
    
    if (lucideIcons.length === 0) {
      result.skipped = true;
      result.skipReason = 'No icons found in import statement';
      result.success = true;
      return result;
    }
    
    // Transform imports
    const { content: contentAfterImports, mappedIcons, unmappedIcons } = transformImports(
      content,
      lucideIcons
    );
    
    // Warn about unmapped icons
    if (unmappedIcons.length > 0) {
      result.warnings.push(
        `Unmapped icons: ${unmappedIcons.join(', ')}. These will not be transformed.`
      );
    }
    
    // Transform JSX usage
    let transformedContent = transformJSXUsage(contentAfterImports, mappedIcons);
    
    // Transform TypeScript types
    transformedContent = transformTypes(transformedContent);
    
    result.transformedContent = transformedContent;
    result.replacedIcons = Array.from(mappedIcons.keys());
    result.success = true;
    
    // Check if any changes were made
    if (result.originalContent === result.transformedContent) {
      result.warnings.push('No changes made to file content');
    }
    
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : String(error));
  }
  
  return result;
}

/**
 * Write transformed content back to file
 */
export function writeTransformedFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Find all TypeScript/TSX files in a directory
 */
function findTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and .next directories
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Migrate icons in a directory
 */
export function migrateDirectory(
  dirPath: string,
  options: {
    dryRun?: boolean;
    verbose?: boolean;
  } = {}
): MigrationReport {
  const { dryRun = false, verbose = false } = options;
  
  console.log(`\n🔄 Migrating icons in: ${dirPath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no files will be modified)' : 'LIVE'}`);
  
  // Find all TypeScript/TSX files
  const files = findTsFiles(dirPath);
  console.log(`📁 Found ${files.length} TypeScript/TSX files\n`);
  
  const report: MigrationReport = {
    totalFiles: files.length,
    successfulFiles: 0,
    failedFiles: 0,
    skippedFiles: 0,
    totalIconsReplaced: 0,
    errors: [],
    warnings: [],
    filesNeedingManualReview: [],
  };
  
  // Process each file
  files.forEach((filePath, index) => {
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (verbose) {
      console.log(`[${index + 1}/${files.length}] Processing: ${relativePath}`);
    }
    
    const result = transformFile(filePath);
    
    if (result.skipped) {
      report.skippedFiles++;
      if (verbose) {
        console.log(`  ⏭️  Skipped: ${result.skipReason}`);
      }
      return;
    }
    
    if (!result.success) {
      report.failedFiles++;
      result.errors.forEach((error) => {
        report.errors.push({ file: relativePath, error });
        console.log(`  ❌ Error: ${error}`);
      });
      return;
    }
    
    // Log warnings
    if (result.warnings.length > 0) {
      result.warnings.forEach((warning) => {
        report.warnings.push({ file: relativePath, warning });
        if (verbose) {
          console.log(`  ⚠️  Warning: ${warning}`);
        }
      });
    }
    
    // Check if file needs manual review (has unmapped icons)
    const hasUnmappedIcons = result.warnings.some((w) => w.includes('Unmapped icons'));
    if (hasUnmappedIcons) {
      report.filesNeedingManualReview.push(relativePath);
    }
    
    // Write transformed content
    if (!dryRun && result.transformedContent !== result.originalContent) {
      writeTransformedFile(filePath, result.transformedContent);
    }
    
    report.successfulFiles++;
    report.totalIconsReplaced += result.replacedIcons.length;
    
    if (verbose && result.replacedIcons.length > 0) {
      console.log(`  ✅ Replaced ${result.replacedIcons.length} icons: ${result.replacedIcons.join(', ')}`);
    }
  });
  
  return report;
}

/**
 * Print migration report
 */
export function printReport(report: MigrationReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION REPORT');
  console.log('='.repeat(60));
  console.log(`Total files processed: ${report.totalFiles}`);
  console.log(`✅ Successful: ${report.successfulFiles}`);
  console.log(`⏭️  Skipped: ${report.skippedFiles}`);
  console.log(`❌ Failed: ${report.failedFiles}`);
  console.log(`🔄 Total icons replaced: ${report.totalIconsReplaced}`);
  
  if (report.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${report.warnings.length}`);
    report.warnings.slice(0, 10).forEach(({ file, warning }) => {
      console.log(`  - ${file}: ${warning}`);
    });
    if (report.warnings.length > 10) {
      console.log(`  ... and ${report.warnings.length - 10} more warnings`);
    }
  }
  
  if (report.errors.length > 0) {
    console.log(`\n❌ Errors: ${report.errors.length}`);
    report.errors.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }
  
  if (report.filesNeedingManualReview.length > 0) {
    console.log(`\n🔍 Files needing manual review: ${report.filesNeedingManualReview.length}`);
    report.filesNeedingManualReview.forEach((file) => {
      console.log(`  - ${file}`);
    });
  }
  
  console.log('='.repeat(60) + '\n');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dirPath = args[0] || 'src';
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  try {
    const report = migrateDirectory(dirPath, { dryRun, verbose });
    printReport(report);
    
    if (dryRun) {
      console.log('💡 This was a dry run. No files were modified.');
      console.log('   Run without --dry-run to apply changes.\n');
    } else {
      console.log('✨ Migration complete!\n');
    }
    
    process.exit(report.failedFiles > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  }
}
