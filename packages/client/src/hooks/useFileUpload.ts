/**
 * useFileUpload - Handle file upload functionality
 *
 * Encapsulates file selection, upload handling, and status management
 * for the chat interface file attachment feature.
 */

import { useUploadFile } from '@/hooks/api/useFiles'

export interface FileUploadState {
  isUploading: boolean
  isError: boolean
  isSuccess: boolean
  // biome-ignore lint/suspicious/noExplicitAny: temporal
  error: any
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  openFileSelector: () => void
}

/**
 * Custom hook for handling file upload functionality
 */
export const useFileUpload = (fileInputRef: React.RefObject<HTMLInputElement>): FileUploadState => {
  const uploadFileMutation = useUploadFile()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      uploadFileMutation.mutate(file)
    }
  }

  const openFileSelector = () => {
    fileInputRef.current?.click()
  }

  return {
    isUploading: uploadFileMutation.isPending,
    isError: uploadFileMutation.isError,
    isSuccess: uploadFileMutation.isSuccess,
    error: uploadFileMutation.error,
    handleFileUpload,
    openFileSelector,
  }
}