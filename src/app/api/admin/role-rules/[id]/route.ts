import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
/**
 * Admin Role Rules Configuration API Endpoints (Single Role Rule)
 * 
 * Provides update and delete operations for specific role rule configurations.
 * 
 * Requirements: 8.2, 8.8, 8.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { verificationDb } from '@/lib/verification-db';
import { configurationValidator } from '@/lib/verification/configuration-validator';
import type { RoleRuleConfig } from '@/lib/verification/configuration-validator';

/**
 * PUT /api/admin/role-rules/:id
 * 
 * Updates an existing role rule configuration.
 * Validates all fields and referenced collections.
 * 
 * Requirements: 8.2, 8.8, 8.9
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { id } = params;
    const body = await request.json();
    const { name, discordRoleId, ruleType, contracts, threshold, requirementType } = body;

    // Check if role rule exists
    const existingRoleRule = await verificationDb.verificationRoleRule.findUnique({
      where: { id },
    });

    if (!existingRoleRule) {
      return NextResponse.json(
        {
          success: false,
          error: 'Role rule not found',
        },
        { status: 404 }
      );
    }

    // Normalize ruleType to uppercase to match Prisma enum
    const normalizedRuleType = ruleType?.toUpperCase() as 'INDIVIDUAL_CONTRACT' | 'MULTI_CONTRACT' | 'NFT_THRESHOLD';
    
    // Normalize requirementType to uppercase to match Prisma enum
    const normalizedRequirementType = requirementType?.toUpperCase() as 'ANY' | 'ALL' | undefined;

    // Prepare role rule configuration
    const roleRuleConfig: RoleRuleConfig = {
      name,
      discordRoleId,
      ruleType: normalizedRuleType,
      contracts,
      threshold,
      requirementType: normalizedRequirementType,
    };

    // Validate role rule configuration
    const validation = await configurationValidator.validateRoleRule(roleRuleConfig);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Update role rule in database with transaction
    const updatedRoleRule = await verificationDb.$transaction(async (tx) => {
      // Update the role rule
      const updated = await tx.verificationRoleRule.update({
        where: { id },
        data: {
          name: roleRuleConfig.name,
          discordRoleId: roleRuleConfig.discordRoleId,
          ruleType: roleRuleConfig.ruleType,
          threshold: roleRuleConfig.threshold,
          requirementType: roleRuleConfig.requirementType,
        },
      });

      // Delete existing collection associations
      await tx.verificationRoleRuleCollection.deleteMany({
        where: { roleRuleId: id },
      });

      // Create new collection associations
      if (roleRuleConfig.contracts && roleRuleConfig.contracts.length > 0) {
        await tx.verificationRoleRuleCollection.createMany({
          data: roleRuleConfig.contracts.map(collectionId => ({
            roleRuleId: id,
            collectionId,
          })),
        });
      }

      // Ensure the Discord role is in managed_roles table
      // This allows the bot to assign/remove this role
      await tx.verificationManagedRole.upsert({
        where: {
          discordRoleId: roleRuleConfig.discordRoleId,
        },
        update: {
          roleName: roleRuleConfig.name,
          updatedAt: new Date(),
        },
        create: {
          discordRoleId: roleRuleConfig.discordRoleId,
          roleName: roleRuleConfig.name,
        },
      });

      // Fetch the complete role rule with relations
      const completeRule = await tx.verificationRoleRule.findUnique({
        where: { id },
        include: {
          collections: {
            include: {
              collection: {
                include: {
                  chain: true,
                },
              },
            },
          },
        },
      });

      return completeRule;
    });

    return NextResponse.json({
      success: true,
      data: updatedRoleRule,
    });
  } catch (error) {
    console.error('Failed to update role rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update role rule',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/role-rules/:id
 * 
 * Deletes a role rule configuration.
 * The associated role_rule_collections entries are automatically deleted via CASCADE.
 * 
 * Requirements: 8.9
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { id } = params;

    // Check if role rule exists
    const existingRoleRule = await verificationDb.verificationRoleRule.findUnique({
      where: { id },
    });

    if (!existingRoleRule) {
      return NextResponse.json(
        {
          success: false,
          error: 'Role rule not found',
        },
        { status: 404 }
      );
    }

    // Delete role rule with transaction
    await verificationDb.$transaction(async (tx) => {
      // Delete role rule (cascade will handle role_rule_collections)
      await tx.verificationRoleRule.delete({
        where: { id },
      });

      // Check if this Discord role is still used by other role rules
      const otherRulesWithSameRole = await tx.verificationRoleRule.findFirst({
        where: {
          discordRoleId: existingRoleRule.discordRoleId,
          id: { not: id },
        },
      });

      // If no other rules use this role, remove it from managed_roles
      if (!otherRulesWithSameRole) {
        await tx.verificationManagedRole.deleteMany({
          where: {
            discordRoleId: existingRoleRule.discordRoleId,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Role rule deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete role rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete role rule',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
