import { toast as sonnerToast } from 'sonner';

// Singleton toast ID - ensures only one toast is shown at a time
const SINGLETON_TOAST_ID = 'app-singleton-toast';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

export const useToast = () => {
  const showToast = (options: ToastOptions | string) => {
    if (typeof options === 'string') {
      sonnerToast(options);
      return;
    }

    const { title, description, variant = 'default', duration } = options;
    
    const message = title || description || '';
    const toastOptions = {
      duration,
      description: title && description ? description : undefined,
    };

    switch (variant) {
      case 'destructive':
        sonnerToast.error(message, toastOptions);
        break;
      case 'success':
        sonnerToast.success(message, toastOptions);
        break;
      default:
        sonnerToast(message, toastOptions);
        break;
    }
  };

  return {
    toast: showToast,
    success: (message: string, options?: Omit<ToastOptions, 'variant'>) => 
      showToast({ ...options, title: message, variant: 'success' }),
    error: (message: string, options?: Omit<ToastOptions, 'variant'>) => 
      showToast({ ...options, title: message, variant: 'destructive' }),
    info: (message: string, options?: Omit<ToastOptions, 'variant'>) => 
      showToast({ ...options, title: message, variant: 'default' }),
  };
};

/**
 * Singleton toast - only shows one toast at a time
 * All calls will replace the previous toast instead of stacking
 */
export const toast = {
  success: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.success(message, { id: SINGLETON_TOAST_ID, ...options });
  },
  error: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.error(message, { id: SINGLETON_TOAST_ID, ...options });
  },
  warning: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.warning(message, { id: SINGLETON_TOAST_ID, ...options });
  },
  info: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.info(message, { id: SINGLETON_TOAST_ID, ...options });
  },
  loading: (message: string, options?: { description?: string }) => {
    sonnerToast.loading(message, { id: SINGLETON_TOAST_ID, ...options });
  },
  dismiss: () => {
    sonnerToast.dismiss(SINGLETON_TOAST_ID);
  },
  // For cases where you need multiple toasts (use sparingly)
  multi: sonnerToast,
};