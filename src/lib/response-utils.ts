// lib/response-utils.ts
import { AxiosResponse } from 'axios';

/**
 * Extract data from standardized API response format
 * Handles both old direct format and new wrapped format
 */
export function extractResponseData<T = any>(response: AxiosResponse): T {
  // Check if response follows new standardized format
  if (response.data && typeof response.data === 'object' && 'success' in response.data) {
    // New format: { success: true, data: {...}, meta: {...} }
    return response.data.data;
  }
  
  // Old format: direct data
  return response.data;
}

/**
 * Check if response indicates success
 */
export function isSuccessResponse(response: AxiosResponse): boolean {
  // Check if response follows new standardized format
  if (response.data && typeof response.data === 'object' && 'success' in response.data) {
    return response.data.success === true;
  }
  
  // Old format: assume success if no error status
  return response.status >= 200 && response.status < 300;
}

/**
 * Normalize response to legacy format for backward compatibility
 * Returns response in format: { success: boolean, data: T, message?: string }
 */
export function normalizeLegacyResponse<T = any>(response: AxiosResponse): {
  success: boolean;
  data?: T;
  message?: string;
} {
  try {
    // Check if response follows new standardized format
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message || (response.data.success ? 'Success' : 'Error')
      };
    }
    
    // Old format: assume success if good status
    if (response.status >= 200 && response.status < 300) {
      return {
        success: true,
        data: response.data
      };
    }
    
    return {
      success: false,
      message: response.statusText || 'Request failed'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to process response'
    };
  }
}

/**
 * Extract error information from response
 */
export function extractErrorInfo(response: AxiosResponse): {
  code?: string;
  message: string;
  details?: any;
} {
  // Check if response follows new standardized error format
  if (response.data && typeof response.data === 'object' && 'success' in response.data && !response.data.success) {
    const error = response.data.error || {};
    return {
      code: error.code,
      message: error.message || 'An error occurred',
      details: error.details
    };
  }
  
  // Old format error handling
  if (response.data && typeof response.data === 'object' && 'error' in response.data) {
    return {
      message: response.data.error || 'An error occurred'
    };
  }
  
  // Fallback
  return {
    message: response.statusText || 'An error occurred'
  };
}