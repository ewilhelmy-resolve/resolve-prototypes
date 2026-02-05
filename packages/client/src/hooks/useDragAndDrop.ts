/**
 * useDragAndDrop - Enhanced drag-and-drop state management
 *
 * Provides visual feedback state tracking for file drag-and-drop interactions.
 * Follows UX best practices from research:
 * - Visual feedback when dragging files over the window
 * - Differentiate between hover states (over target vs. over document)
 * - Prevent false positives from internal drag operations
 */

import { useCallback, useEffect, useState } from 'react'

export interface DragAndDropState {
  isDragging: boolean
  isOverDropZone: boolean
  dragCounter: number
}

export interface UseDragAndDropOptions {
  enabled?: boolean
  onDrop?: (files: FileList) => void
  onError?: (error: string) => void
  accept?: string
  maxFiles?: number
  maxFileSize?: number
}

export function useDragAndDrop({
  enabled = true,
  onDrop,
  onError,
  accept,
  maxFiles,
  maxFileSize
}: UseDragAndDropOptions = {}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isOverDropZone, setIsOverDropZone] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  const validateFiles = useCallback((files: FileList): { valid: boolean; error?: string } => {
    // Check file count
    if (maxFiles && files.length > maxFiles) {
      return { valid: false, error: `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed` }
    }

    // Check file size
    if (maxFileSize) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxFileSize) {
          const maxSizeMB = Math.round(maxFileSize / 1024 / 1024)
          return { valid: false, error: `File "${files[i].name}" exceeds ${maxSizeMB}MB limit` }
        }
      }
    }

    // Check file types
    if (accept) {
      const acceptedTypes = accept.split(',').map(type => type.trim())
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const isAccepted = acceptedTypes.some(acceptedType => {
          if (acceptedType.startsWith('.')) {
            return file.name.toLowerCase().endsWith(acceptedType.toLowerCase())
          }
          if (acceptedType.endsWith('/*')) {
            const category = acceptedType.split('/')[0]
            return file.type.startsWith(`${category}/`)
          }
          return file.type === acceptedType
        })

        if (!isAccepted) {
          return { valid: false, error: `File type "${file.type || file.name.split('.').pop()}" not accepted` }
        }
      }
    }

    return { valid: true }
  }, [accept, maxFiles, maxFileSize])

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Only track file drags, not text or other drag operations
    if (e.dataTransfer?.types?.includes('Files')) {
      setDragCounter(prev => prev + 1)
      setIsDragging(true)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Set effect to indicate copy operation
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setDragCounter(prev => {
      const newCounter = prev - 1
      if (newCounter === 0) {
        setIsDragging(false)
        setIsOverDropZone(false)
      }
      return newCounter
    })
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(false)
    setIsOverDropZone(false)
    setDragCounter(0)

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const validation = validateFiles(e.dataTransfer.files)

      if (!validation.valid) {
        onError?.(validation.error || 'Invalid files')
        return
      }

      onDrop?.(e.dataTransfer.files)
    }
  }, [validateFiles, onDrop, onError])

  useEffect(() => {
    if (!enabled) return

    // Add listeners to document for global drag detection
    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', handleDrop)
    }
  }, [enabled, handleDragEnter, handleDragOver, handleDragLeave, handleDrop])

  return {
    isDragging,
    isOverDropZone,
    setIsOverDropZone,
    dragCounter
  }
}
