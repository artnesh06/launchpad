/**
 * Utility functions for formatting activity feed data
 */

/**
 * Format a timestamp as relative time (e.g., "1m 2s", "5m 30s")
 * @param date - The date to format
 * @returns Formatted relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }

  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;

  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * Truncate an Ethereum address to show first 6 and last 4 characters
 * @param address - The full Ethereum address
 * @returns Truncated address (e.g., "0x1234...5678")
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) {
    return address;
  }

  // Ensure address starts with 0x
  const cleanAddress = address.startsWith('0x') ? address : `0x${address}`;
  
  if (cleanAddress.length < 12) {
    return cleanAddress;
  }

  const start = cleanAddress.slice(0, 6);
  const end = cleanAddress.slice(-4);
  
  return `${start}...${end}`;
}

/**
 * Format price from wei to ETH with appropriate decimal places
 * @param weiAmount - Amount in wei (as string or bigint)
 * @param decimals - Number of decimal places to show (default: 4)
 * @returns Formatted ETH amount (e.g., "0.0015 ETH")
 */
export function formatPriceFromWei(
  weiAmount: string | bigint,
  decimals: number = 4
): string {
  try {
    const wei = typeof weiAmount === 'string' ? BigInt(weiAmount) : weiAmount;
    const ethValue = Number(wei) / 1e18;

    // For very small amounts, show more decimals
    if (ethValue < 0.0001 && ethValue > 0) {
      return `${ethValue.toFixed(6)} ETH`;
    }

    // For zero, just show 0
    if (ethValue === 0) {
      return '0 ETH';
    }

    // For normal amounts, use specified decimals
    return `${ethValue.toFixed(decimals)} ETH`;
  } catch (error) {
    console.error('Error formatting price from wei:', error);
    return '0 ETH';
  }
}

/**
 * Generate activity description text based on activity type and data
 * @param type - Activity type ('mint' or 'collection')
 * @param actor - Address of the actor (minter or creator)
 * @param metadata - Additional metadata (optional)
 * @returns Formatted description string
 */
export function generateActivityDescription(
  type: 'mint' | 'collection',
  actor: string,
  metadata?: {
    quantity?: number;
    price?: string;
    collectionName?: string;
    totalSupply?: number;
  }
): string {
  const truncatedActor = truncateAddress(actor);

  if (type === 'mint') {
    const quantity = metadata?.quantity || 1;
    const quantityText = quantity > 1 ? ` (${quantity}x)` : '';
    
    if (metadata?.price && metadata.price !== '0') {
      const priceText = formatPriceFromWei(metadata.price);
      return `Minted by ${truncatedActor}${quantityText} for ${priceText}`;
    }
    
    return `Minted by ${truncatedActor}${quantityText}`;
  }

  if (type === 'collection') {
    if (metadata?.totalSupply) {
      return `Created by ${truncatedActor} (${metadata.totalSupply} supply)`;
    }
    
    return `Created by ${truncatedActor}`;
  }

  return `Action by ${truncatedActor}`;
}

/**
 * Format a collection or NFT name for display
 * Truncates long names and handles empty/null values
 * @param name - The name to format
 * @param maxLength - Maximum length before truncation (default: 30)
 * @returns Formatted name
 */
export function formatDisplayName(name: string | null | undefined, maxLength: number = 30): string {
  if (!name) {
    return 'Unnamed';
  }

  if (name.length <= maxLength) {
    return name;
  }

  return `${name.slice(0, maxLength - 3)}...`;
}

/**
 * Validate and format transaction hash
 * @param txHash - Transaction hash
 * @returns Formatted transaction hash or null if invalid
 */
export function formatTxHash(txHash: string | null | undefined): string | null {
  if (!txHash) {
    return null;
  }

  // Ensure it starts with 0x and is 66 characters long
  const cleanHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
  
  if (cleanHash.length !== 66) {
    return null;
  }

  return cleanHash;
}

/**
 * Format activity action text based on activity type and metadata
 * @param activityType - Database ActivityType enum value
 * @param metadata - Activity metadata object
 * @param actor - Address of the actor
 * @returns Formatted action string
 */
export function formatActivityAction(
  activityType: string,
  metadata: any,
  actor: string
): string {
  const meta = metadata || {};

  switch (activityType) {
    case 'MINT_OCCURRED': {
      const minterShort = meta.minterShort || truncateAddress(actor);
      return `Minted by ${minterShort}`;
    }

    case 'LAUNCHPAD_CREATED': {
      const creatorShort = meta.creatorShort || truncateAddress(actor);
      return `Created by ${creatorShort}`;
    }

    case 'BURN_OCCURRED': {
      const ownerShort = meta.ownerShort || truncateAddress(actor);
      const tokenId = meta.tokenId || '?';
      return `Token #${tokenId} burned by ${ownerShort}`;
    }

    case 'AIRDROP_OCCURRED': {
      const operatorShort = meta.operatorShort || truncateAddress(actor);
      const totalQuantity = meta.totalQuantity || '?';
      const recipientCount = meta.recipientCount || '?';
      return `Airdropped ${totalQuantity} to ${recipientCount} recipients by ${operatorShort}`;
    }

    case 'PHASE_CREATED': {
      const phaseName = meta.phaseName || 'Phase';
      return `Phase "${phaseName}" created`;
    }

    case 'PHASE_UPDATED': {
      const phaseName = meta.phaseName || 'Phase';
      return `Phase "${phaseName}" updated`;
    }

    case 'COLLECTION_REVEALED':
      return 'Collection revealed';

    case 'TREASURY_UPDATED': {
      const newTreasuryShort = meta.newTreasuryShort || truncateAddress(meta.newTreasury || '');
      return `Treasury updated to ${newTreasuryShort}`;
    }

    case 'EMERGENCY_WITHDRAW': {
      const recipientShort = meta.recipientShort || truncateAddress(meta.recipient || '');
      const amount = meta.amountInEth || '0 ETH';
      return `Withdrawn ${amount} to ${recipientShort}`;
    }

    case 'OWNERSHIP_TRANSFERRED': {
      const newOwnerShort = meta.newOwnerShort || truncateAddress(meta.newOwner || '');
      return `Ownership transferred to ${newOwnerShort}`;
    }

    case 'FEE_UPDATED': {
      if (meta.enabled !== undefined) {
        return `Platform fee ${meta.enabled ? 'enabled' : 'disabled'}`;
      } else if (meta.newFeeInEth) {
        return `Platform fee updated to ${meta.newFeeInEth}`;
      }
      return 'Fee updated';
    }

    case 'ROYALTY_UPDATED': {
      const recipientShort = meta.recipientShort || truncateAddress(meta.recipient || '');
      const percentage = meta.percentage || '?';
      return `Royalty updated: ${percentage}% to ${recipientShort}`;
    }

    case 'METADATA_UPDATED': {
      const updateType = meta.updateType || 'metadata';
      return `${updateType} updated`;
    }

    case 'CONTRACT_PAUSED':
      return 'Contract paused';

    case 'CONTRACT_UNPAUSED':
      return 'Contract unpaused';

    case 'TRANSFER_LOCK_UPDATED':
      return meta.locked ? 'Transfers locked' : 'Transfers unlocked';

    case 'ROLE_GRANTED': {
      const accountShort = meta.accountShort || truncateAddress(meta.account || '');
      return `Role granted to ${accountShort}`;
    }

    case 'ROLE_REVOKED': {
      const accountShort = meta.accountShort || truncateAddress(meta.account || '');
      return `Role revoked from ${accountShort}`;
    }

    default:
      return `Action by ${truncateAddress(actor)}`;
  }
}

/**
 * Get activity category from database ActivityType
 * @param activityType - Database ActivityType enum value
 * @returns Activity category for frontend display
 */
export function getActivityCategory(
  activityType: string
): 'mint' | 'collection' | 'burn' | 'airdrop' | 'phase' | 'reveal' | 'admin' | 'metadata' | 'security' {
  switch (activityType) {
    case 'MINT_OCCURRED':
      return 'mint';
    case 'LAUNCHPAD_CREATED':
      return 'collection';
    case 'BURN_OCCURRED':
      return 'burn';
    case 'AIRDROP_OCCURRED':
      return 'airdrop';
    case 'PHASE_CREATED':
    case 'PHASE_UPDATED':
      return 'phase';
    case 'COLLECTION_REVEALED':
      return 'reveal';
    case 'TREASURY_UPDATED':
    case 'EMERGENCY_WITHDRAW':
    case 'OWNERSHIP_TRANSFERRED':
    case 'FEE_UPDATED':
    case 'ROYALTY_UPDATED':
      return 'admin';
    case 'METADATA_UPDATED':
      return 'metadata';
    case 'CONTRACT_PAUSED':
    case 'CONTRACT_UNPAUSED':
    case 'TRANSFER_LOCK_UPDATED':
    case 'ROLE_GRANTED':
    case 'ROLE_REVOKED':
      return 'security';
    default:
      return 'mint';
  }
}

/**
 * Get display name for activity
 * @param activityType - Database ActivityType enum value
 * @param metadata - Activity metadata object
 * @returns Display name for the activity
 */
export function getActivityDisplayName(
  activityType: string,
  metadata: any
): string {
  const meta = metadata || {};
  return meta.collectionName || 'Unknown Collection';
}
