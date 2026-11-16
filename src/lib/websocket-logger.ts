/**
 * WebSocket Logger
 * 
 * Centralized logging utility for WebSocket events and errors
 * Supports different log levels and debug mode
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class WebSocketLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100; // Keep last 100 logs
  private debugMode: boolean;

  constructor() {
    // Enable debug mode if in development or if explicitly enabled
    this.debugMode = 
      process.env.NODE_ENV === 'development' || 
      (typeof window !== 'undefined' && localStorage.getItem('ws_debug') === 'true');
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ws_debug', enabled ? 'true' : 'false');
    }
  }

  /**
   * Log a message
   */
  private log(level: LogLevel, category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    // Add to logs array
    this.logs.push(entry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output based on level and debug mode
    if (this.debugMode || level === 'error' || level === 'warn') {
      const prefix = `[WS:${category}]`;
      const logData = data ? [prefix, message, data] : [prefix, message];

      switch (level) {
        case 'debug':
          console.debug(...logData);
          break;
        case 'info':
          console.log(...logData);
          break;
        case 'warn':
          console.warn(...logData);
          break;
        case 'error':
          console.error(...logData);
          break;
      }
    }
  }

  /**
   * Log connection state changes
   */
  logConnectionChange(status: string, details?: any) {
    this.log('info', 'Connection', `Status changed to: ${status}`, details);
  }

  /**
   * Log received events
   */
  logEventReceived(eventType: string, data?: any) {
    this.log('debug', 'Event', `Received: ${eventType}`, data);
  }

  /**
   * Log room subscription changes
   */
  logRoomChange(action: 'join' | 'leave', room: string) {
    this.log('info', 'Room', `${action === 'join' ? 'Joined' : 'Left'} room: ${room}`);
  }

  /**
   * Log errors
   */
  logError(category: string, message: string, error?: any) {
    this.log('error', category, message, error);
  }

  /**
   * Log reconnection attempts
   */
  logReconnection(attempt: number, maxAttempts: number) {
    this.log('warn', 'Reconnection', `Attempt ${attempt}/${maxAttempts}`);
  }

  /**
   * Log fallback mode activation
   */
  logFallbackMode(reason: string) {
    this.log('warn', 'Fallback', `Switched to fallback mode: ${reason}`);
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get error summary
   */
  getErrorSummary(): { count: number; recent: LogEntry[] } {
    const errors = this.getLogsByLevel('error');
    return {
      count: errors.length,
      recent: errors.slice(-5), // Last 5 errors
    };
  }
}

// Export singleton instance
export const wsLogger = new WebSocketLogger();

// Expose to window for debugging (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).wsLogger = wsLogger;
}
