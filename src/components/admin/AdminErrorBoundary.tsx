'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, Refresh01Icon } from '@hugeicons/core-free-icons';
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Admin Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/50 bg-card p-8 shadow-lg">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <HugeiconsIcon icon={AlertCircleIcon} size={32} className="text-destructive" />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground">
                We encountered an unexpected error. Please try refreshing the page or go back.
              </p>
            </div>

            {this.state.error && (
              <div className="rounded-md bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">
                  Error: {this.state.error.message}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      View error details
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto text-xs text-muted-foreground">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={this.handleRetry}
                className="flex-1"
                variant="default"
              >
                <HugeiconsIcon icon={Refresh01Icon} size={16} className="mr-2" />
                Retry
              </Button>
              <Button
                onClick={this.handleGoBack}
                className="flex-1"
                variant="outline"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
