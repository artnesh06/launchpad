/**
 * Manual Test Script for Countdown Timer
 * 
 * This script helps verify the countdown timer implementation
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 * 
 * To run this test:
 * 1. Start the development server: npm run dev
 * 2. Navigate to a collection page: http://localhost:3000/collection/[contractAddress]
 * 3. Observe the countdown timer behavior
 * 
 * Test Scenarios:
 * 
 * Scenario 1: Active Phase with Future End Time
 * - Expected: Countdown displays time remaining (e.g., "1d 2h 30m 45s")
 * - Expected: Timer updates every second
 * - Expected: Green color (#59DA75) for active countdown
 * 
 * Scenario 2: Phase Ended (endTime in the past)
 * - Expected: Display "Mint Ended" in red color (#EE6476)
 * - Expected: No countdown numbers shown
 * 
 * Scenario 3: No Active Phase
 * - Expected: Display "No Active Mint" in gray color (#857F94)
 * - Expected: No countdown numbers shown
 * 
 * Scenario 4: Collection with Multiple Phases
 * - Expected: Only the active phase (isActive: true) is used for countdown
 * - Expected: Inactive phases are ignored
 * 
 * Scenario 5: Countdown Reaches Zero
 * - Expected: Status changes from "active" to "ended"
 * - Expected: Display changes from countdown to "Mint Ended"
 * - Expected: Timer stops updating
 */

// Mock data for testing different scenarios
export const mockCollectionWithActivePhase = {
  id: '1',
  name: 'Test Collection',
  creator: '0x123...',
  chain: 'MegaETH',
  description: 'Test collection with active phase',
  image: null,
  contractAddress: '0xtest123',
  website: '#',
  sellPrice: '0.1 ETH',
  walletLimit: '100/1000',
  eligible: true,
  totalSupply: 1000,
  totalMinted: 100,
  airdropPercent: 3.21,
  mintedPercent: 10,
  phases: [
    {
      name: 'Public Sale',
      startTime: new Date(Date.now() - 60 * 60 * 1000), // Started 1 hour ago
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Ends in 2 days
      price: '0.1',
      isActive: true
    }
  ]
};

export const mockCollectionWithEndedPhase = {
  id: '2',
  name: 'Ended Collection',
  creator: '0x456...',
  chain: 'Base',
  description: 'Test collection with ended phase',
  image: null,
  contractAddress: '0xtest456',
  website: '#',
  sellPrice: '0.2 ETH',
  walletLimit: '500/1000',
  eligible: true,
  totalSupply: 1000,
  totalMinted: 500,
  airdropPercent: 5.0,
  mintedPercent: 50,
  phases: [
    {
      name: 'Early Bird',
      startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Started 3 days ago
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Ended 1 day ago
      price: '0.2',
      isActive: true
    }
  ]
};

export const mockCollectionWithNoPhase = {
  id: '3',
  name: 'No Phase Collection',
  creator: '0x789...',
  chain: 'Ethereum',
  description: 'Test collection with no active phase',
  image: null,
  contractAddress: '0xtest789',
  website: '#',
  sellPrice: '0.3 ETH',
  walletLimit: '0/1000',
  eligible: true,
  totalSupply: 1000,
  totalMinted: 0,
  airdropPercent: 0,
  mintedPercent: 0,
  phases: []
};

export const mockCollectionWithMultiplePhases = {
  id: '4',
  name: 'Multi Phase Collection',
  creator: '0xabc...',
  chain: 'Polygon',
  description: 'Test collection with multiple phases',
  image: null,
  contractAddress: '0xtestabc',
  website: '#',
  sellPrice: '0.15 ETH',
  walletLimit: '200/1000',
  eligible: true,
  totalSupply: 1000,
  totalMinted: 200,
  airdropPercent: 2.5,
  mintedPercent: 20,
  phases: [
    {
      name: 'Whitelist',
      startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      price: '0.1',
      isActive: false
    },
    {
      name: 'Public Sale',
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Active - ends in 3 days
      price: '0.15',
      isActive: true
    },
    {
      name: 'Final Sale',
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      price: '0.2',
      isActive: false
    }
  ]
};

// Helper function to format countdown for display
export function formatCountdown(countdown: { days: number; hours: number; minutes: number; seconds: number }): string {
  return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`;
}

// Helper function to calculate countdown from endTime
export function calculateCountdown(endTime: Date): { 
  countdown: { days: number; hours: number; minutes: number; seconds: number };
  status: 'active' | 'ended';
} {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const distance = end - now;
  
  if (distance <= 0) {
    return {
      countdown: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      status: 'ended'
    };
  }
  
  return {
    countdown: {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((distance % (1000 * 60)) / 1000)
    },
    status: 'active'
  };
}

// Test the countdown calculation
console.log('=== Countdown Timer Manual Test ===\n');

console.log('Test 1: Active Phase');
const activePhase = mockCollectionWithActivePhase.phases[0];
const activeResult = calculateCountdown(activePhase.endTime);
console.log(`Status: ${activeResult.status}`);
console.log(`Countdown: ${formatCountdown(activeResult.countdown)}`);
console.log(`Expected: Status should be "active", countdown should show time remaining\n`);

console.log('Test 2: Ended Phase');
const endedPhase = mockCollectionWithEndedPhase.phases[0];
const endedResult = calculateCountdown(endedPhase.endTime);
console.log(`Status: ${endedResult.status}`);
console.log(`Countdown: ${formatCountdown(endedResult.countdown)}`);
console.log(`Expected: Status should be "ended", countdown should be 0d 0h 0m 0s\n`);

console.log('Test 3: No Active Phase');
const noPhases = mockCollectionWithNoPhase.phases;
console.log(`Phases count: ${noPhases.length}`);
console.log(`Expected: Should display "No Active Mint"\n`);

console.log('Test 4: Multiple Phases - Find Active');
const multiPhases = mockCollectionWithMultiplePhases.phases;
const activeMultiPhase = multiPhases.find(p => p.isActive);
if (activeMultiPhase) {
  const multiResult = calculateCountdown(activeMultiPhase.endTime);
  console.log(`Active Phase: ${activeMultiPhase.name}`);
  console.log(`Status: ${multiResult.status}`);
  console.log(`Countdown: ${formatCountdown(multiResult.countdown)}`);
  console.log(`Expected: Should use "Public Sale" phase for countdown\n`);
}

console.log('=== Manual Testing Instructions ===');
console.log('1. Navigate to a collection page in the browser');
console.log('2. Check the countdown timer display near the bottom of the left column');
console.log('3. Verify the timer updates every second (for active phases)');
console.log('4. Verify correct status messages:');
console.log('   - Active: Green countdown (e.g., "1d 2h 30m 45s")');
console.log('   - Ended: Red "Mint Ended" message');
console.log('   - No Phase: Gray "No Active Mint" message');
console.log('5. Test with different collections to verify all scenarios');
