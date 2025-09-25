/**
 * useKnowledgeBase - Handle knowledge base functionality
 *
 * Encapsulates document upload for knowledge articles, navigation,
 * and knowledge base state management.
 */

import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUploadFile } from '@/hooks/api/useFiles'

export interface KnowledgeBaseState {
  // Upload state
  isUploading: boolean
  isError: boolean
  isSuccess: boolean
  error: any

  // Upload actions
  handleDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  openDocumentSelector: () => void

  // Navigation actions
  navigateToKnowledgeArticles: () => void
  navigateToFiles: () => void

  // Refs
  documentInputRef: React.RefObject<HTMLInputElement>
}

/**
 * Custom hook for handling knowledge base functionality
 */
export const useKnowledgeBase = (): KnowledgeBaseState => {
  const documentInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const uploadFileMutation = useUploadFile()

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      uploadFileMutation.mutate(file)
    }
  }

  const openDocumentSelector = () => {
    documentInputRef.current?.click()
  }

  const navigateToKnowledgeArticles = () => {
    navigate('/files')
  }

  const navigateToFiles = () => {
    navigate('/files')
  }

  return {
    // Upload state
    isUploading: uploadFileMutation.isPending,
    isError: uploadFileMutation.isError,
    isSuccess: uploadFileMutation.isSuccess,
    error: uploadFileMutation.error,

    // Upload actions
    handleDocumentUpload,
    openDocumentSelector,

    // Navigation actions
    navigateToKnowledgeArticles,
    navigateToFiles,

    // Refs
    documentInputRef,
  }
}