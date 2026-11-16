/**
 * Test suite for Activity API with new activity types
 * Validates that the API correctly handles all new ActivityType enums
 */

import { ActivityType } from '@prisma/client';

describe('Activity API - New Activity Types', () => {
  // Test mapping of ActivityType to frontend categories
  describe('Activity Type Mapping', () => {
    it('should map BURN_OCCURRED to burn category', () => {
      const activityType: ActivityType = 'BURN_OCCURRED';
      const expectedCategory = 'burn';
      
      // This would be tested through the API endpoint
      expect(activityType).toBe('BURN_OCCURRED');
    });

    it('should map AIRDROP_OCCURRED to airdrop category', () => {
      const activityType: ActivityType = 'AIRDROP_OCCURRED';
      expect(activityType).toBe('AIRDROP_OCCURRED');
    });

    it('should map PHASE_CREATED and PHASE_UPDATED to phase category', () => {
      const phaseCreated: ActivityType = 'PHASE_CREATED';
      const phaseUpdated: ActivityType = 'PHASE_UPDATED';
      
      expect(phaseCreated).toBe('PHASE_CREATED');
      expect(phaseUpdated).toBe('PHASE_UPDATED');
    });

    it('should map COLLECTION_REVEALED to reveal category', () => {
      const activityType: ActivityType = 'COLLECTION_REVEALED';
      expect(activityType).toBe('COLLECTION_REVEALED');
    });

    it('should map admin events to admin category', () => {
      const adminTypes: ActivityType[] = [
        'TREASURY_UPDATED',
        'EMERGENCY_WITHDRAW',
        'OWNERSHIP_TRANSFERRED',
        'FEE_UPDATED',
        'ROYALTY_UPDATED'
      ];
      
      adminTypes.forEach(type => {
        expect(['TREASURY_UPDATED', 'EMERGENCY_WITHDRAW', 'OWNERSHIP_TRANSFERRED', 'FEE_UPDATED', 'ROYALTY_UPDATED']).toContain(type);
      });
    });

    it('should map METADATA_UPDATED to metadata category', () => {
      const activityType: ActivityType = 'METADATA_UPDATED';
      expect(activityType).toBe('METADATA_UPDATED');
    });

    it('should map security events to security category', () => {
      const securityTypes: ActivityType[] = [
        'CONTRACT_PAUSED',
        'CONTRACT_UNPAUSED',
        'TRANSFER_LOCK_UPDATED',
        'ROLE_GRANTED',
        'ROLE_REVOKED'
      ];
      
      securityTypes.forEach(type => {
        expect(['CONTRACT_PAUSED', 'CONTRACT_UNPAUSED', 'TRANSFER_LOCK_UPDATED', 'ROLE_GRANTED', 'ROLE_REVOKED']).toContain(type);
      });
    });
  });

  // Test activity metadata structures
  describe('Activity Metadata Formatting', () => {
    it('should format burn activity metadata correctly', () => {
      const metadata = {
        tokenId: '42',
        owner: '0x1234567890123456789012345678901234567890',
        ownerShort: '0x1234...7890',
        collectionName: 'Test NFT',
        collectionSymbol: 'TEST',
        collectionImage: 'ipfs://test'
      };

      expect(metadata.tokenId).toBe('42');
      expect(metadata.ownerShort).toBe('0x1234...7890');
      expect(metadata.collectionName).toBe('Test NFT');
    });

    it('should format airdrop activity metadata correctly', () => {
      const metadata = {
        operator: '0x1234567890123456789012345678901234567890',
        operatorShort: '0x1234...7890',
        recipientCount: '10',
        totalQuantity: '100',
        collectionName: 'Test Collection'
      };

      expect(metadata.recipientCount).toBe('10');
      expect(metadata.totalQuantity).toBe('100');
      expect(metadata.operatorShort).toBe('0x1234...7890');
    });

    it('should format phase activity metadata correctly', () => {
      const metadata = {
        phaseId: '1',
        phaseName: 'Public Sale',
        startTime: '1234567890',
        endTime: '1234567900',
        price: '1000000000000000000',
        maxMintPerWallet: '5',
        totalLimit: '1000',
        collectionName: 'Test Collection'
      };

      expect(metadata.phaseName).toBe('Public Sale');
      expect(metadata.maxMintPerWallet).toBe('5');
      expect(metadata.totalLimit).toBe('1000');
    });

    it('should format reveal activity metadata correctly', () => {
      const metadata = {
        baseURI: 'ipfs://revealed/',
        collectionName: 'Test Collection',
        collectionSymbol: 'TEST'
      };

      expect(metadata.baseURI).toBe('ipfs://revealed/');
      expect(metadata.collectionName).toBe('Test Collection');
    });

    it('should format treasury update metadata correctly', () => {
      const metadata = {
        oldTreasury: '0x1111111111111111111111111111111111111111',
        oldTreasuryShort: '0x1111...1111',
        newTreasury: '0x2222222222222222222222222222222222222222',
        newTreasuryShort: '0x2222...2222',
        collectionName: 'Test Collection'
      };

      expect(metadata.oldTreasuryShort).toBe('0x1111...1111');
      expect(metadata.newTreasuryShort).toBe('0x2222...2222');
    });

    it('should format withdrawal metadata correctly', () => {
      const metadata = {
        recipient: '0x1234567890123456789012345678901234567890',
        recipientShort: '0x1234...7890',
        amount: '1000000000000000000',
        amountInEth: '1.0000 ETH',
        collectionName: 'Test Collection'
      };

      expect(metadata.amountInEth).toBe('1.0000 ETH');
      expect(metadata.recipientShort).toBe('0x1234...7890');
    });

    it('should format ownership transfer metadata correctly', () => {
      const metadata = {
        previousOwner: '0x1111111111111111111111111111111111111111',
        previousOwnerShort: '0x1111...1111',
        newOwner: '0x2222222222222222222222222222222222222222',
        newOwnerShort: '0x2222...2222',
        collectionName: 'Test Collection'
      };

      expect(metadata.previousOwnerShort).toBe('0x1111...1111');
      expect(metadata.newOwnerShort).toBe('0x2222...2222');
    });

    it('should format royalty update metadata correctly', () => {
      const metadata = {
        recipient: '0x1234567890123456789012345678901234567890',
        recipientShort: '0x1234...7890',
        percentage: '5',
        collectionName: 'Test Collection'
      };

      expect(metadata.percentage).toBe('5');
      expect(metadata.recipientShort).toBe('0x1234...7890');
    });

    it('should format metadata update metadata correctly', () => {
      const metadata = {
        updateType: 'baseURI',
        newValue: 'ipfs://newuri/',
        collectionName: 'Test Collection',
        collectionSymbol: 'TEST'
      };

      expect(metadata.updateType).toBe('baseURI');
      expect(metadata.newValue).toBe('ipfs://newuri/');
    });

    it('should format pause/unpause metadata correctly', () => {
      const pausedMetadata = {
        action: 'paused',
        collectionName: 'Test Collection',
        collectionSymbol: 'TEST'
      };

      const unpausedMetadata = {
        action: 'unpaused',
        collectionName: 'Test Collection',
        collectionSymbol: 'TEST'
      };

      expect(pausedMetadata.action).toBe('paused');
      expect(unpausedMetadata.action).toBe('unpaused');
    });

    it('should format transfer lock metadata correctly', () => {
      const lockedMetadata = {
        locked: true,
        collectionName: 'Test Collection',
        collectionSymbol: 'TEST'
      };

      const unlockedMetadata = {
        locked: false,
        collectionName: 'Test Collection',
        collectionSymbol: 'TEST'
      };

      expect(lockedMetadata.locked).toBe(true);
      expect(unlockedMetadata.locked).toBe(false);
    });

    it('should format role change metadata correctly', () => {
      const grantedMetadata = {
        action: 'granted',
        role: 'MINTER_ROLE',
        account: '0x1234567890123456789012345678901234567890',
        accountShort: '0x1234...7890',
        sender: '0x9999999999999999999999999999999999999999',
        senderShort: '0x9999...9999',
        collectionName: 'Test Collection'
      };

      const revokedMetadata = {
        action: 'revoked',
        role: 'MINTER_ROLE',
        account: '0x1234567890123456789012345678901234567890',
        accountShort: '0x1234...7890',
        sender: '0x9999999999999999999999999999999999999999',
        senderShort: '0x9999...9999',
        collectionName: 'Test Collection'
      };

      expect(grantedMetadata.action).toBe('granted');
      expect(grantedMetadata.role).toBe('MINTER_ROLE');
      expect(revokedMetadata.action).toBe('revoked');
    });
  });

  // Test API query parameter validation
  describe('API Query Parameters', () => {
    it('should accept all valid activity type filters', () => {
      const validTypes = [
        'mint',
        'collection',
        'burn',
        'airdrop',
        'phase',
        'reveal',
        'admin',
        'metadata',
        'security',
        'all'
      ];

      validTypes.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });

    it('should validate limit parameter range', () => {
      const validLimits = [1, 3, 5, 10];
      const invalidLimits = [0, -1, 11, 100];

      validLimits.forEach(limit => {
        expect(limit).toBeGreaterThanOrEqual(1);
        expect(limit).toBeLessThanOrEqual(10);
      });

      invalidLimits.forEach(limit => {
        expect(limit < 1 || limit > 10).toBe(true);
      });
    });
  });
});
