import { toast as sonnerToast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';

export interface CustomToastProps {
  id: string | number;
  variant: 'success' | 'error';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Custom toast component with Tailwind styling
 * Maintains Sonner animations while providing full style control
 */
export function CustomToast(props: CustomToastProps) {
  const { title, description, action, variant, id } = props;

  const variantStyles = {
    success: {
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      titleColor: 'text-green-900',
      descriptionColor: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200'
    },
    error: {
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      titleColor: 'text-red-900',
      descriptionColor: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={`flex rounded-lg ${styles.bg} border ${styles.border} shadow-lg w-full md:max-w-[400px] items-start p-4 gap-3`}>
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {styles.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${styles.titleColor}`}>
          {title}
        </p>
        {description && (
          <p className={`mt-1 text-sm ${styles.descriptionColor}`}>
            {description}
          </p>
        )}
      </div>

      {/* Action Button */}
      {action && (
        <div className="flex-shrink-0">
          <button
            className="rounded-md px-3 py-1.5 text-sm font-medium bg-white/80 hover:bg-white shadow-sm border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => {
              action.onClick();
              sonnerToast.dismiss(id);
            }}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}