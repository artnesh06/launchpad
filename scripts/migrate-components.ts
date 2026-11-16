/**
 * Migrate general component files (excluding admin and ui)
 * This script runs the migration on src/components but skips admin and ui subdirectories
 */

import * as fs from 'fs';
import * as path from 'path';
import { transformFile, writeTransformedFile } from './migrate-icons';

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
 * Find all TypeScript/TSX files in a directory, excluding specific subdirectories
 */
function findTsFilesExcluding(
  dir: string,
  excludeDirs: string[],
  fileList: string[] = []
): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip excluded directories and common ignore patterns
      if (
        !excludeDirs.includes(file) &&
        file !== 'node_modules' &&
        file !== '.next' &&
        file !== '.git'
      ) {
        findTsFilesExcluding(filePath, excludeDirs, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Migrate icons in components directory, excluding admin and ui
 */
function migrateComponents(): MigrationReport {
  const componentsDir = path.join(process.cwd(), 'src', 'components');
  const excludeDirs = ['admin', 'ui'];
  
  console.log(`\n🔄 Migrating icons in: ${componentsDir}`);
  console.log(`📁 Excluding subdirectories: ${excludeDirs.join(', ')}`);
  
  // Find all TypeScript/TSX files excluding admin and ui
  const files = findTsFilesExcluding(componentsDir, excludeDirs);
  console.log(`📁 Found ${files.length} TypeScript/TSX files to process\n`);
  
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
    
    console.log(`[${index + 1}/${files.length}] Processing: ${relativePath}`);
    
    const result = transformFile(filePath);
    
    if (result.skipped) {
      report.skippedFiles++;
      console.log(`  ⏭️  Skipped: ${result.skipReason}`);
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
        console.log(`  ⚠️  Warning: ${warning}`);
      });
    }
    
    // Check if file needs manual review (has unmapped icons)
    const hasUnmappedIcons = result.warnings.some((w) => w.includes('Unmapped icons'));
    if (hasUnmappedIcons) {
      report.filesNeedingManualReview.push(relativePath);
    }
    
    // Write transformed content
    if (result.transformedContent !== result.originalContent) {
      writeTransformedFile(filePath, result.transformedContent);
      console.log(`  ✅ Replaced ${result.replacedIcons.length} icons: ${result.replacedIcons.join(', ')}`);
    }
    
    report.successfulFiles++;
    report.totalIconsReplaced += result.replacedIcons.length;
  });
  
  return report;
}

/**
 * Print migration report
 */
function printReport(report: MigrationReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION REPORT - GENERAL COMPONENTS');
  console.log('='.repeat(60));
  console.log(`Total files processed: ${report.totalFiles}`);
  console.log(`✅ Successful: ${report.successfulFiles}`);
  console.log(`⏭️  Skipped: ${report.skippedFiles}`);
  console.log(`❌ Failed: ${report.failedFiles}`);
  console.log(`🔄 Total icons replaced: ${report.totalIconsReplaced}`);
  
  if (report.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${report.warnings.length}`);
    report.warnings.forEach(({ file, warning }) => {
      console.log(`  - ${file}: ${warning}`);
    });
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
try {
  const report = migrateComponents();
  printReport(report);
  
  console.log('✨ Migration of general components complete!\n');
  
  process.exit(report.failedFiles > 0 ? 1 : 0);
} catch (error) {
  console.error('❌ Fatal error during migration:', error);
  process.exit(1);
}
