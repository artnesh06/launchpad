// Shared sync queue for mint transaction processing
// In production, replace with Redis or similar distributed cache

export interface SyncJob {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export const syncQueue = new Map<string, SyncJob>();
