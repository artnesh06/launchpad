/**
 * Comprehensive Logging Utility
 * 
 * Provides structured logging with timestamps and context for all error types.
 * Supports blockchain API failures, Discord API failures, signature verification failures,
 * and database operation failures.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export interface LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: Record<string, any>;
}

export class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Log blockchain API failures with chain name, contract address, and error details
   * Requirement: 12.1
   */
  logBlockchainAPIFailure(
    chainName: string,
    contractAddress: string,
    error: Error | unknown,
    additionalContext?: Record<string, any>
  ): void {
    const logEntry: LogContext = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message: 'Blockchain API failure',
      details: {
        service: this.serviceName,
        chainName,
        contractAddress,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        ...additionalContext,
      },
    };

    console.error(JSON.stringify(logEntry, null, 2));
  }

  /**
   * Log Discord API failures with operation type, user ID, and error details
   * Requirement: 12.2
   */
  logDiscordAPIFailure(
    operationType: string,
    userId: string,
    error: Error | unknown,
    additionalContext?: Record<string, any>
  ): void {
    const logEntry: LogContext = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message: 'Discord API failure',
      details: {
        service: this.serviceName,
        operationType,
        userId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        ...additionalContext,
      },
    };

    console.error(JSON.stringify(logEntry, null, 2));
  }

  /**
   * Log signature verification failures with wallet address and reason
   * Requirement: 12.3
   */
  logSignatureVerificationFailure(
    walletAddress: string,
    reason: string,
    additionalContext?: Record<string, any>
  ): void {
    const logEntry: LogContext = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message: 'Signature verification failure',
      details: {
        service: this.serviceName,
        walletAddress,
        reason,
        ...additionalContext,
      },
    };

    console.error(JSON.stringify(logEntry, null, 2));
  }

  /**
   * Log database operation failures with operation type and error details
   * Requirement: 12.4
   */
  logDatabaseOperationFailure(
    operationType: string,
    error: Error | unknown,
    additionalContext?: Record<string, any>
  ): void {
    const logEntry: LogContext = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message: 'Database operation failure',
      details: {
        service: this.serviceName,
        operationType,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        ...additionalContext,
      },
    };

    console.error(JSON.stringify(logEntry, null, 2));
  }

  /**
   * General purpose info logging with timestamp
   * Requirement: 12.5
   */
  info(message: string, details?: Record<string, any>): void {
    const logEntry: LogContext = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      details: {
        service: this.serviceName,
        ...details,
      },
    };

    console.log(JSON.stringify(logEntry, null, 2));
  }

  /**
   * General purpose warning logging with timestamp
   * Requirement: 12.5
   */
  warn(message: string, details?: Record<string, any>): void {
    const logEntry: LogContext = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      details: {
        service: this.serviceName,
        ...details,
      },
    };

    console.warn(JSON.stringify(logEntry, null, 2));
  }

  /**
   * General purpose error logging with timestamp
   * Requirement: 12.5
   */
  error(message: string, error?: Error | unknown, details?: Record<string, any>): void {
    const logEntry: LogContext = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      details: {
        service: this.serviceName,
        errorMessage: error instanceof Error ? error.message : error ? String(error) : undefined,
        errorStack: error instanceof Error ? error.stack : undefined,
        ...details,
      },
    };

    console.error(JSON.stringify(logEntry, null, 2));
  }

  /**
   * Debug logging with timestamp
   * Requirement: 12.5
   */
  debug(message: string, details?: Record<string, any>): void {
    const logEntry: LogContext = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      details: {
        service: this.serviceName,
        ...details,
      },
    };

    console.debug(JSON.stringify(logEntry, null, 2));
  }
}
