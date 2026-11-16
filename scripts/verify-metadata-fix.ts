/**
 * Automated verification script for Standard Collection Metadata Fix
 * 
 * This script checks the database for:
 * 1. No placeholder values in baseURI
 * 2. Standard Collections have manifestHash
 * 3. Valid baseURI formats
 * 4. Contract address formats
 * 
 * Requirements: 3.1, 3.2, 3.5
 */

import { prisma } from '../src/lib/prisma';

interface VerificationResult {
  passed: boolean;
  message: string;
  issues: Array<{
    collection: string;
    contractAddress: string;
    issue: string;
  }>;
}

async function verifyNoPlaceholders(): Promise<VerificationResult> {
  const withPlaceholder = await prisma.launchpad.findMany({
    where: {
      baseURI: {
        contains: 'CONTRACT_ADDRESS'
      }
    },
    select: {
      name: true,
      contractAddress: true,
      baseURI: true
    }
  });

  return {
    passed: withPlaceholder.length === 0,
    message: `Found ${withPlaceholder.length} collections with placeholder in baseURI`,
    issues: withPlaceholder.map(l => ({
      collection: l.name,
      contractAddress: l.contractAddress,
      issue: `BaseURI contains placeholder: ${l.baseURI}`
    }))
  };
}

async function verifyManifestHash(): Promise<VerificationResult> {
  const standardWithoutManifest = await prisma.launchpad.findMany({
    where: {
      baseURI: {
        contains: '/api/metadata/'
      },
      OR: [
        { manifestHash: null },
        { manifestHash: '' }
      ]
    },
    select: {
      name: true,
      contractAddress: true,
      baseURI: true,
      manifestHash: true
    }
  });

  return {
    passed: standardWithoutManifest.length === 0,
    message: `Found ${standardWithoutManifest.length} Standard Collections without manifestHash`,
    issues: standardWithoutManifest.map(l => ({
      collection: l.name,
      contractAddress: l.contractAddress,
      issue: `Standard Collection missing manifestHash (baseURI: ${l.baseURI})`
    }))
  };
}

async function verifyBaseURIFormat(): Promise<VerificationResult> {
  const invalidBaseURI = await prisma.launchpad.findMany({
    where: {
      NOT: {
        OR: [
          { baseURI: { startsWith: 'http://' } },
          { baseURI: { startsWith: 'https://' } },
          { baseURI: { startsWith: 'ipfs://' } }
        ]
      }
    },
    select: {
      name: true,
      contractAddress: true,
      baseURI: true
    }
  });

  return {
    passed: invalidBaseURI.length === 0,
    message: `Found ${invalidBaseURI.length} collections with invalid baseURI format`,
    issues: invalidBaseURI.map(l => ({
      collection: l.name,
      contractAddress: l.contractAddress,
      issue: `Invalid baseURI format: ${l.baseURI}`
    }))
  };
}

async function verifyContractAddressFormat(): Promise<VerificationResult> {
  const allLaunchpads = await prisma.launchpad.findMany({
    select: {
      name: true,
      contractAddress: true
    }
  });

  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  const invalidAddresses = allLaunchpads.filter(
    l => !addressRegex.test(l.contractAddress)
  );

  return {
    passed: invalidAddresses.length === 0,
    message: `Found ${invalidAddresses.length} collections with invalid contract address format`,
    issues: invalidAddresses.map(l => ({
      collection: l.name,
      contractAddress: l.contractAddress,
      issue: `Invalid contract address format`
    }))
  };
}

async function verifyOpenEditionFormat(): Promise<VerificationResult> {
  // Open Editions should have direct IPFS URLs and no manifestHash
  const openEditions = await prisma.launchpad.findMany({
    where: {
      baseURI: {
        startsWith: 'ipfs://'
      },
      NOT: {
        baseURI: {
          contains: '/api/metadata/'
        }
      }
    },
    select: {
      name: true,
      contractAddress: true,
      baseURI: true,
      manifestHash: true
    }
  });

  const issuesFound = openEditions.filter(l => l.manifestHash !== null && l.manifestHash !== '');

  return {
    passed: issuesFound.length === 0,
    message: `Found ${issuesFound.length} Open Editions with unexpected manifestHash`,
    issues: issuesFound.map(l => ({
      collection: l.name,
      contractAddress: l.contractAddress,
      issue: `Open Edition should not have manifestHash (found: ${l.manifestHash})`
    }))
  };
}

async function main() {
  console.log('🔍 Verifying Standard Collection Metadata Fix Implementation\n');
  console.log('=' .repeat(70));
  console.log('\n');

  const checks = [
    { name: 'No Placeholder Values', fn: verifyNoPlaceholders },
    { name: 'ManifestHash for Standard Collections', fn: verifyManifestHash },
    { name: 'Valid BaseURI Formats', fn: verifyBaseURIFormat },
    { name: 'Valid Contract Address Formats', fn: verifyContractAddressFormat },
    { name: 'Open Edition Format', fn: verifyOpenEditionFormat }
  ];

  const results: Array<{ name: string; result: VerificationResult }> = [];

  for (const check of checks) {
    console.log(`\n📋 Check: ${check.name}`);
    console.log('-'.repeat(70));
    
    try {
      const result = await check.fn();
      results.push({ name: check.name, result });

      if (result.passed) {
        console.log(`✅ PASSED: ${result.message}`);
      } else {
        console.log(`❌ FAILED: ${result.message}`);
        if (result.issues.length > 0) {
          console.log('\n   Issues found:');
          result.issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue.collection} (${issue.contractAddress})`);
            console.log(`      ${issue.issue}`);
          });
        }
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({
        name: check.name,
        result: {
          passed: false,
          message: 'Check failed with error',
          issues: []
        }
      });
    }
  }

  // Summary
  console.log('\n');
  console.log('=' .repeat(70));
  console.log('\n📊 VERIFICATION SUMMARY\n');

  const totalChecks = results.length;
  const passedChecks = results.filter(r => r.result.passed).length;
  const failedChecks = totalChecks - passedChecks;
  const totalIssues = results.reduce((sum, r) => sum + r.result.issues.length, 0);

  const totalCollections = await prisma.launchpad.count();
  console.log(`Total collections in database: ${totalCollections}`);
  console.log(`Total checks performed: ${totalChecks}`);
  console.log(`Checks passed: ${passedChecks}`);
  console.log(`Checks failed: ${failedChecks}`);
  console.log(`Total issues found: ${totalIssues}`);

  console.log('\n');

  if (failedChecks === 0) {
    console.log('✅ ALL CHECKS PASSED!');
    console.log('   The Standard Collection Metadata Fix is working correctly.');
    console.log('   All collections have valid baseURI and manifestHash values.');
  } else {
    console.log('❌ SOME CHECKS FAILED!');
    console.log('   Please review the issues above and fix the affected collections.');
    console.log('\n   Failed checks:');
    results
      .filter(r => !r.result.passed)
      .forEach(r => {
        console.log(`   - ${r.name}: ${r.result.issues.length} issues`);
      });
  }

  console.log('\n');
  console.log('=' .repeat(70));

  // Exit with appropriate code
  process.exit(failedChecks > 0 ? 1 : 0);
}

main()
  .catch((error) => {
    console.error('❌ Fatal error during verification:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
