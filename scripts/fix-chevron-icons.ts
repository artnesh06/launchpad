#!/usr/bin/env bun
/**
 * Fix Chevron Icon Imports
 * 
 * This script fixes files that were migrated with incorrect Chevron icon imports.
 * Chevron icons don't exist in Huge Icons free package, so we map them to Arrow icons.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Files that need to be fixed
const filesToFix = [
  'src/components/ui/select.tsx',
  'src/components/ui/dropdown-menu.tsx',
  'src/components/ui/custom-select.tsx',
  'src/components/ui/carousel.tsx',
  'src/components/ui/calendar.tsx',
  'src/components/modal/mint-success-modal.tsx',
  'src/components/breadcrumb.tsx',
  'src/components/attribute-filters.tsx',
  'src/components/action-popover.tsx',
  'src/components/action-drawer.tsx',
];

// Mapping of incorrect Chevron imports to correct Arrow imports
const iconReplacements: Record<string, string> = {
  'ChevronRight': 'ArrowRight01Icon',
  'ChevronDown': 'ArrowDown01Icon',
  'ChevronUp': 'ArrowUp01Icon',
  'ChevronLeft': 'ArrowLeft01Icon',
};

let totalFixed = 0;
let totalFiles = 0;

console.log('🔧 Fixing Chevron icon imports...\n');

for (const filePath of filesToFix) {
  const fullPath = resolve(process.cwd(), filePath);
  
  try {
    let content = readFileSync(fullPath, 'utf-8');
    let modified = false;
    
    // Replace icon names in imports
    for (const [oldName, newName] of Object.entries(iconReplacements)) {
      // Match the icon name in import statement (with word boundaries)
      const importRegex = new RegExp(`\\b${oldName}\\b(?=[,\\s}])`, 'g');
      if (importRegex.test(content)) {
        content = content.replace(importRegex, newName);
        modified = true;
      }
    }
    
    // Replace icon usage in JSX (icon={ChevronRight} -> icon={ArrowRight01Icon})
    for (const [oldName, newName] of Object.entries(iconReplacements)) {
      const jsxRegex = new RegExp(`icon=\\{${oldName}\\}`, 'g');
      if (jsxRegex.test(content)) {
        content = content.replace(jsxRegex, `icon={${newName}}`);
        modified = true;
      }
    }
    
    if (modified) {
      writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ Fixed: ${filePath}`);
      totalFixed++;
    } else {
      console.log(`⏭️  Skipped (no changes needed): ${filePath}`);
    }
    
    totalFiles++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Total files processed: ${totalFiles}`);
console.log(`   Files fixed: ${totalFixed}`);
console.log(`   Files skipped: ${totalFiles - totalFixed}`);
