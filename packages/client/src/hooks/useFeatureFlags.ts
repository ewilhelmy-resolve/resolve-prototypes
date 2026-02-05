/**
 * useFeatureFlags - React hook for feature flags
 *
 * Two-tier feature flag system:
 * - Platform flags: Fetched from Platform Actions API per tenant
 * - Local overrides: localStorage-based for dev/testing
 *
 * Resolution order: Local Override > Platform Flag > Default (false)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useFeatureFlagsStore } from '@/stores/feature-flags-store'
import { FEATURE_FLAGS, type FeatureFlagKey, type FlagSource } from '@/types/featureFlags'

/**
 * Hook for accessing a single feature flag
 *
 * @param key - Feature flag identifier
 * @returns Current flag value (resolved: local > platform > default)
 *
 * @example
 * ```tsx
 * const showWelcome = useFeatureFlag('SHOW_WELCOME_MODAL')
 *
 * if (showWelcome) {
 *   return <WelcomeDialog />
 * }
 * ```
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const store = useFeatureFlagsStore()
  const [value, setValue] = useState(() => store.getFlag(key))

  useEffect(() => {
    // Initial value sync
    setValue(store.getFlag(key))

    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      setValue(store.getFlag(key))
    })

    return unsubscribe
  }, [key, store])

  return value
}

/**
 * Hook for accessing all feature flags
 *
 * @returns Object with all flags and methods to modify them
 *
 * @example
 * ```tsx
 * const { flags, setFlag, toggleFlag, resetAll } = useFeatureFlags()
 *
 * <Switch
 *   checked={flags.SHOW_WELCOME_MODAL}
 *   onCheckedChange={(checked) => setFlag('SHOW_WELCOME_MODAL', checked)}
 * />
 * ```
 */
export function useFeatureFlags() {
  const store = useFeatureFlagsStore()

  const getAllFlags = useCallback(() => {
    const result = {} as Record<FeatureFlagKey, boolean>
    for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
      result[key] = store.getFlag(key)
    }
    return result
  }, [store])

  const [flags, setFlags] = useState(() => getAllFlags())

  useEffect(() => {
    // Initial sync
    setFlags(getAllFlags())

    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      setFlags(getAllFlags())
    })

    return unsubscribe
  }, [store, getAllFlags])

  const setFlag = useCallback((key: FeatureFlagKey, value: boolean) => {
    store.setLocalOverride(key, value)
  }, [store])

  const toggleFlag = useCallback((key: FeatureFlagKey) => {
    const current = store.getFlag(key)
    store.setLocalOverride(key, !current)
  }, [store])

  const resetFlag = useCallback((key: FeatureFlagKey) => {
    store.clearLocalOverride(key)
  }, [store])

  const resetAll = useCallback(() => {
    store.clearAllLocalOverrides()
  }, [store])

  const hasModifiedFlags = useCallback(() => {
    return Object.keys(store.localOverrides).length > 0
  }, [store])

  const getFlagSource = useCallback((key: FeatureFlagKey): FlagSource => {
    return store.getFlagSource(key)
  }, [store])

  const getPlatformValue = useCallback((key: FeatureFlagKey): boolean | undefined => {
    return store.getPlatformValue(key)
  }, [store])

  const hasLocalOverride = useCallback((key: FeatureFlagKey): boolean => {
    return store.hasLocalOverride(key)
  }, [store])

  const clearLocalOverride = useCallback((key: FeatureFlagKey) => {
    store.clearLocalOverride(key)
  }, [store])

  const setPlatformFlag = useCallback(async (key: FeatureFlagKey, value: boolean): Promise<boolean> => {
    return store.setPlatformFlag(key, value)
  }, [store])

  return useMemo(() => ({
    /** Current values of all feature flags */
    flags,

    /** Set a local override for a flag */
    setFlag,

    /** Toggle a flag's local override */
    toggleFlag,

    /** Clear local override for a specific flag */
    resetFlag,

    /** Clear all local overrides */
    resetAll,

    /** Check if any flags have local overrides */
    hasModifiedFlags,

    /** Get the source of a flag's resolved value */
    getFlagSource,

    /** Get platform value for a flag (if available) */
    getPlatformValue,

    /** Check if a flag has a local override */
    hasLocalOverride,

    /** Clear local override for a specific flag */
    clearLocalOverride,

    /** Update a platform flag value (calls Platform Actions API) */
    setPlatformFlag,

    /** Whether platform flags have been initialized */
    initialized: store.initialized,

    /** Whether platform flags are currently loading */
    loading: store.loading,
  }), [
    flags,
    setFlag,
    toggleFlag,
    resetFlag,
    resetAll,
    hasModifiedFlags,
    getFlagSource,
    getPlatformValue,
    hasLocalOverride,
    clearLocalOverride,
    setPlatformFlag,
    store.initialized,
    store.loading,
  ])
}
