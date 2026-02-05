/**
 * useFirstTimeLogin - Hook for managing first-time login detection
 *
 * Uses feature flags (localStorage) to control welcome modal display.
 * Feature flag: SHOW_WELCOME_MODAL
 *
 * TODO: Replace with server-side user preference/onboarding status check
 * for proper per-user tracking across devices.
 */

import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { featureFlags } from '@/lib/featureFlags'

interface FirstTimeLoginState {
  shouldShowModal: boolean
  markModalAsShown: () => void
}

/**
 * Hook for detecting first-time login and managing the welcome modal
 *
 * @returns Object with shouldShowModal flag and markModalAsShown function
 */
export const useFirstTimeLogin = (): FirstTimeLoginState => {
  // Use feature flag to control modal display
  const shouldShowModal = useFeatureFlag('SHOW_WELCOME_MODAL')

  const markModalAsShown = () => {
    // Disable the feature flag when user dismisses the modal
    // This persists in localStorage until user re-enables it in DevTools
    featureFlags.setFlag('SHOW_WELCOME_MODAL', false)
  }

  return {
    shouldShowModal,
    markModalAsShown
  }
}