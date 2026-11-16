'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { TickDouble02Icon, AlertCircleIcon, CancelCircleIcon, InformationCircleIcon } from '@hugeicons/core-free-icons';
type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationState {
  notifications: Notification[];
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string };

const NotificationContext = createContext<{
  state: NotificationState;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
} | null>(null);

const notificationReducer = (
  state: NotificationState,
  action: NotificationAction
): NotificationState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    default:
      return state;
  }
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, {
    notifications: []
  });

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Use sonner for displaying the toast
    const message = `${newNotification.title}${newNotification.message ? `: ${newNotification.message}` : ''}`;
    
    switch (newNotification.type) {
      case 'success':
        toast.success(message, { 
          duration: newNotification.duration || 5000,
          icon: <HugeiconsIcon icon={TickDouble02Icon} size={16} />,
          action: newNotification.action ? {
            label: newNotification.action.label,
            onClick: newNotification.action.onClick
          } : undefined
        });
        break;
      case 'error':
        toast.error(message, { 
          duration: newNotification.duration || 5000,
          icon: <HugeiconsIcon icon={CancelCircleIcon} size={16} />,
          action: newNotification.action ? {
            label: newNotification.action.label,
            onClick: newNotification.action.onClick
          } : undefined
        });
        break;
      case 'warning':
        toast(message, { 
          duration: newNotification.duration || 5000,
          icon: <HugeiconsIcon icon={AlertCircleIcon} size={16} />,
          action: newNotification.action ? {
            label: newNotification.action.label,
            onClick: newNotification.action.onClick
          } : undefined,
          description: 'Warning'
        });
        break;
      case 'info':
      default:
        toast(message, { 
          duration: newNotification.duration || 5000,
          icon: <HugeiconsIcon icon={InformationCircleIcon} size={16} />,
          action: newNotification.action ? {
            label: newNotification.action.label,
            onClick: newNotification.action.onClick
          } : undefined,
          description: 'Info'
        });
        break;
    }

    // Auto remove from state after duration
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    }, newNotification.duration || 5000);
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  return (
    <NotificationContext.Provider value={{ state, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  const notify = {
    success: (title: string, message: string, options?: Partial<Notification>) => {
      context.addNotification({ type: 'success', title, message, ...options });
    },
    error: (title: string, message: string, options?: Partial<Notification>) => {
      context.addNotification({ type: 'error', title, message, ...options });
    },
    warning: (title: string, message: string, options?: Partial<Notification>) => {
      context.addNotification({ type: 'warning', title, message, ...options });
    },
    info: (title: string, message: string, options?: Partial<Notification>) => {
      context.addNotification({ type: 'info', title, message, ...options });
    }
  };

  return { ...context, notify };
};