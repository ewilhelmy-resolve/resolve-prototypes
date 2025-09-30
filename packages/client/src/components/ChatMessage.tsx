import type React from 'react';
import { useState, useEffect } from 'react';
import { useSSEContext } from '../contexts/SSEContext';
import { MessageStatus, type MessageStatus as MessageStatusType } from './MessageStatus';

interface ChatMessageProps {
  id: string;
  message: string;
  role: 'user' | 'assistant';
  initialStatus?: MessageStatusType;
  timestamp: Date;
  className?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  id,
  message,
  role,
  initialStatus = 'pending',
  timestamp,
  className = ''
}) => {
  const { messageUpdates, latestUpdate } = useSSEContext();
  const [status, setStatus] = useState<MessageStatusType>(initialStatus);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Update message status when SSE events are received (only for user messages)
  useEffect(() => {
    if (role === 'user' && latestUpdate?.messageId === id) {
      setStatus(latestUpdate.status);
      setErrorMessage(latestUpdate.errorMessage);
    }
  }, [latestUpdate, id, role]);

  // Also check historical updates on mount (only for user messages)
  useEffect(() => {
    if (role === 'user') {
      const messageUpdate = messageUpdates.find(update => update.messageId === id);
      if (messageUpdate) {
        setStatus(messageUpdate.status);
        setErrorMessage(messageUpdate.errorMessage);
      }
    }
  }, [messageUpdates, id, role]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isUser = role === 'user';

  return (
    <div className={`mb-4 ${className}`}>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-200 shadow-sm'
        }`}>
          {/* Message Header */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${
                isUser ? 'text-blue-100' : 'text-gray-600'
              }`}>
                {isUser ? 'You' : 'Assistant'}
              </span>
              {isUser && <MessageStatus status={status} errorMessage={errorMessage} />}
            </div>
            <span className={`text-xs ${
              isUser ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {formatTime(timestamp)}
            </span>
          </div>

          {/* Message Content */}
          <div>
            <p className={`whitespace-pre-wrap ${
              isUser ? 'text-white' : 'text-gray-800'
            }`}>
              {message}
            </p>
          </div>

          {/* Error Message for User Messages */}
          {isUser && status === 'failed' && errorMessage && (
            <div className="mt-3 pt-3 border-t border-blue-500">
              <div className="bg-red-100 rounded-md p-2">
                <p className="text-red-900 text-sm">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Loading Animation for User Messages */}
          {isUser && status === 'processing' && (
            <div className="mt-3 pt-3 border-t border-blue-500">
              <div className="flex items-center gap-2">
                <div className="animate-pulse flex space-x-1">
                  <div className="w-2 h-2 bg-blue-200 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-blue-200">Processing...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};