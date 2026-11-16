/**
 * Script to sync all launchpads from blockchain
 * Useful for initial setup or recovering from downtime
 * 
 * Usage:
 *   tsx scripts/sync-all-launchpads.ts                    # Sync only new data (from today)
 *   tsx scripts/sync-all-launchpads.ts --from 2025-01-01  # Sync from specific date
 *   tsx scripts/sync-all-launchpads.ts --all              # Sync all historical data
 */

import { prisma } from '../src/lib/prisma';

async function syncAllLaunchpads(fromDate?: Date) {
    try {
        const syncDateStr = fromDate ? fromDate.toISOString() : 'today';
        console.log(`🔄 Starting sync for all launchpads from ${syncDateStr}...`);

        // Get all active launchpads
        const launchpads = await prisma.launchpad.findMany({
            where: {
                status: 'ACTIVE'
            },
            select: {
                id: true,
                contractAddress: true,
                chainId: true,
                name: true
            }
        });

        console.log(`📋 Found ${launchpads.length} active launchpads`);

        let successCount = 0;
        let errorCount = 0;

        for (const launchpad of launchpads) {
            try {
                console.log(`\n🔄 Syncing ${launchpad.name} (${launchpad.contractAddress})...`);

                const requestBody: any = {
                    launchpadId: launchpad.id,
                    contractAddress: launchpad.contractAddress,
                    chainId: launchpad.chainId
                };

                // Add fromDate if specified
                if (fromDate) {
                    requestBody.fromDate = fromDate.toISOString();
                }

                const response = await fetch('http://localhost:3000/api/admin/launchpads/sync-mints', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                const result = await response.json();

                if (result.success) {
                    console.log(`✅ ${launchpad.name}: Synced ${result.data.synced} new mints`);
                    successCount++;
                } else {
                    console.error(`❌ ${launchpad.name}: ${result.error}`);
                    errorCount++;
                }

                // Wait a bit between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ Error syncing ${launchpad.name}:`, error);
                errorCount++;
            }
        }

        console.log('\n📊 Sync Summary:');
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`📋 Total: ${launchpads.length}`);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let fromDate: Date | undefined;

    if (args.includes('--all')) {
        // Sync all historical data (from genesis)
        fromDate = new Date(0);
        console.log('📅 Mode: Sync ALL historical data');
    } else if (args.includes('--from')) {
        // Sync from specific date
        const dateIndex = args.indexOf('--from') + 1;
        const dateStr = args[dateIndex];
        if (dateStr) {
            fromDate = new Date(dateStr);
            if (isNaN(fromDate.getTime())) {
                console.error('❌ Invalid date format. Use: YYYY-MM-DD');
                process.exit(1);
            }
            console.log(`📅 Mode: Sync from ${fromDate.toISOString()}`);
        } else {
            console.error('❌ --from requires a date argument');
            process.exit(1);
        }
    } else {
        // Default: sync only new data (from today)
        fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0); // Start of today
        console.log(`📅 Mode: Sync NEW data only (from ${fromDate.toISOString()})`);
    }

    syncAllLaunchpads(fromDate)
        .then(() => {
            console.log('\n✅ Sync complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Sync failed:', error);
            process.exit(1);
        });
}

export { syncAllLaunchpads };
