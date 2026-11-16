import * as fs from 'fs';
import * as path from 'path';

interface IconUsage {
  filePath: string;
  iconNames: string[];
  lineNumbers: number[];
  importLine: string;
}

interface IconCount {
  iconName: string;
  totalUsages: number;
  files: string[];
}

interface DiscoveryReport {
  totalFiles: number;
  totalIcons: number;
  uniqueIcons: string[];
  iconCounts: IconCount[];
  usageByFile: IconUsage[];
  timestamp: string;
}

/**
 * Recursively find all TypeScript and TSX files in a directory
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
 * Parse import statement to extract icon names
 * Handles: import { Icon1, Icon2 as Alias, Icon3 } from 'lucide-react'
 */
function parseImportStatement(importLine: string): string[] {
  const iconNames: string[] = [];
  
  // Match the content between curly braces
  const match = importLine.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  
  if (match) {
    const imports = match[1];
    // Split by comma and process each import
    const importParts = imports.split(',');
    
    importParts.forEach((part) => {
      const trimmed = part.trim();
      // Handle aliased imports (Icon as Alias)
      if (trimmed.includes(' as ')) {
        const [originalName] = trimmed.split(' as ');
        iconNames.push(originalName.trim());
      } else {
        iconNames.push(trimmed);
      }
    });
  }
  
  return iconNames;
}

/**
 * Count occurrences of icon usage in JSX
 * Looks for patterns like <IconName /> or <IconName>
 */
function countIconUsages(content: string, iconNames: string[]): Map<string, number[]> {
  const usageMap = new Map<string, number[]>();
  const lines = content.split('\n');
  
  iconNames.forEach((iconName) => {
    const lineNumbers: number[] = [];
    
    lines.forEach((line, index) => {
      // Match JSX usage: <IconName or <IconName/> or <IconName>
      const regex = new RegExp(`<${iconName}[\\s/>]`, 'g');
      if (regex.test(line)) {
        lineNumbers.push(index + 1); // Line numbers are 1-indexed
      }
    });
    
    if (lineNumbers.length > 0) {
      usageMap.set(iconName, lineNumbers);
    }
  });
  
  return usageMap;
}

/**
 * Scan a single file for Lucide React imports and usage
 */
function scanFile(filePath: string): IconUsage | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Find the import line
  let importLine = '';
  let importLineNumber = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("from 'lucide-react'") || lines[i].includes('from "lucide-react"')) {
      importLine = lines[i];
      importLineNumber = i + 1;
      break;
    }
  }
  
  if (!importLine) {
    return null; // No Lucide imports in this file
  }
  
  // Parse icon names from import
  const iconNames = parseImportStatement(importLine);
  
  if (iconNames.length === 0) {
    return null;
  }
  
  // Count usage of each icon
  const usageMap = countIconUsages(content, iconNames);
  
  // Collect all line numbers where icons are used
  const allLineNumbers: number[] = [importLineNumber];
  usageMap.forEach((lineNumbers) => {
    allLineNumbers.push(...lineNumbers);
  });
  
  return {
    filePath: path.relative(process.cwd(), filePath),
    iconNames,
    lineNumbers: allLineNumbers.sort((a, b) => a - b),
    importLine: importLine.trim(),
  };
}

/**
 * Generate icon count statistics
 */
function generateIconCounts(usageByFile: IconUsage[]): IconCount[] {
  const countMap = new Map<string, { count: number; files: Set<string> }>();
  
  usageByFile.forEach((usage) => {
    usage.iconNames.forEach((iconName) => {
      if (!countMap.has(iconName)) {
        countMap.set(iconName, { count: 0, files: new Set() });
      }
      
      const entry = countMap.get(iconName)!;
      entry.files.add(usage.filePath);
      
      // Count actual JSX usages (excluding the import line)
      const usageCount = usage.lineNumbers.filter((lineNum) => lineNum !== usage.lineNumbers[0]).length;
      entry.count += usageCount;
    });
  });
  
  const iconCounts: IconCount[] = [];
  countMap.forEach((value, iconName) => {
    iconCounts.push({
      iconName,
      totalUsages: value.count,
      files: Array.from(value.files),
    });
  });
  
  // Sort by usage count (descending)
  iconCounts.sort((a, b) => b.totalUsages - a.totalUsages);
  
  return iconCounts;
}

/**
 * Main discovery function
 */
function discoverLucideIcons(srcDir: string = 'src'): DiscoveryReport {
  console.log(`🔍 Scanning ${srcDir} directory for Lucide React icons...`);
  
  // Find all TypeScript/TSX files
  const allFiles = findTsFiles(srcDir);
  console.log(`📁 Found ${allFiles.length} TypeScript/TSX files`);
  
  // Scan each file
  const usageByFile: IconUsage[] = [];
  allFiles.forEach((filePath) => {
    const usage = scanFile(filePath);
    if (usage) {
      usageByFile.push(usage);
    }
  });
  
  console.log(`✅ Found ${usageByFile.length} files using Lucide React icons`);
  
  // Generate statistics
  const iconCounts = generateIconCounts(usageByFile);
  const uniqueIcons = iconCounts.map((ic) => ic.iconName);
  const totalIcons = iconCounts.reduce((sum, ic) => sum + ic.totalUsages, 0);
  
  const report: DiscoveryReport = {
    totalFiles: usageByFile.length,
    totalIcons,
    uniqueIcons,
    iconCounts,
    usageByFile,
    timestamp: new Date().toISOString(),
  };
  
  return report;
}

/**
 * Print summary to console
 */
function printSummary(report: DiscoveryReport): void {
  console.log('\n📊 DISCOVERY SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total files with Lucide icons: ${report.totalFiles}`);
  console.log(`Total icon usages: ${report.totalIcons}`);
  console.log(`Unique icons: ${report.uniqueIcons.length}`);
  console.log('\n🏆 TOP 10 MOST USED ICONS:');
  
  report.iconCounts.slice(0, 10).forEach((ic, index) => {
    console.log(`  ${index + 1}. ${ic.iconName}: ${ic.totalUsages} usages in ${ic.files.length} files`);
  });
  
  console.log('\n📝 ALL UNIQUE ICONS:');
  console.log(report.uniqueIcons.join(', '));
}

/**
 * Save report to JSON file
 */
function saveReport(report: DiscoveryReport, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${outputPath}`);
}

// Main execution
if (require.main === module) {
  const srcDir = process.argv[2] || 'src';
  const outputPath = process.argv[3] || 'icon-discovery-report.json';
  
  try {
    const report = discoverLucideIcons(srcDir);
    printSummary(report);
    saveReport(report, outputPath);
    
    console.log('\n✨ Discovery complete!');
  } catch (error) {
    console.error('❌ Error during discovery:', error);
    process.exit(1);
  }
}

export { discoverLucideIcons, DiscoveryReport, IconUsage, IconCount };
