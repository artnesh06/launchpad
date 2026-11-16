export interface Account {
  id: string;
  name: string;
  phoneNumber?: string;
  isActive: boolean;
  stats?: any;
  instanceStatus?: {
    id: string;
    accountId: string;
    isReady: boolean;
    status:
      | 'connected'
      | 'disconnected'
      | 'connecting'
      | 'error'
      | 'qr_pending'
      | 'logged_out';
    lastSeen?: Date;
    qrCode?: string;
    deviceInfo?: {
      battery?: number;
      platform?: string;
      version?: string;
    };
    connectionInfo?: {
      isOnline: boolean;
      lastConnected?: Date;
      pushname?: string;
      wid?: string;
    };
  };
  settings?: AccountSettings;
  messages?: MessageSummary;
  chats?: ChatSummary;
  instance?: WhatsAppInstance;
  connection?: WhatsAppConnection;
  syncJobs?: SyncJobSummary;
}

export interface AutoReply {
  id: string;
  accountId: string;
  trigger: string;
  response: string;
  isActive: boolean;
  matchType: 'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX';
  priority: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BroadcastData {
  numbers: string[];
  message: string;
  accountIds?: string[];
}

export interface MessageData {
  to: string;
  message: string;
}

// Additional types for extended functionality
export interface AccountSettings {
  id: string;
  accountId: string;
  welcomeMessage?: string;
  autoReplyEnabled: boolean;
  businessHoursEnabled: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  timezone?: string;
  allowedNumbers: string[];
  blockedNumbers: string[];
  blacklistedNumbers: string[];
  maxDailyMessages?: number;
  maxMessagesPerHour?: number;
  messageDelay?: number;
  queueDelay?: number;
  webhookUrl?: string;
  enableReadReceipts: boolean;
  enableTypingIndicator: boolean;
  enableGroupMessages: boolean;
  enableBroadcastMessages: boolean;
  enableMediaMessages: boolean;
  maxFileSize?: number;
  allowedFileTypes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  accountId: string;
  userId: string;
  messageId?: string;
  type: 'INCOMING' | 'OUTGOING' | 'GROUP' | 'BROADCAST';
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  isForwarded?: boolean;
  quotedMessage?: any;
  timestamp: string;
  status?: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  user?: {
    phoneNumber: string;
    name: string;
    profilePic?: string;
  };
  reactions?: MessageReaction[];
  receipts?: MessageReceipt[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  emoji: string;
  createdAt: string;
}

export interface MessageReceipt {
  id: string;
  messageId: string;
  status: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  accountId: string;
  chatId: string;
  name?: string;
  type: 'INDIVIDUAL' | 'GROUP' | 'BROADCAST';
  description?: string;
  profilePic?: string;
  unreadCount?: number;
  lastMessage?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  participants?: ChatParticipant[];
  messageStats?: {
    totalMessages: number;
    unreadCount: number;
    lastMessageAt?: string;
  };
}

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER' | 'OWNER';
  joinedAt: string;
  leftAt?: string;
  user?: {
    phoneNumber: string;
    name: string;
    profilePic?: string;
  };
}

export interface User {
  id: string;
  accountId: string;
  phoneNumber: string;
  name: string;
  profilePic?: string;
  isContact: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageSummary {
  total: number;
  incoming: number;
  outgoing: number;
  today: number;
  thisMonth: number;
}

export interface ChatSummary {
  total: number;
  individual: number;
  groups: number;
  broadcasts: number;
  active: number;
  unread: number;
}

// ===============================
// NEW INSTANCE MANAGEMENT TYPES
// ===============================

export interface WhatsAppInstance {
  id: string;
  accountId: string;
  instanceId: string;
  name: string;
  phoneNumber?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'STOPPED' | 'ERROR' | 'INITIALIZING';
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
  sessionData?: any;
  webhookUrl?: string;
  webhookEnabled: boolean;
  autoStart: boolean;
  maxRetries: number;
  retryDelay: number;
  lastStartedAt?: string;
  lastStoppedAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  uptime?: number;
  messageCount: number;
  errorCount: number;
  restartCount: number;
  cpuUsage?: number;
  memoryUsage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConnection {
  id: string;
  accountId: string;
  phoneNumber: string;
  instanceId: string;
  qrCode?: string;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'FAILED' | 'QR_REQUIRED' | 'PAIRING_CODE_REQUIRED';
  isReady: boolean;
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  connectionAttempts: number;
  maxRetries: number;
  retryInterval: number;
  batteryLevel?: number;
  pushName?: string;
  profilePic?: string;
  whatsappVersion?: string;
  platform?: string;
  error?: string;
  isMultiDevice: boolean;
  autoReconnect: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SyncJobSummary {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  lastSyncAt?: string;
  nextSyncAt?: string;
}

export interface InstanceHealth {
  instanceId: string;
  isHealthy: boolean;
  status: string;
  connectionStatus: string;
  uptime: number;
  lastSeen: string;
  cpuUsage: number;
  memoryUsage: number;
  messageCount: number;
  errorCount: number;
  issues: string[];
  recommendations: string[];
}

export interface ConnectionHealth {
  isHealthy: boolean;
  uptime: number;
  lastSeen: string;
  batteryLevel?: number;
  signalStrength?: number;
  messagesSent: number;
  messagesReceived: number;
  errors: string[];
  warnings: string[];
}

export interface SyncJob {
  id: string;
  accountId: string;
  type: 'CONTACTS' | 'CHATS' | 'MESSAGES' | 'GROUPS' | 'FULL_SYNC' | 'AUTO_REPLIES';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  totalItems?: number;
  processedItems?: number;
  skippedItems?: number;
  errorItems?: number;
  lastSyncAt?: string;
  nextSyncAt?: string;
  isScheduled: boolean;
  scheduleInterval?: number;
  autoRetry: boolean;
  retryCount: number;
  maxRetries: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface InstanceLog {
  id: string;
  instanceId: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  details?: any;
  timestamp: string;
}

export interface InstanceMetrics {
  id: string;
  instanceId: string;
  cpuUsage: number;
  memoryUsage: number;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  uptime: number;
  timestamp: string;
}

export interface ConnectionHistoryEntry {
  id: string;
  connectionId: string;
  event: 'CONNECTED' | 'DISCONNECTED' | 'QR_GENERATED' | 'ERROR' | 'RETRY_ATTEMPT';
  message?: string;
  timestamp: string;
  details?: any;
}

export interface SyncResult {
  id: string;
  syncJobId: string;
  type: 'CONTACTS' | 'CHATS' | 'MESSAGES' | 'GROUPS' | 'FULL_SYNC' | 'AUTO_REPLIES';
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  totalItems: number;
  processedItems: number;
  createdItems: number;
  updatedItems: number;
  skippedItems: number;
  errorItems: number;
  duration: number;
  errors: string[];
  warnings: string[];
  details?: any;
  timestamp: string;
}

export interface AccountOverview {
  account: Account;
  instance?: WhatsAppInstance;
  connection?: WhatsAppConnection;
  stats: {
    messages?: MessageSummary;
    chats?: ChatSummary;
    autoReplies?: any;
    sync?: SyncJobSummary;
  };
  settings?: AccountSettings;
  lastUpdated: string;
}

export interface ComprehensiveHealthCheck {
  accountId: string;
  overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  healthScore: number;
  details: {
    account: any;
    instance?: InstanceHealth;
    connection?: ConnectionHealth;
  };
  recommendations: string[];
  timestamp: string;
}
