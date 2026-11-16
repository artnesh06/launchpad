/**
 * Security Event Handlers (Phase 4)
 * 
 * Handlers for security monitoring and access control events:
 * - Paused: Contract pause events
 * - Unpaused: Contract unpause events
 * - TransferLockUpdated: NFT transfer lock status changes
 * - RoleGranted: Access control role grants
 * - RoleRevoked: Access control role revocations
 */

import { prisma } from '@/lib/prisma';
import { ActivityType } from '@prisma/client';
import { BaseEventHandler } from './base-handler';
import {
  PausedEvent,
  UnpausedEvent,
  TransferLockUpdatedEvent,
  RoleGrantedEvent,
  RoleRevokedEvent
} from '../event-types';

export class SecurityEventHandler extends BaseEventHandler {
  /**
   * Handle Paused event
   */
  async handlePausedEvent(event: PausedEvent): Promise<void> {
    try {
      // Extract and validate event data
      this.validateEventData(event, ['txHash', 'blockNumber', 'launchpadAddress']);

      console.log(`⏸️ Contract paused for ${event.launchpadAddress}`);

      // Check for duplicates
      const isDuplicate = await this.isDuplicateActivity(
        event.txHash,
        ActivityType.CONTRACT_PAUSED,
        event.launchpadAddress
      );

      if (isDuplicate) {
        console.log(`⚠️ Pause event already processed: ${event.txHash}`);
        return;
      }

      // Fetch launchpad data
      const launchpad = await this.fetchLaunchpad(event.launchpadAddress);
      if (!launchpad) return;

      // Create activity with ActivityType.CONTRACT_PAUSED
      // Format metadata with action: 'paused'
      await this.writeActivityWithRetry({
        chainId: this.context.chainId,
        factoryId: launchpad.factoryId,
        launchpadId: launchpad.id,
        type: ActivityType.CONTRACT_PAUSED,
        actor: launchpad.creator,
        description: `Contract paused`,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        metadata: {
          action: 'paused',
          collectionName: launchpad.name,
          collectionSymbol: launchpad.symbol
        }
      });

      console.log(`✅ Pause activity recorded: ${event.txHash}`);

    } catch (error) {
      console.error(`❌ Error handling paused event:`, error);
      await this.logEventError('Paused', error, event, 'high');
    }
  }

  /**
   * Handle Unpaused event
   */
  async handleUnpausedEvent(event: UnpausedEvent): Promise<void> {
    try {
      // Extract and validate event data
      this.validateEventData(event, ['txHash', 'blockNumber', 'launchpadAddress']);

      console.log(`▶️ Contract unpaused for ${event.launchpadAddress}`);

      // Check for duplicates
      const isDuplicate = await this.isDuplicateActivity(
        event.txHash,
        ActivityType.CONTRACT_UNPAUSED,
        event.launchpadAddress
      );

      if (isDuplicate) {
        console.log(`⚠️ Unpause event already processed: ${event.txHash}`);
        return;
      }

      // Fetch launchpad data
      const launchpad = await this.fetchLaunchpad(event.launchpadAddress);
      if (!launchpad) return;

      // Create activity with ActivityType.CONTRACT_UNPAUSED
      // Format metadata with action: 'unpaused'
      await this.writeActivityWithRetry({
        chainId: this.context.chainId,
        factoryId: launchpad.factoryId,
        launchpadId: launchpad.id,
        type: ActivityType.CONTRACT_UNPAUSED,
        actor: launchpad.creator,
        description: `Contract unpaused`,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        metadata: {
          action: 'unpaused',
          collectionName: launchpad.name,
          collectionSymbol: launchpad.symbol
        }
      });

      console.log(`✅ Unpause activity recorded: ${event.txHash}`);

    } catch (error) {
      console.error(`❌ Error handling unpaused event:`, error);
      await this.logEventError('Unpaused', error, event, 'high');
    }
  }

  /**
   * Handle TransferLockUpdated event
   */
  async handleTransferLockUpdatedEvent(event: TransferLockUpdatedEvent): Promise<void> {
    try {
      // Extract and validate event data
      this.validateEventData(event, ['locked', 'txHash', 'blockNumber', 'launchpadAddress']);

      console.log(`🔒 Transfer lock updated: ${event.locked ? 'locked' : 'unlocked'} for ${event.launchpadAddress}`);

      // Check for duplicates
      const isDuplicate = await this.isDuplicateActivity(
        event.txHash,
        ActivityType.TRANSFER_LOCK_UPDATED,
        event.launchpadAddress
      );

      if (isDuplicate) {
        console.log(`⚠️ Transfer lock update already processed: ${event.txHash}`);
        return;
      }

      // Fetch launchpad data
      const launchpad = await this.fetchLaunchpad(event.launchpadAddress);
      if (!launchpad) return;

      // Create activity with ActivityType.TRANSFER_LOCK_UPDATED
      // Format metadata with locked status
      await this.writeActivityWithRetry({
        chainId: this.context.chainId,
        factoryId: launchpad.factoryId,
        launchpadId: launchpad.id,
        type: ActivityType.TRANSFER_LOCK_UPDATED,
        actor: launchpad.creator,
        description: `Transfers ${event.locked ? 'locked' : 'unlocked'}`,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        metadata: {
          locked: event.locked,
          collectionName: launchpad.name,
          collectionSymbol: launchpad.symbol
        }
      });

      console.log(`✅ Transfer lock update activity recorded: ${event.txHash}`);

    } catch (error) {
      console.error(`❌ Error handling transfer lock updated event:`, error);
      await this.logEventError('TransferLockUpdated', error, event, 'medium');
    }
  }

  /**
   * Handle RoleGranted event
   */
  async handleRoleGrantedEvent(event: RoleGrantedEvent): Promise<void> {
    try {
      // Extract and validate event data
      this.validateEventData(event, ['role', 'account', 'sender', 'txHash', 'blockNumber', 'launchpadAddress']);

      console.log(`✅ Role granted: ${event.role} to ${event.account} by ${event.sender} for ${event.launchpadAddress}`);

      // Check for duplicates
      const isDuplicate = await this.isDuplicateActivity(
        event.txHash,
        ActivityType.ROLE_GRANTED,
        event.launchpadAddress
      );

      if (isDuplicate) {
        console.log(`⚠️ Role granted event already processed: ${event.txHash}`);
        return;
      }

      // Fetch launchpad data
      const launchpad = await this.fetchLaunchpad(event.launchpadAddress);
      if (!launchpad) return;

      // Truncate addresses
      const accountShort = this.truncateAddress(event.account);
      const senderShort = this.truncateAddress(event.sender);

      // Create activity with ActivityType.ROLE_GRANTED
      // Format metadata with action: 'granted', role, account, sender
      await this.writeActivityWithRetry({
        chainId: this.context.chainId,
        factoryId: launchpad.factoryId,
        launchpadId: launchpad.id,
        type: ActivityType.ROLE_GRANTED,
        actor: event.sender,
        description: `Role ${event.role} granted to ${accountShort}`,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        metadata: {
          action: 'granted',
          role: event.role,
          account: event.account,
          accountShort,
          sender: event.sender,
          senderShort,
          collectionName: launchpad.name
        }
      });

      console.log(`✅ Role granted activity recorded: ${event.txHash}`);

    } catch (error) {
      console.error(`❌ Error handling role granted event:`, error);
      await this.logEventError('RoleGranted', error, event, 'medium');
    }
  }

  /**
   * Handle RoleRevoked event
   */
  async handleRoleRevokedEvent(event: RoleRevokedEvent): Promise<void> {
    try {
      // Extract and validate event data
      this.validateEventData(event, ['role', 'account', 'sender', 'txHash', 'blockNumber', 'launchpadAddress']);

      console.log(`❌ Role revoked: ${event.role} from ${event.account} by ${event.sender} for ${event.launchpadAddress}`);

      // Check for duplicates
      const isDuplicate = await this.isDuplicateActivity(
        event.txHash,
        ActivityType.ROLE_REVOKED,
        event.launchpadAddress
      );

      if (isDuplicate) {
        console.log(`⚠️ Role revoked event already processed: ${event.txHash}`);
        return;
      }

      // Fetch launchpad data
      const launchpad = await this.fetchLaunchpad(event.launchpadAddress);
      if (!launchpad) return;

      // Truncate addresses
      const accountShort = this.truncateAddress(event.account);
      const senderShort = this.truncateAddress(event.sender);

      // Create activity with ActivityType.ROLE_REVOKED
      // Format metadata with action: 'revoked', role, account, sender
      await this.writeActivityWithRetry({
        chainId: this.context.chainId,
        factoryId: launchpad.factoryId,
        launchpadId: launchpad.id,
        type: ActivityType.ROLE_REVOKED,
        actor: event.sender,
        description: `Role ${event.role} revoked from ${accountShort}`,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        metadata: {
          action: 'revoked',
          role: event.role,
          account: event.account,
          accountShort,
          sender: event.sender,
          senderShort,
          collectionName: launchpad.name
        }
      });

      console.log(`✅ Role revoked activity recorded: ${event.txHash}`);

    } catch (error) {
      console.error(`❌ Error handling role revoked event:`, error);
      await this.logEventError('RoleRevoked', error, event, 'medium');
    }
  }
}
