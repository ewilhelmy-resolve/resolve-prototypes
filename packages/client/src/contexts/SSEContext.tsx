import React, { createContext, useContext, useCallback, useState } from 'react';
import { useSSE } from '../hooks/useSSE';
import { useConversationStore } from '../stores/conversationStore';
import type { SSEEvent } from '../services/EventSourceSSEClient';
import type { Message } from '../stores/conversationStore';

interface MessageUpdate {
  messageId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  responseContent?: string;
  errorMessage?: string;
  timestamp: Date;
}

interface SSEContextValue {
  isConnected: boolean;
  messageUpdates: MessageUpdate[];
  latestUpdate: MessageUpdate | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  clearUpdates: () => void;
}

const SSEContext = createContext<SSEContextValue | null>(null);

interface SSEProviderProps {
  children: React.ReactNode;
  apiUrl: string;
  enabled?: boolean;
}

export const SSEProvider: React.FC<SSEProviderProps> = ({
  children,
  apiUrl,
  enabled = true
}) => {
  const [messageUpdates, setMessageUpdates] = useState<MessageUpdate[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<MessageUpdate | null>(null);

  const handleMessage = useCallback((event: SSEEvent) => {
    console.log('Received SSE event:', event);

    if (event.type === 'message_update') {
      const update: MessageUpdate = {
        messageId: event.data.messageId,
        status: event.data.status,
        responseContent: event.data.responseContent,
        errorMessage: event.data.errorMessage,
        timestamp: new Date()
      };

      setLatestUpdate(update);
      setMessageUpdates(prev => {
        // Keep only the last 100 updates to prevent memory issues
        const newUpdates = [update, ...prev].slice(0, 100);
        return newUpdates;
      });
    } else if (event.type === 'new_message') {
      // Handle new assistant messages
      const { addMessage, currentConversationId } = useConversationStore.getState();

      const newMessage: Message = {
        id: event.data.messageId,
        message: event.data.content,
        role: 'assistant',
        timestamp: new Date(event.data.createdAt),
        conversation_id: currentConversationId || '',
        status: 'completed'
      };

      // Only add the message if it's for the current conversation
      if (currentConversationId) {
        addMessage(newMessage);
      }
    }
  }, []);

  const handleError = useCallback((error: any) => {
    console.error('SSE connection error:', error);
  }, []);

  const handleOpen = useCallback(() => {
    console.log('SSE connection opened');
  }, []);

  const handleClose = useCallback(() => {
    console.log('SSE connection closed');
  }, []);

  const sseUrl = `${apiUrl}/api/sse/events`;

  const {
    isConnected,
    connect,
    disconnect,
    reconnect
  } = useSSE({
    url: sseUrl,
    onMessage: handleMessage,
    onError: handleError,
    onOpen: handleOpen,
    onClose: handleClose,
    enabled
  });

  const clearUpdates = useCallback(() => {
    setMessageUpdates([]);
    setLatestUpdate(null);
  }, []);

  const contextValue: SSEContextValue = {
    isConnected,
    messageUpdates,
    latestUpdate,
    connect,
    disconnect,
    reconnect,
    clearUpdates
  };

  return (
    <SSEContext.Provider value={contextValue}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSEContext = (): SSEContextValue => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSEContext must be used within an SSEProvider');
  }
  return context;
};