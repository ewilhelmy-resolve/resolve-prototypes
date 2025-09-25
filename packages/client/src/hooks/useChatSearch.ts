/**
 * useChatSearch - Handle search and filtering functionality
 *
 * Encapsulates conversation search logic, providing filtered results
 * and search state management for the chat interface.
 */

import { useState, useMemo } from 'react'

export interface ChatSearchState {
  searchValue: string
  filteredConversations: any[]
  handleSearchChange: (value: string) => void
}

/**
 * Custom hook for handling conversation search and filtering
 */
export const useChatSearch = (conversations: any[]): ChatSearchState => {
  const [searchValue, setSearchValue] = useState('')

  // Memoize filtered conversations for performance
  const filteredConversations = useMemo(() => {
    if (!searchValue.trim()) {
      return conversations
    }

    return conversations.filter(conv =>
      conv.title.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [conversations, searchValue])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
  }

  return {
    searchValue,
    filteredConversations,
    handleSearchChange,
  }
}