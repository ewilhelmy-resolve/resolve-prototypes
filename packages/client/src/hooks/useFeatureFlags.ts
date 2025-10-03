/**
 * useFeatureFlags - React hook for feature flags
 *
 * Provides reactive access to feature flags with automatic re-renders
 * when flags change.
 */

import { useState, useEffect } from 'react'
import { featureFlags } from '@/lib/featureFlags'
import type { FeatureFlagKey } from '@/types/featureFlags'

/**
 * Hook for accessing a single feature flag
 *
 * @param key - Feature flag identifier
 * @returns Current flag value
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
  const [value, setValue] = useState(() => featureFlags.getFlag(key))

  useEffect(() => {
    // Update when flags change
    const unsubscribe = featureFlags.subscribe(() => {
      setValue(featureFlags.getFlag(key))
    })

    return unsubscribe
  }, [key])

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
  const [flags, setFlags] = useState(() => featureFlags.getAllFlags())

  useEffect(() => {
    // Update when any flag changes
    const unsubscribe = featureFlags.subscribe(() => {
      setFlags(featureFlags.getAllFlags())
    })

    return unsubscribe
  }, [])

  return {
    /** Current values of all feature flags */
    flags,

    /** Set a specific flag value */
    setFlag: (key: FeatureFlagKey, value: boolean) => {
      featureFlags.setFlag(key, value)
    },

    /** Toggle a specific flag */
    toggleFlag: (key: FeatureFlagKey) => {
      featureFlags.toggleFlag(key)
    },

    /** Reset a specific flag to default */
    resetFlag: (key: FeatureFlagKey) => {
      featureFlags.resetFlag(key)
    },

    /** Reset all flags to defaults */
    resetAll: () => {
      featureFlags.resetAll()
    },

    /** Check if any flags have been modified */
    hasModifiedFlags: () => featureFlags.hasModifiedFlags(),
  }
}
