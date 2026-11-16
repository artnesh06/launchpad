// Admin API Client
// Centralized API client for admin panel with consistent error handling

import type { ApiResponse, PaginatedResponse } from '@/types/admin';

/**
 * Custom error class for admin panel operations
 */
export class AdminPanelError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high',
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AdminPanelError';
  }
}

/**
 * Error handler utility to convert unknown errors to AdminPanelError
 */
export function handleApiError(error: unknown): AdminPanelError {
  if (error instanceof AdminPanelError) {
    return error;
  }

  if (error instanceof Error) {
    // Network error
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new AdminPanelError(
        'Network error. Please check your connection.',
        'NETWORK_ERROR',
        'medium',
        true
      );
    }

    // Timeout error
    if (error.message.includes('timeout')) {
      return new AdminPanelError(
        'Request timed out. Please try again.',
        'TIMEOUT_ERROR',
        'medium',
        true
      );
    }

    // Generic error
    return new AdminPanelError(
      error.message,
      'UNKNOWN_ERROR',
      'medium',
      false
    );
  }

  return new AdminPanelError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    'medium',
    false
  );
}

/**
 * Centralized API client for admin panel operations
 */
export class AdminApiClient {
  private baseUrl = '/api/admin';

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * Parse API response and handle errors
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      throw new AdminPanelError(
        'Invalid response format from server',
        'INVALID_RESPONSE',
        'high',
        false
      );
    }

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error || data.message || response.statusText;
      
      // Handle specific HTTP status codes
      switch (response.status) {
        case 401:
          throw new AdminPanelError(
            'Unauthorized. Please log in again.',
            'UNAUTHORIZED',
            'high',
            false
          );
        case 403:
          throw new AdminPanelError(
            'Forbidden. You do not have permission to perform this action.',
            'FORBIDDEN',
            'high',
            false
          );
        case 404:
          throw new AdminPanelError(
            'Resource not found.',
            'NOT_FOUND',
            'medium',
            false
          );
        case 422:
          throw new AdminPanelError(
            errorMessage || 'Validation error. Please check your input.',
            'VALIDATION_ERROR',
            'low',
            false
          );
        case 429:
          throw new AdminPanelError(
            'Too many requests. Please try again later.',
            'RATE_LIMIT',
            'medium',
            true
          );
        case 500:
        case 502:
        case 503:
        case 504:
          throw new AdminPanelError(
            'Server error. Please try again later.',
            'SERVER_ERROR',
            'high',
            true
          );
        default:
          throw new AdminPanelError(
            errorMessage,
            'API_ERROR',
            'medium',
            true
          );
      }
    }

    return data;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const url = this.buildUrl(endpoint, params);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      return await this.parseResponse<T>(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const url = this.buildUrl(endpoint);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.parseResponse<T>(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const url = this.buildUrl(endpoint);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.parseResponse<T>(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const url = this.buildUrl(endpoint);
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.parseResponse<T>(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    try {
      const url = this.buildUrl(endpoint);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      return await this.parseResponse<T>(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

// Export singleton instance
export const adminApiClient = new AdminApiClient();
