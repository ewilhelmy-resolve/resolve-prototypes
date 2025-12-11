import { ritaToast } from '@/components/ui/rita-toast';

/**
 * Custom toast utility that wraps ritaToast with a convenient API
 * Provides success, error, warning, and info toast variants
 */

interface ToastOptions {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Show a success toast notification
 */
function success(title: string, options?: ToastOptions) {
  return ritaToast.success({
    title,
    description: options?.description,
    action: options?.action
  });
}

/**
 * Show an error toast notification
 */
function error(title: string, options?: ToastOptions) {
  return ritaToast.error({
    title,
    description: options?.description,
    action: options?.action
  });
}

/**
 * Show a warning toast notification
 */
function warning(title: string, options?: ToastOptions) {
  return ritaToast.warning({
    title,
    description: options?.description,
    action: options?.action
  });
}

/**
 * Show an info toast notification
 */
function info(title: string, options?: ToastOptions) {
  return ritaToast.info({
    title,
    description: options?.description,
    action: options?.action
  });
}

/**
 * Custom toast API
 * Usage:
 *   toast.success('Operation completed', { action: { label: 'View', onClick: () => {} } })
 *   toast.error('Operation failed', { description: 'Error details' })
 *   toast.warning('Warning message', { description: 'Warning details' })
 *   toast.info('Information message', { description: 'Additional details' })
 */
export const toast = {
  success,
  error,
  warning,
  info
};