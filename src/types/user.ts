// types/user.ts (Updated to match backend AuthUser model)
import { RespPermittedMenu } from './index';

// Core AuthUser interface matching backend
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  accountAccess: AccountAccess[];
}

// Account access interface
export interface AccountAccess {
  id: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  accountId: string;
  account: {
    id: string;
    name: string;
    phoneNumber: string | null;
    isActive: boolean;
  };
}

// User data interface (extends AuthUser for compatibility)
export interface UserData extends AuthUser {
  // Keep for backward compatibility, but these fields don't exist in AuthUser model
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  position?: string;
  address?: string;
  dateOfBirth?: string;
  hireDate?: string;
  permissions?: string[]; // For backward compatibility
  allowedAccounts?: string[]; // For backward compatibility
}

// Interface untuk User data (for compatibility with existing code)
export interface User {
  id: string | number;
  username: string;
  imageUrl?: string;
  role: string;
  permissions: string[];
}

// Interface untuk hook return value
export interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permittedMenus: RespPermittedMenu[];
  isMenuLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasMenuAccess: (menuKey: string) => boolean;
  setUser: (userData: User | null) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshPermittedMenus: () => Promise<void>;
  getToken: () => string | null;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
    allowedAccounts: string[];
    isActive: boolean;
  };
  error: any;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  role?: 'ADMIN' | 'USER' | 'VIEWER';
  accountIds?: string[];
  permissions?: string[];
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
    allowedAccounts: string[];
    isActive: boolean;
  };
}

export interface ChangePasswordRequest {
  token: string;
  currentPassword: string;
  newPassword: string;
}

export interface UserInfo {
  id: string;
  username: string;
  role: string;
  permissions: string[];
  allowedAccounts: string[];
  isActive: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  user?: UserInfo;
  error?: string;
}

// Request interfaces for API calls
export interface CreateUserRequest {
  username: string;
  email?: string;
  password: string;
  role?: 'ADMIN' | 'USER' | 'VIEWER';
  accountIds?: string[];
  permissions?: string[];
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'USER' | 'VIEWER';
  isActive?: boolean;
}

export interface UserAccountAccessRequest {
  accountId: string;
  permissions?: string[];
}

export interface UpdateAccountPermissionsRequest {
  permissions: string[];
  isActive?: boolean;
}