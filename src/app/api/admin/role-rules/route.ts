import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
/**
 * Admin Role Rules Configuration API Endpoints
 * 
 * Provides CRUD operations for role rule configurations.
 * 
 * Requirements: 8.1, 8.2, 8.8, 8.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { verificationDb } from '@/lib/verification-db';
import { configurationValidator } from '@/lib/verification/configuration-validator';
import type { RoleRuleConfig } from '@/lib/verification/configuration-validator';

/**
 * GET /api/admin/role-rules
 * 
 * Retrieves all configured role rules.
 * 
 * Requirements: 8.1
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const roleRules = await verificationDb.verificationRoleRule.findMany({
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json({
      success: true,
      data: roleRules,
    });
  } catch (error) {
    console.error('Failed to fetch role rules:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch role rules',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/role-rules
 * 
 * Creates a new role rule configuration.
 * Validates all required fields and referenced collections.
 * 
 * Requirements: 8.2, 8.8, 8.9
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { name, discordRoleId, ruleType, contracts, threshold, requirementType } = body;

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

    // Create role rule in database with transaction
    const roleRule = await verificationDb.$transaction(async (tx) => {
      // Create the role rule
      const createdRule = await tx.verificationRoleRule.create({
        data: {
          name: roleRuleConfig.name,
          discordRoleId: roleRuleConfig.discordRoleId,
          ruleType: roleRuleConfig.ruleType,
          threshold: roleRuleConfig.threshold,
          requirementType: roleRuleConfig.requirementType,
        },
      });

      // Create the role rule collection associations
      if (roleRuleConfig.contracts && roleRuleConfig.contracts.length > 0) {
        await tx.verificationRoleRuleCollection.createMany({
          data: roleRuleConfig.contracts.map(collectionId => ({
            roleRuleId: createdRule.id,
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
        where: { id: createdRule.id },
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
      data: roleRule,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create role rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create role rule',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
