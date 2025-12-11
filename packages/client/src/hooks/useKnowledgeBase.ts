/**
 * useKnowledgeBase - Handle knowledge base functionality
 *
 * Encapsulates document upload for knowledge articles, navigation,
 * and knowledge base state management.
 */

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useUploadFile, useFiles, fileKeys, type FileDocument } from '@/hooks/api/useFiles'
import { validateFileForUpload } from '@/lib/constants'
import { ritaToast } from '@/components/ui/rita-toast'

export interface KnowledgeBaseState {
  // Upload state
  isUploading: boolean
  isError: boolean
  isSuccess: boolean
  error: any
  uploadingFiles: Set<string>

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
  const queryClient = useQueryClient()
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set())

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const filesToUpload = Array.from(files)
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    const successfulFilenames: string[] = []

    // Show initial toast
    ritaToast.info({
      title: 'Uploading Files',
      description: `Starting upload of ${filesToUpload.length} file${filesToUpload.length > 1 ? 's' : ''}...`,
    })

    // Process each file
    for (const file of filesToUpload) {
      // Validate file type before upload
      const validation = validateFileForUpload(file)
      if (!validation.isValid && validation.error) {
        errorCount++
        errors.push(`${file.name}: ${validation.error.description}`)
        continue
      }

      // Track uploading state for UI feedback
      setUploadingFiles((prev) => new Set(prev).add(file.name))

      try {
        // Upload with options to skip mutation's onSuccess callback (prevents individual cache invalidation)
        const response = await uploadFileMutation.mutateAsync(file, {
          onSuccess: () => {
            // Skip individual success handling - we'll handle it in the summary
          }
        })
        successCount++
        // Use server's returned filename (not client's file.name) for SSE tracking
        successfulFilenames.push(response.document.filename)
      } catch (error: any) {
        errorCount++
        // Handle duplicate file (409 Conflict)
        if (error.status === 409 && error.data?.existing_filename) {
          errors.push(`${file.name}: Already exists as "${error.data.existing_filename}"`)
        } else {
          errors.push(`${file.name}: ${error.message || 'Upload failed'}`)
        }
      } finally {
        // Remove from uploading state
        setUploadingFiles((prev) => {
          const next = new Set(prev)
          next.delete(file.name)
          return next
        })
      }
    }

    // Reset file input to allow re-selection
    if (e.target) {
      e.target.value = ''
    }

    // Invalidate files query cache if any files were uploaded successfully
    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })

      // Initialize processing tracking for summary toast
      const processingKey = 'rita-processing-files'

      // Clear any stale tracking data before initializing new batch
      sessionStorage.removeItem(processingKey)

      const trackingData = {
        filenames: successfulFilenames, // Server's returned filenames (may differ from client's)
        processed: 0,
        failed: 0
      }

      sessionStorage.setItem(processingKey, JSON.stringify(trackingData))
    }

    // Show final summary toast
    if (successCount > 0 && errorCount === 0) {
      ritaToast.success({
        title: 'Upload Complete',
        description: `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`,
      })
    } else if (successCount > 0 && errorCount > 0) {
      ritaToast.warning({
        title: 'Upload Partially Complete',
        description: `${successCount} succeeded, ${errorCount} failed. Check details for errors.`,
      })
    } else if (errorCount > 0) {
      ritaToast.error({
        title: 'Upload Failed',
        description: errors.length > 0 ? errors[0] : 'All uploads failed',
      })
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
    isUploading: uploadFileMutation.isPending || uploadingFiles.size > 0,
    isError: uploadFileMutation.isError,
    isSuccess: uploadFileMutation.isSuccess,
    error: uploadFileMutation.error,
    uploadingFiles,

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