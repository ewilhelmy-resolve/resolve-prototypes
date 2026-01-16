/**
 * useAutoSave - Auto-save hook with debounce and status indicator
 *
 * Provides:
 * - 1.5s debounced auto-save on data changes
 * - Save status: "idle" | "saving" | "saved" | "error"
 * - Manual save trigger
 * - Dirty state tracking
 */

import { useState, useEffect, useRef, useCallback } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
  /** Data to auto-save */
  data: T;
  /** Async save function */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in ms (default: 1500) */
  debounceMs?: number;
  /** Time to show "saved" status before returning to idle (default: 2000) */
  savedDisplayMs?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  /** Current save status */
  status: SaveStatus;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Manually trigger save */
  saveNow: () => Promise<void>;
  /** Reset dirty state (e.g., after discard) */
  resetDirty: () => void;
  /** Last saved timestamp */
  lastSavedAt: Date | null;
  /** Error message if save failed */
  error: string | null;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 1500,
  savedDisplayMs = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs to track initial data and timeout
  const initialDataRef = useRef<T>(data);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Serialize data for comparison
  const serializedData = JSON.stringify(data);
  const serializedInitial = JSON.stringify(initialDataRef.current);

  // Check if data has changed from initial
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setIsDirty(serializedData !== serializedInitial);
  }, [serializedData, serializedInitial]);

  // Perform save
  const performSave = useCallback(async () => {
    if (!isDirty) return;

    setStatus("saving");
    setError(null);

    try {
      await onSave(data);
      setStatus("saved");
      setLastSavedAt(new Date());
      setIsDirty(false);
      initialDataRef.current = data;

      // Reset to idle after displaying "saved"
      savedTimeoutRef.current = setTimeout(() => {
        setStatus("idle");
      }, savedDisplayMs);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }, [data, isDirty, onSave, savedDisplayMs]);

  // Auto-save with debounce
  useEffect(() => {
    if (!enabled || !isDirty) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [serializedData, enabled, isDirty, debounceMs, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  // Manual save
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performSave();
  }, [performSave]);

  // Reset dirty state
  const resetDirty = useCallback(() => {
    setIsDirty(false);
    initialDataRef.current = data;
  }, [data]);

  return {
    status,
    isDirty,
    saveNow,
    resetDirty,
    lastSavedAt,
    error,
  };
}
