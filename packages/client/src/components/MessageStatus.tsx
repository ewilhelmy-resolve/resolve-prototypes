import type React from 'react';

export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface MessageStatusProps {
  status: MessageStatus;
  errorMessage?: string;
  className?: string;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '⏳'
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '⚙️'
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: '✅'
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: '❌'
  }
};

export const MessageStatus: React.FC<MessageStatusProps> = ({
  status,
  errorMessage,
  className = ''
}) => {
  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${config.className} ${className}`}>
      <span className="mr-1">{config.icon}</span>
      <span>{config.label}</span>
      {status === 'failed' && errorMessage && (
        <span className="ml-1 text-xs opacity-75" title={errorMessage}>
          (Error)
        </span>
      )}
    </div>
  );
};