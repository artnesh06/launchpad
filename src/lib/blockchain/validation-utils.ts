/**
 * Validation Utilities for Event Processing
 * 
 * This file contains validation helper functions used by the ActivityListener
 * to validate event data before processing.
 */

import { prisma } from '@/lib/prisma';
import { ActivityType } from '@prisma/client';
import { logError } from '@/utils/error-logger';
import { ErrorCounter, ErrorLogData, ErrorSeverity } from './event-types';

/**
 * Validate event data by checking required fields and data types
 * @param event - The event object to validate
 * @param requiredFields - Array of field names that must be present
 * @throws Error if validation fails
 */
export function validateEventData(event: any, requiredFields: string[]): void {
  if (!event) {
    throw new Error('Event data is null or undefined');
  }

  // Check for required fields
  for (const field of requiredFields) {
    if (event[field] === undefined || event[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate transaction hash if present
  if (event.txHash && !isValidTxHash(event.txHash)) {
    throw new Error(`Invalid transaction hash: ${event.txHash}`);
  }

  // Validate block number if present
  if (event.blockNumber !== undefined && event.blockNumber !== null) {
    if (typeof event.blockNumber !== 'number' || event.blockNumber < 0) {
      throw new Error(`Invalid block number: ${event.blockNumber}`);
    }
  }

  // Validate Ethereum addresses if present
  const addressFields = ['launchpadAddress', 'owner', 'creator', 'to', 'from', 'recipient', 'account', 'sender', 'previousOwner', 'newOwner', 'oldTreasury', 'newTreasury'];
  for (const field of addressFields) {
    if (event[field] && !isValidAddress(event[field])) {
      throw new Error(`Invalid Ethereum address for field ${field}: ${event[field]}`);
    }
  }
}

/**
 * Validate if a string is a valid Ethereum transaction hash
 * @param txHash - The transaction hash to validate
 * @returns true if valid, false otherwise
 */
export function isValidTxHash(txHash: string): boolean {
  if (typeof txHash !== 'string') {
    return false;
  }
  // Transaction hash should be 66 characters (0x + 64 hex chars)
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

/**
 * Validate if a string is a valid Ethereum address
 * @param address - The address to validate
 * @returns true if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  if (typeof address !== 'string') {
    return false;
  }
  // Address should be 42 characters (0x + 40 hex chars)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if an activity has already been recorded (deduplication)
 * @param txHash - Transaction hash
 * @param eventType - Activity type
 * @param launchpadAddress - Launchpad contract address
 * @returns true if duplicate, false otherwise
 */
export async function isDuplicateActivity(
  txHash: string,
  eventType: ActivityType,
  launchpadAddress?: string
): Promise<boolean> {
  try {
    const whereClause: any = {
      txHash,
      type: eventType,
    };

    // Add launchpad address to query if provided
    if (launchpadAddress) {
      const launchpad = await prisma.launchpad.findUnique({
        where: { contractAddress: launchpadAddress }
      });
      if (launchpad) {
        whereClause.launchpadId = launchpad.id;
      }
    }

    const existing = await prisma.activity.findFirst({
      where: whereClause
    });

    return existing !== null;
  } catch (error) {
    console.error('Error checking for duplicate activity:', error);
    // On error, assume not duplicate to avoid blocking new activities
    return false;
  }
}

/**
 * Increment error counter for a specific event type and trigger alert if threshold exceeded
 * @param errorCounters - Map of error counters
 * @param eventType - The type of event that encountered an error
 * @param errorThreshold - Threshold for triggering alerts
 * @param chainId - Chain ID for context
 * @param sendAdminAlert - Callback function to send admin alerts
 */
export function incrementErrorCounter(
  errorCounters: Map<string, ErrorCounter>,
  eventType: string,
  errorThreshold: number,
  chainId: number,
  sendAdminAlert: (alertData: any) => void
): void {
  const counter = errorCounters.get(eventType) || {
    eventType,
    count: 0,
    lastError: new Date(),
    threshold: errorThreshold
  };

  counter.count++;
  counter.lastError = new Date();

  errorCounters.set(eventType, counter);

  // Check if threshold exceeded
  if (counter.count >= counter.threshold) {
    sendAdminAlert({
      type: 'EVENT_HANDLER_FAILURE',
      eventType,
      errorCount: counter.count,
      lastError: counter.lastError,
      chainId
    });

    // Reset counter after alert
    counter.count = 0;
    errorCounters.set(eventType, counter);
  }
}

/**
 * Send alert to administrators about critical errors
 * @param alertData - Alert information
 */
export function sendAdminAlert(alertData: {
  type: string;
  eventType: string;
  errorCount: number;
  lastError: Date;
  chainId: number;
}): void {
  // Log critical alert
  console.error('🚨 ADMIN ALERT:', {
    ...alertData,
    message: `Event handler for ${alertData.eventType} has failed ${alertData.errorCount} times on chain ${alertData.chainId}`
  });

  // In production, this would send notifications via email, Slack, PagerDuty, etc.
  // For now, we use the centralized error logger with critical severity
  logError(
    `ActivityListener.AdminAlert`,
    new Error(`Event handler failure threshold exceeded for ${alertData.eventType}`),
    alertData,
    'critical'
  );
}

/**
 * Log event processing error with full context
 * @param eventType - The type of event that encountered an error
 * @param error - The error that occurred
 * @param eventData - The event data being processed
 * @param severity - Error severity level
 * @param chainId - Chain ID for context
 * @param errorCounters - Map of error counters
 * @param errorThreshold - Threshold for triggering alerts
 * @param sendAdminAlertFn - Callback function to send admin alerts
 */
export async function logEventError(
  eventType: string,
  error: any,
  eventData: any,
  severity: ErrorSeverity = 'medium',
  chainId: number,
  errorCounters: Map<string, ErrorCounter>,
  errorThreshold: number,
  sendAdminAlertFn: (alertData: any) => void
): Promise<void> {
  try {
    const errorLogData: ErrorLogData = {
      eventType,
      eventData,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      severity,
      timestamp: new Date(),
      chainId,
      txHash: eventData?.txHash,
      blockNumber: eventData?.blockNumber
    };

    // Use centralized error logger
    logError(
      `ActivityListener.${eventType}`,
      error,
      errorLogData,
      severity
    );

    // Increment error counter for this event type
    incrementErrorCounter(errorCounters, eventType, errorThreshold, chainId, sendAdminAlertFn);

  } catch (logErr) {
    console.error('Failed to log event error:', logErr);
  }
}
