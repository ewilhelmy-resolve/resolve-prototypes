/**
 * useRitaChat - Main orchestrator hook for Rita chat functionality
 *
 * This hook composes all chat-related business logic and provides a clean API
 * for the RitaLayout component. It follows the 2024 React pattern of separating
 * business logic from UI components using custom hook composition.
 */

import { useRef } from 'react'
import { useChatNavigation } from './useChatNavigation'
import { useMessageHandler } from './useMessageHandler'
import { useConversationManager } from './useConversationManager'
import { useFileUpload } from './useFileUpload'
import { useChatSearch } from './useChatSearch'
import { useKnowledgeBase } from './useKnowledgeBase'

export interface RitaChatState {
  // Conversation state
  conversations: any[]
  currentConversationId: string | null
  conversationsLoading: boolean
  filteredConversations: any[]

  // Message state
  messages: any[]
  messagesLoading: boolean
  isSending: boolean

  // UI state
  searchValue: string
  messageValue: string

  // Actions
  handleNewChat: () => void
  handleConversationClick: (id: string) => void
  handleSendMessage: () => Promise<void>
  handleSearchChange: (value: string) => void
  handleMessageChange: (value: string) => void
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  // Programmatic message sending (for iframe host communication)
  sendMessageWithContent: (content: string, metadata?: Record<string, string>) => Promise<void>

  // File upload (for chat messages)
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  openFileSelector: () => void
  uploadStatus: {
    isUploading: boolean
    isError: boolean
    isSuccess: boolean
    error?: any
  }

  // Knowledge base
  handleDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  openDocumentSelector: () => void
  navigateToKnowledgeArticles: () => void
  navigateToFiles: () => void
  documentUploadStatus: {
    isUploading: boolean
    isError: boolean
    isSuccess: boolean
    error?: any
  }
  knowledgeBaseFiles: any[]
  knowledgeBaseFilesLoading: boolean
  totalKnowledgeBaseFiles: number

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement>
  documentInputRef: React.RefObject<HTMLInputElement>
  messagesEndRef: React.RefObject<HTMLDivElement>
}

/**
 * Main orchestrator hook that composes all chat functionality
 */
export const useRitaChat = (): RitaChatState => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Compose all business logic hooks
  const navigation = useChatNavigation()
  const messageHandler = useMessageHandler(messagesEndRef)
  const conversationManager = useConversationManager()
  const fileUpload = useFileUpload(fileInputRef)
  const search = useChatSearch(conversationManager.conversations)
  const knowledgeBase = useKnowledgeBase()

  return {
    // Conversation state
    conversations: conversationManager.conversations,
    currentConversationId: conversationManager.currentConversationId,
    conversationsLoading: conversationManager.loading,
    filteredConversations: search.filteredConversations,

    // Message state
    messages: messageHandler.messages,
    messagesLoading: messageHandler.loading,
    isSending: messageHandler.isSending,

    // UI state
    searchValue: search.searchValue,
    messageValue: messageHandler.messageValue,

    // Navigation actions
    handleNewChat: navigation.handleNewChat,
    handleConversationClick: navigation.handleConversationClick,

    // Message actions
    handleSendMessage: messageHandler.handleSendMessage,
    handleMessageChange: messageHandler.handleMessageChange,
    handleKeyPress: messageHandler.handleKeyPress,
    sendMessageWithContent: messageHandler.sendMessageWithContent,

    // Search actions
    handleSearchChange: search.handleSearchChange,

    // File upload (for chat messages)
    handleFileUpload: fileUpload.handleFileUpload,
    openFileSelector: fileUpload.openFileSelector,
    uploadStatus: {
      isUploading: fileUpload.isUploading,
      isError: fileUpload.isError,
      isSuccess: fileUpload.isSuccess,
      error: fileUpload.error,
    },

    // Knowledge base
    handleDocumentUpload: knowledgeBase.handleDocumentUpload,
    openDocumentSelector: knowledgeBase.openDocumentSelector,
    navigateToKnowledgeArticles: knowledgeBase.navigateToKnowledgeArticles,
    navigateToFiles: knowledgeBase.navigateToFiles,
    documentUploadStatus: {
      isUploading: knowledgeBase.isUploading,
      isError: knowledgeBase.isError,
      isSuccess: knowledgeBase.isSuccess,
      error: knowledgeBase.error,
    },
    knowledgeBaseFiles: knowledgeBase.files,
    knowledgeBaseFilesLoading: knowledgeBase.filesLoading,
    totalKnowledgeBaseFiles: knowledgeBase.totalFiles,

    // Refs
    fileInputRef,
    documentInputRef: knowledgeBase.documentInputRef,
    messagesEndRef,
  }
}