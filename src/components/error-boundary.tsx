'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon } from '@hugeicons/core-free-icons';
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 * 
 * Requirements: 6.2 - Error handling with retry functionality
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      return (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-[#2F3336] bg-card p-8">
          <div className="max-w-md text-center">
            <div className="mb-4 flex justify-center">
              <HugeiconsIcon icon={AlertCircleIcon} size={48} className="text-destructive" />
            </div>
            <h2 className="mb-2 font-mono text-xl font-bold text-foreground">
              Something went wrong
            </h2>
            <p className="mb-6 font-mono text-sm text-muted-foreground">
              {this.state.error.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={this.handleReset} variant="default">
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
