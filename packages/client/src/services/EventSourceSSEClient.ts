export interface MessageUpdateEvent {
  type: 'message_update';
  data: {
    messageId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    responseContent?: string;
    errorMessage?: string;
    processedAt?: string;
  };
}

export interface NewMessageEvent {
  type: 'new_message';
  data: {
    messageId: string;
    conversationId: string;
    role: 'user' | 'assistant';
    message: string;
    metadata?: any;
    response_group_id?: string;
    userId: string;
    createdAt: string;
  };
}

export interface DataSourceUpdateEvent {
  type: 'data_source_update';
  data: {
    connection_id: string;
    connection_type?: string; // e.g., 'confluence', 'servicenow', 'sharepoint', 'websearch'
    status: 'idle' | 'verifying' | 'syncing';
    // Sync-specific fields
    last_sync_status?: 'completed' | 'failed' | null;
    last_sync_at?: Date | null;
    last_sync_error?: string;
    documents_processed?: number;
    // Verification-specific fields
    last_verification_at?: Date | null;
    last_verification_error?: string | null;
    latest_options?: Record<string, any> | null;
    // Common
    timestamp: string;
  };
}

export interface DynamicWorkflowEvent {
  type: 'dynamic_workflow';
  data: {
    action: 'workflow_created' | 'workflow_executed' | 'progress_update';
    workflow?: Array<{
      task_id: string;
      description: string;
      inputs: string[];
      outputs: string[];
      action: 'reuse' | 'create' | 'modify';
      snippet: {
        id: string;
        description: string;
        code: string;
        input_example: string;
        output_keys: string;
        packages: string;
      };
    }>;
    mappings?: Record<string, Record<string, string>>;
    visualization?: string;
    result?: any;
    progress?: string;
    error?: string;
  };
}

export type SSEEvent = MessageUpdateEvent | NewMessageEvent | DataSourceUpdateEvent | DynamicWorkflowEvent | {
  type: string;
  data: any;
};

export interface EventSourceSSEClientOptions {
  url: string;
}

export class EventSourceSSEClient {
  private url: string;
  private eventSource: EventSource | null = null;
  private listeners: Map<string, ((event: SSEEvent) => void)[]> = new Map();

  constructor(options: EventSourceSSEClientOptions) {
    this.url = options.url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Close existing connection
        if (this.eventSource) {
          this.eventSource.close();
        }

        // Create new EventSource connection - cookies will be automatically included
        this.eventSource = new EventSource(this.url, {
          withCredentials: true
        });

        // Set up event listeners
        this.eventSource.onopen = () => {
          this.emit('open', {});
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit('message', data);
          } catch (error) {
            console.error('Failed to parse EventSource data:', error);
          }
        };

        this.eventSource.onerror = (event) => {
          console.error('EventSource connection error:', event);
          this.emit('error', event);

          // If this is the initial connection, reject the promise
          if (this.eventSource?.readyState === EventSource.CONNECTING) {
            reject(new Error('Failed to establish EventSource connection'));
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.emit('close', {});
  }

  reconnect(): void {
    this.disconnect();
    setTimeout(() => this.connect(), 100);
  }


  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
}