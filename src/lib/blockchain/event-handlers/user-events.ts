/**
 * User-Facing Event Handlers (Phase 1)
 * 
 * Handlers untuk events yang directly impact user experience:
 * - Burned: NFT burning events
 * - Airdropped: Batch airdrop events
 * - PhaseAdded: New mint phase creation
 * - PhaseUpdated: Mint phase updates
 * - Revealed: Collection reveal events
 */

import { prisma } from '@/lib/prisma';
import { ActivityType } from '@prisma/client';
import { BaseEventHandler } from './base-handler';
import {
  BurnedEvent,
  AirdroppedEvent,
  PhaseAddedEvent,
  PhaseUpdatedEvent,
  RevealedEvent
} from '../event-types';

export class UserEventHandler extends BaseEventHandler {
  /**
   * Handle Burned event
   */
  async handleBurnedEvent(event: BurnedEvent): Promise<void> {
    try {
      // Validate event data
      this.validateEventData(event, ['owner', 'tokenId', 'txHash', 'blockNumber', 'launchpadAddress']);

      console.log(`🔥 Burn detected: Token #${event.tokenId} by ${event.owner}`);

      // Check for duplicate activities
      const isDuplicate = await this.isDuplicateActivity(
        event.txHash,
        ActivityType.BURN_OCCURRED,
        event.launchpadAddress
      );

      if (isDuplicate) {
        console.log(`⚠️ Burn already processed: ${event.txHash}`);
        return;
      }

      // Fetch launchpad data from database including metadata
      const launchpad = await this.fetchLaunchpad(event.launchpadAddress);
      if (!launchpad) return;

      // Truncate owner address
      const ownerShort = this.truncateAddress(event.owner);

      // Create activity record with ActivityType.BURN_OCCURRED
      await this.writeActivityWithRetry({
        chainId: this.context.chainId,
        factoryId: launchpad.factoryId,
        launchpadId: launchpad.id,
        type: ActivityType.BURN_OCCURRED,
        actor: event.owner,
        description: `Burned by ${ownerShort}`,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        metadata: {
          tokenId: event.tokenId.toString(),
          owner: event.owner,
          ownerShort,
          collectionName: launchpad.name,
          collectionSymbol: launchpad.symbol,
          collectionImage: launchpad.metadata?.image || null
        }
      });

      // Update collection supply count on burn (decrement mintedCount)
      await prisma.launchpad.update({
        where: { id: launchpad.id },
        data: {
          mintedCount: {
            decrement: 1
          }
        }
      });

      console.log(`✅ Burn activity recorded: ${event.txHash}`);

    } catch (error) {
      console.error(`❌ Error handling burned event:`, error);
      await this.logEventError('Burned', error, event, 'high');
    }
  }

  /**
   * Handle Airdropped event
   */
  async handleAirdroppedEvent(event: AirdroppedEvent): Promise<void> {
    try {
      // Extract and validate event data
      this.validateEventData(event, ['operator', 'recipientCount', 'totalQuantity', 'txHash', 'blockNumber', 'launchpadAddress']);

      console.log(`🎁 Airdrop detected: ${event.totalQuantity} NFTs to ${event.recipientCount} recipients by ${event.operator}`);

      // Check for duplicates
      const isDuplicate = await this.isDuplicateActivity(
        event.txHash,
        ActivityType.AIRDROP_OCCURRED,
        event.launchpadAddress
      );

      if (isDuplicate) {
        console.log(`⚠️ Airdrop already processed: ${event.txHash}`);
        return;
      }

      // Fetch launchpad data from database
      const launchpad = await this.fetchLaunchpad(event.launchpadAddress);
      if (!launchpad) return;

      // Truncate operator address
      const operatorShort = this.truncateAddress(event.operator);

      // Create activity with ActivityType.AIRDROP_OCCURRED
      await this.writeActivityWithRetry({
        chainId: this.context.chainId,
        factoryId: launchpad.factoryId,
        launchpadId: launchpad.id,
        type: ActivityType.AIRDROP_OCCURRED,
        actor: event.operator,
        description: `Airdropped by ${operatorShort}`,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        metadata: {
          operator: event.operator,
          operatorShort,
          recipientCount: event.recipientCount.toString(),
          totalQuantity: event.totalQuantity.toString(),
          collectionName: launchpad.name,
          collectionSymbol: launchpad.symbol,
          collectionImage: launchpad.metadata?.image || null
        }
      });

      console.log(`✅ Airdrop activity recorded: ${event.txHash}`);

    } catch (error) {
      console.error(`❌ Error handling airdropped event:`, error);
      await this.logEventError('Airdropped', error, event, 'high');
    }
  }

  /**
   * Handle PhaseAdded event
   */
  async handlePhaseAddedEvent(event: PhaseAddedEvent): Promise<void> {
    try {
      // Extract and validate event data
      this.validateEventData(event, ['phaseId', 'name', 'startTime', 'endTime', 'price', 'maxMintPerWallet', 'totalLimit', 'txHash', 'blockNumber', 'launchpadAddress']);

      console.log(`📅 Phase added: ${event.name} (ID: ${event.phaseId}) for ${event.launchpadAddress}`);

      // Check for duplicates
      const isDuplicate = await this.isDuplicateActivity(
        event.txHash,
        ActivityType.PHASE_CREATED,
        event.launchpadAddress
      );

      if (isDuplicate) {
        console.log(`⚠️ Phase addition already processed: ${event.txHash}`);
        return;
      }

      // Fetch launchpad data
      const launchpad = await this.fetchLaunchpad(event.launchpadAddress);
      if (!launchpad) return;

      // Convert timestamps to Date objects
      const startTime = new Date(Number(event.startTime) * 1000);
      const endTime = new Date(Number(event.endTime) * 1000);

      // Determine phase type based on price and name
      let phaseType: 'PRESALE' | 'PUBLIC' | 'ALLOWLIST' | 'FREE' = 'PUBLIC';
      const nameLower = event.name.toLowerCase();
      if (event.price === BigInt(0)) {
        phaseType = 'FREE';
      } else if (nameLower.includes('presale') || nameLower.includes('pre-sale')) {
        phaseType = 'PRESALE';
      } else if (nameLower.includes('allowlist') || nameLower.includes('whitelist')) {
        phaseType = 'ALLOWLIST';
      }

      // Use a transaction to ensure atomic update with activity creation
      await prisma.$transaction(async (tx) => {
        // Create new LaunchpadPhase record when PhaseAdded event occurs
        await tx.launchpadPhase.create({
          data: {
            launchpadId: launchpad.id,
            phaseIndex: Number(event.phaseId),  // Store smart contract phase index
            name: event.name,
            phaseType: phaseType,
            startTime: startTime,
            endTime: endTime,
            price: event.price.toString(),
            maxMintPerWallet: Number(event.maxMintPerWallet),
            totalLimit: Number(event.totalLimit),
            mintedCount: 0,
            isActive: true
          }
        });

        // Create activity with ActivityType.PHASE_CREATED
        await tx.activity.create({
          data: {
            chainId: this.context.chainId,
            factoryId: launchpad.factoryId,
            launchpadId: launchpad.id,
            type: ActivityType.PHASE_CREATED,
            actor: launchpad.creator,
            description: `Phase "${event.name}" added`,
            txHash: event.txHash,
            blockNumber: event.blockNumber,
            metadata: {
              phaseId: event.phaseId.toString(),
              phaseName: event.name,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              price: event.price.toString(),
              maxMintPerWallet: event.maxMintPerWallet.toString(),
              totalLimit: event.totalLimit.toString(),
              collectionName: launchpad.name,
              collectionSymbol: launchpad.symbol,
              collectionImage: launchpad.metadata?.image || null
            }
          }
        });
      });

      console.log(`✅ Phase addition activity recorded and phase created in database: ${event.txHash}`);

    } catch (error) {
      console.error(`❌ Error handling phase added event:`, error);
      await this.logEventError('PhaseAdded', error, event, 'high');
    }
  }

  /**
   * Handle PhaseUpdated event
   */
  async handlePhaseUpdatedEvent(event: PhaseUpdatedEvent): Promise<void> {
    try {
      // Extract and validate event data
      this.validateEventData(event, ['phaseId', 'name', 'startTime', 'endTime', 'price', 'maxMintPerWallet', 'totalLimit', 'txHash', 'blockNumber', 'launchpadAddress']);

      console.log(`🔄 Phase updated: ${event.name} (ID: ${event.phaseId}) for ${event.launchpadAddress}`);

      // Check for duplicates
      const isDuplicate = await this.isDuplicateActivity(
        event.txHash,
        ActivityType.PHASE_UPDATED,
        event.launchpadAddress
      );

      if (isDuplicate) {
        console.log(`⚠️ Phase update already processed: ${event.txHash}`);
        return;
      }

      // Fetch launchpad data
      const launchpad = await this.fetchLaunchpad(event.launchpadAddress);
      if (!launchpad) return;

      // Convert timestamps to Date objects
      const startTime = new Date(Number(event.startTime) * 1000);
      const endTime = new Date(Number(event.endTime) * 1000);

      // Determine phase type based on price and name
      let phaseType: 'PRESALE' | 'PUBLIC' | 'ALLOWLIST' | 'FREE' = 'PUBLIC';
      const nameLower = event.name.toLowerCase();
      if (event.price === BigInt(0)) {
        phaseType = 'FREE';
      } else if (nameLower.includes('presale') || nameLower.includes('pre-sale')) {
        phaseType = 'PRESALE';
      } else if (nameLower.includes('allowlist') || nameLower.includes('whitelist')) {
        phaseType = 'ALLOWLIST';
      }

      // Use a transaction to ensure atomic update with activity creation
      await prisma.$transaction(async (tx) => {
        // Find existing phase by launchpadId and phase name or create if not exists
        const existingPhase = await tx.launchpadPhase.findFirst({
          where: {
            launchpadId: launchpad.id,
            name: event.name
          }
        });

        if (existingPhase) {
          // Update existing LaunchpadPhase record with new parameters
          await tx.launchpadPhase.update({
            where: { id: existingPhase.id },
            data: {
              phaseType: phaseType,
              startTime: startTime,
              endTime: endTime,
              price: event.price.toString(),
              maxMintPerWallet: Number(event.maxMintPerWallet),
              totalLimit: Number(event.totalLimit),
            }
          });
        }

        // Create activity with ActivityType.PHASE_UPDATED
        await tx.activity.create({
          data: {
            chainId: this.context.chainId,
            factoryId: launchpad.factoryId,
            launchpadId: launchpad.id,
            type: ActivityType.PHASE_UPDATED,
            actor: launchpad.creator,
            description: `Phase "${event.name}" updated`,
            txHash: event.txHash,
            blockNumber: event.blockNumber,
            metadata: {
              phaseId: event.phaseId.toString(),
              phaseName: event.name,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              price: event.price.toString(),
              maxMintPerWallet: event.maxMintPerWallet.toString(),
              totalLimit: event.totalLimit.toString(),
              collectionName: launchpad.name,
              collectionSymbol: launchpad.symbol,
              collectionImage: launchpad.metadata?.image || null
            }
          }
        });
      });

      console.log(`✅ Phase update activity recorded and phase updated in database: ${event.txHash}`);

    } catch (error) {
      console.error(`❌ Error handling phase updated event:`, error);
      await this.logEventError('PhaseUpdated', error, event, 'high');
    }
  }

  /**
   * Handle Revealed event
   */
  async handleRevealedEvent(event: RevealedEvent): Promise<void> {
    try {
      // Extract and validate event data
      this.validateEventData(event, ['baseURI', 'txHash', 'blockNumber', 'launchpadAddress']);

      console.log(`🎭 Collection revealed: ${event.baseURI} for ${event.launchpadAddress}`);

      // Check for duplicates
      const isDuplicate = await this.isDuplicateActivity(
        event.txHash,
        ActivityType.COLLECTION_REVEALED,
        event.launchpadAddress
      );

      if (isDuplicate) {
        console.log(`⚠️ Reveal already processed: ${event.txHash}`);
        return;
      }

      // Fetch launchpad data
      const launchpad = await this.fetchLaunchpad(event.launchpadAddress);
      if (!launchpad) return;

      // Use a transaction to ensure atomic update with activity creation
      await prisma.$transaction(async (tx) => {
        // Update Launchpad record to set revealed status and baseURI
        await tx.launchpad.update({
          where: { id: launchpad.id },
          data: {
            baseURI: event.baseURI,
          }
        });

        // Create activity with ActivityType.COLLECTION_REVEALED
        await tx.activity.create({
          data: {
            chainId: this.context.chainId,
            factoryId: launchpad.factoryId,
            launchpadId: launchpad.id,
            type: ActivityType.COLLECTION_REVEALED,
            actor: launchpad.creator,
            description: `Collection revealed`,
            txHash: event.txHash,
            blockNumber: event.blockNumber,
            metadata: {
              baseURI: event.baseURI,
              collectionName: launchpad.name,
              collectionSymbol: launchpad.symbol,
              collectionImage: launchpad.metadata?.image || null
            }
          }
        });
      });

      console.log(`✅ Reveal activity recorded and collection revealed status updated: ${event.txHash}`);

    } catch (error) {
      console.error(`❌ Error handling revealed event:`, error);
      await this.logEventError('Revealed', error, event, 'high');
    }
  }
}
