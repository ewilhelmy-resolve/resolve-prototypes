import { toast as sonnerToast } from 'sonner';
import { CustomToast } from '../components/ui/custom-toast';

/**
 * Custom toast utility that wraps Sonner with custom styling
 * Provides success and error toast variants with full Tailwind control
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
  return sonnerToast.custom((id) =>
    CustomToast({
      id,
      variant: 'success',
      title,
      description: options?.description,
      action: options?.action
    })
  );
}

/**
 * Show an error toast notification
 */
function error(title: string, options?: ToastOptions) {
  return sonnerToast.custom((id) =>
    CustomToast({
      id,
      variant: 'error',
      title,
      description: options?.description,
      action: options?.action
    })
  );
}

/**
 * Custom toast API
 * Usage:
 *   toast.success('Operation completed', { action: { label: 'View', onClick: () => {} } })
 *   toast.error('Operation failed', { description: 'Error details' })
 */
export const toast = {
  success,
  error
};