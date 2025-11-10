/**
 * useKnowledgeBase - Handle knowledge base functionality
 *
 * Encapsulates document upload for knowledge articles, navigation,
 * and knowledge base state management.
 */

import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUploadFile, useFiles, type FileDocument } from '@/hooks/api/useFiles'
import { validateFileForUpload } from '@/lib/constants'
import { ritaToast } from '@/components/ui/rita-toast'

export interface KnowledgeBaseState {
  // Upload state
  isUploading: boolean
  isError: boolean
  isSuccess: boolean
  error: any

  // Files state
  files: FileDocument[]
  filesLoading: boolean
  totalFiles: number

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
  const { data: filesData, isLoading: filesLoading } = useFiles()

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Validate file type before upload
      const validation = validateFileForUpload(file)
      if (!validation.isValid && validation.error) {
        ritaToast.error(validation.error)
        // Reset file input
        if (e.target) {
          e.target.value = ''
        }
        return
      }

      uploadFileMutation.mutate(file)
    }
  }

  const openDocumentSelector = () => {
    documentInputRef.current?.click()
  }

  const navigateToKnowledgeArticles = () => {
    navigate('/content')
  }

  const navigateToFiles = () => {
    navigate('/content')
  }

  return {
    // Upload state
    isUploading: uploadFileMutation.isPending,
    isError: uploadFileMutation.isError,
    isSuccess: uploadFileMutation.isSuccess,
    error: uploadFileMutation.error,

    // Files state
    files: filesData?.documents || [],
    filesLoading,
    totalFiles: filesData?.total || 0,

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