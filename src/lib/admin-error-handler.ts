// Admin Error Handler Utilities
// Utilities for handling and displaying errors in the admin panel

import { AdminPanelError } from './admin-api-client';
import { toast } from 'sonner';

/**
 * Display error to user based on severity
 */
export function displayError(error: AdminPanelError | Error | unknown): void {
  const adminError = error instanceof AdminPanelError 
    ? error 
    : new AdminPanelError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        'UNKNOWN_ERROR',
        'medium',
        false
      );

  // Log error to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Admin Error]', {
      message: adminError.message,
      code: adminError.code,
      severity: adminError.severity,
      retryable: adminError.retryable,
      stack: adminError.stack,
    });
  }

  // Display error based on severity
  switch (adminError.severity) {
    case 'low':
      toast.error(adminError.message, {
        duration: 3000,
      });
      break;
    case 'medium':
      toast.error(adminError.message, {
        duration: 5000,
        description: adminError.retryable ? 'Please try again.' : undefined,
      });
      break;
    case 'high':
      toast.error(adminError.message, {
        duration: 7000,
        description: adminError.retryable 
          ? 'Please try again or contact support if the issue persists.' 
          : 'Please contact support if the issue persists.',
      });
      break;
  }
}

/**
 * Display success message
 */
export function displaySuccess(message: string, description?: string): void {
  toast.success(message, {
    duration: 3000,
    description,
  });
}

/**
 * Display info message
 */
export function displayInfo(message: string, description?: string): void {
  toast(message, {
    duration: 3000,
    description,
  });
}

/**
 * Display loading message with promise
 */
export function displayLoading<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error?: string;
  }
): void {
  toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: (err) => {
      const adminError = err instanceof AdminPanelError 
        ? err 
        : new AdminPanelError(
            err instanceof Error ? err.message : 'Operation failed',
            'UNKNOWN_ERROR',
            'medium',
            false
          );
      return messages.error || adminError.message;
    },
  });
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry if error is not retryable
      if (error instanceof AdminPanelError && !error.retryable) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (i === maxRetries - 1) {
        break;
      }
      
      // Wait with exponential backoff
      const delay = initialDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    showError?: boolean;
    showSuccess?: boolean;
    successMessage?: string;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const result = await fn(...args);
      
      if (options?.showSuccess && options?.successMessage) {
        displaySuccess(options.successMessage);
      }
      
      return result;
    } catch (error) {
      if (options?.showError !== false) {
        displayError(error);
      }
      throw error;
    }
  }) as T;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown): Record<string, any> {
  if (error instanceof AdminPanelError) {
    return {
      type: 'AdminPanelError',
      message: error.message,
      code: error.code,
      severity: error.severity,
      retryable: error.retryable,
      stack: error.stack,
    };
  }
  
  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  return {
    type: 'Unknown',
    value: String(error),
  };
}
