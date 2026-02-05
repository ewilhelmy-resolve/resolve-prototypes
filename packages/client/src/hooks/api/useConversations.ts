import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { conversationApi } from '@/services/api.ts'
import { useConversationStore } from '@/stores/conversationStore.ts'
import type { Conversation, Message } from '@/stores/conversationStore.ts'
import { CHAT_PAGINATION } from '@/constants/pagination'

// Query keys
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters: string) => [...conversationKeys.lists(), { filters }] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  messages: (id: string) => [...conversationKeys.detail(id), 'messages'] as const,
}

// Fetch conversations
export function useConversations() {
  const setConversations = useConversationStore((state) => state.setConversations)

  return useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: async () => {
      const response = await conversationApi.getConversations()

      const conversations: Conversation[] = response.conversations.map((conv: any) => ({
        id: conv.id,
        title: conv.title,
        created_at: new Date(conv.created_at),
        updated_at: new Date(conv.updated_at),
      }))

      // Update store
      setConversations(conversations)

      return conversations
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Fetch conversation messages
export function useConversationMessages(conversationId: string | null) {
  const setMessages = useConversationStore((state) => state.setMessages)

  return useQuery({
    queryKey: conversationKeys.messages(conversationId || ''),
    queryFn: async () => {
      if (!conversationId) return []

      const response = await conversationApi.getConversationMessages(conversationId)

      const messages: Message[] = response.messages.map((msg: any) => ({
        id: msg.id,
        message: msg.message,
        role: msg.role,
        timestamp: new Date(msg.created_at),
        conversation_id: msg.conversation_id,
        status: msg.status,
        error_message: msg.error_message,
        metadata: msg.metadata,
        response_group_id: msg.response_group_id,
      }))

      // Update store
      setMessages(messages)

      return messages
    },
    enabled: !!conversationId,
    staleTime: 0, // we always want to fetch the latest messages
    refetchOnMount: true,
  })
}

// Fetch conversation messages with infinite scroll pagination
export function useInfiniteConversationMessages(conversationId: string | null) {
  return useInfiniteQuery<
    { messages: Message[]; hasMore: boolean; nextCursor: string | null },
    Error,
    InfiniteData<{ messages: Message[]; hasMore: boolean; nextCursor: string | null }>,
    string[],
    string | undefined
  >({
    queryKey: [...conversationKeys.messages(conversationId || ''), 'infinite'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!conversationId) return { messages: [], hasMore: false, nextCursor: null }

      const response = await conversationApi.getConversationMessages(conversationId, {
        limit: pageParam === undefined ? CHAT_PAGINATION.INITIAL_PAGE_SIZE : CHAT_PAGINATION.PAGE_SIZE,
        ...(pageParam !== undefined && { before: pageParam }), // Only include before if cursor exists
      })

      const messages: Message[] = response.messages.map((msg: any) => ({
        id: msg.id,
        message: msg.message,
        role: msg.role,
        timestamp: new Date(msg.created_at),
        conversation_id: msg.conversation_id,
        status: msg.status,
        error_message: msg.error_message,
        metadata: msg.metadata,
        response_group_id: msg.response_group_id,
      }))

      return {
        messages,
        hasMore: response.hasMore,
        nextCursor: response.nextCursor,
      }
    },
    getNextPageParam: (lastPage) => {
      // Return cursor for next page, or undefined if no more pages
      // Ensure we return undefined (not null) when there's no next page or cursor
      return lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined
    },
    initialPageParam: undefined,
    enabled: !!conversationId,
    staleTime: 0,
    refetchOnMount: true,
  })
}

// Create conversation mutation
export function useCreateConversation() {
  const queryClient = useQueryClient()
  const { addConversation, setCurrentConversation } = useConversationStore()

  return useMutation({
    mutationFn: async (data: { title: string }) => {
      const response = await conversationApi.createConversation(data)

      const conversation: Conversation = {
        id: response.conversation.id,
        title: response.conversation.title,
        created_at: new Date(response.conversation.created_at),
        updated_at: new Date(response.conversation.updated_at),
      }

      return conversation
    },
    onSuccess: (conversation) => {
      // Update store
      addConversation(conversation)
      setCurrentConversation(conversation.id)

      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    },
  })
}

// Send message mutation
export function useSendMessage() {
  const queryClient = useQueryClient()
  const { addMessage, updateMessage, setSending } = useConversationStore()

  return useMutation({
    mutationFn: async (data: { conversationId: string; content: string; tempId: string; metadata?: Record<string, string> }) => {
      setSending(true)

      try {
        const response = await conversationApi.sendMessage(data.conversationId, {
          content: data.content,
          metadata: data.metadata,
        })

        const message: Message = {
          id: response.message.id,
          message: response.message.message,
          role: response.message.role,
          timestamp: new Date(response.message.created_at),
          conversation_id: response.message.conversation_id,
          status: response.message.status,
          error_message: response.message.error_message,
          metadata: response.message.metadata,
          response_group_id: response.message.response_group_id,
        }

        return { message, tempId: data.tempId }
      } finally {
        setSending(false)
      }
    },
    onMutate: async (variables) => {
      // Optimistically add message to store
      const tempMessage: Message = {
        id: variables.tempId,
        message: variables.content,
        role: 'user',
        timestamp: new Date(),
        conversation_id: variables.conversationId,
        status: 'sending',
      }

      addMessage(tempMessage)
    },
    onSuccess: ({ message, tempId }) => {
      // Replace temp message with real message
      updateMessage(tempId, {
        id: message.id,
        timestamp: message.timestamp,
        status: message.status,
      })

      // Invalidate messages query
      queryClient.invalidateQueries({
        queryKey: conversationKeys.messages(message.conversation_id),
      })
    },
    onError: (error, variables) => {
      // Update temp message to show error
      updateMessage(variables.tempId, {
        status: 'failed',
        error_message: error.message,
      })
    },
  })
}

// Update conversation mutation
export function useUpdateConversation() {
  const queryClient = useQueryClient()
  const setConversations = useConversationStore((state) => state.setConversations)

  return useMutation({
    mutationFn: async (data: { conversationId: string; title: string }) => {
      const response = await conversationApi.updateConversation(data.conversationId, {
        title: data.title,
      })

      const conversation: Conversation = {
        id: response.conversation.id,
        title: response.conversation.title,
        created_at: new Date(response.conversation.created_at),
        updated_at: new Date(response.conversation.updated_at),
      }

      return conversation
    },
    onSuccess: (updatedConversation) => {
      // Update store optimistically
      const conversations = useConversationStore.getState().conversations
      const updatedConversations = conversations.map(conv =>
        conv.id === updatedConversation.id ? updatedConversation : conv
      )
      setConversations(updatedConversations)

      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    },
  })
}

// Delete conversation mutation
export function useDeleteConversation() {
  const queryClient = useQueryClient()
  const { setConversations, currentConversationId, clearCurrentConversation } = useConversationStore()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      await conversationApi.deleteConversation(conversationId)
      return conversationId
    },
    onSuccess: (deletedConversationId) => {
      // Update store - remove the deleted conversation
      const conversations = useConversationStore.getState().conversations
      const updatedConversations = conversations.filter(conv => conv.id !== deletedConversationId)
      setConversations(updatedConversations)

      // If we deleted the current conversation, clear it
      if (currentConversationId === deletedConversationId) {
        clearCurrentConversation()
      }

      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    },
  })
}