import type React from 'react';
import { createContext, useContext, useCallback, useState } from 'react';
import { useSSE } from '../hooks/useSSE';
import { useConversationStore } from '../stores/conversationStore';
import type { SSEEvent } from '../services/EventSourceSSEClient';
import type { Message } from '../stores/conversationStore';
import { toast } from '../lib/toast';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

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
      // Handle new assistant messages with hybrid data
      const { addMessage, currentConversationId } = useConversationStore.getState();

      const newMessage: Message = {
        id: event.data.messageId,
        role: event.data.role || 'assistant',
        message: event.data.message || '',
        metadata: event.data.metadata,
        response_group_id: event.data.response_group_id,
        timestamp: new Date(event.data.createdAt),
        conversation_id: currentConversationId || '',
        status: 'completed'
      };

      // Only add the message if it's for the current conversation
      if (currentConversationId) {
        addMessage(newMessage);
      }
    } else if (event.type === 'data_source_update') {
      // Handle data source connection updates (verification, sync status changes)
      // Determine update type based on which fields are present
      const updateType = event.data.lastVerificationAt ? 'verification' :
                        event.data.lastSyncStatus ? 'sync' : 'unknown';

      console.log('[SSE] Data source update received:', {
        updateType,
        connectionId: event.data.connectionId,
        status: event.data.status,
        lastSyncStatus: event.data.lastSyncStatus,
        lastVerificationAt: event.data.lastVerificationAt,
        latestOptions: event.data.latestOptions
      });

      // TODO: Invalidate TanStack Query cache when data source hooks are implemented
      // This will trigger automatic refetch of:
      // - useDataSources() - list of all data sources
      // - useDataSource(event.data.connectionId) - single data source details
      //
      // Example implementation:
      // import { useQueryClient } from '@tanstack/react-query';
      // const queryClient = useQueryClient();
      // queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      // queryClient.invalidateQueries({ queryKey: ['dataSource', event.data.connectionId] });

      // Show toast notification for sync events only (not verification)
      if (updateType === 'sync' && event.data.lastSyncStatus) {
        const connectionType = event.data.connectionType || 'Data source';
        const syncStatus = event.data.lastSyncStatus;

        if (syncStatus === 'completed') {
          toast.success(`${connectionType} sync complete`, {
            action: {
              label: 'View',
              onClick: () => navigate('/settings/connections')
            }
          });
        } else if (syncStatus === 'failed') {
          toast.error(`${connectionType} sync failed`, {
            description: event.data.lastSyncError || 'An error occurred',
            action: {
              label: 'View',
              onClick: () => navigate('/settings/connections')
            }
          });
        }
      }
    }
  }, [navigate]);

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