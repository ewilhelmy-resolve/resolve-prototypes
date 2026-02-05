/**
 * Feature Flags Manager
 *
 * LocalStorage-based feature flag system for RITA Go.
 * Provides a centralized interface for managing feature toggles.
 */

import { FEATURE_FLAGS, type FeatureFlagKey, type FeatureFlagState } from '@/types/featureFlags'

const STORAGE_KEY = 'rita_feature_flags'

/**
 * Feature flags manager singleton
 */
class FeatureFlagsManager {
  private listeners: Set<() => void> = new Set()

  /**
   * Get current state from localStorage
   */
  private getState(): FeatureFlagState {
    if (typeof window === 'undefined') return {}

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Failed to parse feature flags from localStorage:', error)
      return {}
    }
  }

  /**
   * Save state to localStorage
   */
  private setState(state: FeatureFlagState): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to save feature flags to localStorage:', error)
    }
  }

  /**
   * Subscribe to feature flag changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  /**
   * Get a feature flag value
   *
   * @param key - Feature flag identifier
   * @returns Current flag value (defaults to config default if not set)
   */
  getFlag(key: FeatureFlagKey): boolean {
    const state = this.getState()
    const config = FEATURE_FLAGS[key]

    if (!config) {
      console.warn(`Unknown feature flag: ${key}`)
      return false
    }

    // Return stored value or default
    return state[key] ?? config.defaultValue
  }

  /**
   * Set a feature flag value
   *
   * @param key - Feature flag identifier
   * @param value - New flag value
   */
  setFlag(key: FeatureFlagKey, value: boolean): void {
    const config = FEATURE_FLAGS[key]

    if (!config) {
      console.warn(`Unknown feature flag: ${key}`)
      return
    }

    const state = this.getState()
    state[key] = value
    this.setState(state)
  }

  /**
   * Toggle a feature flag
   *
   * @param key - Feature flag identifier
   * @returns New flag value after toggle
   */
  toggleFlag(key: FeatureFlagKey): boolean {
    const currentValue = this.getFlag(key)
    const newValue = !currentValue
    this.setFlag(key, newValue)
    return newValue
  }

  /**
   * Reset a specific flag to its default value
   *
   * @param key - Feature flag identifier
   */
  resetFlag(key: FeatureFlagKey): void {
    const config = FEATURE_FLAGS[key]

    if (!config) {
      console.warn(`Unknown feature flag: ${key}`)
      return
    }

    const state = this.getState()
    delete state[key]
    this.setState(state)
  }

  /**
   * Reset all feature flags to their default values
   */
  resetAll(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(STORAGE_KEY)
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to reset feature flags:', error)
    }
  }

  /**
   * Get all feature flags with their current values
   *
   * @returns Object with all flags and their current values
   */
  getAllFlags(): Record<FeatureFlagKey, boolean> {
    const result = {} as Record<FeatureFlagKey, boolean>

    for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
      result[key] = this.getFlag(key)
    }

    return result
  }

  /**
   * Check if any flags have been modified from defaults
   *
   * @returns True if any flags differ from their default values
   */
  hasModifiedFlags(): boolean {
    const state = this.getState()
    return Object.keys(state).length > 0
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlagsManager()

// Export convenience functions
export const getFeatureFlag = (key: FeatureFlagKey) => featureFlags.getFlag(key)
export const setFeatureFlag = (key: FeatureFlagKey, value: boolean) => featureFlags.setFlag(key, value)
export const toggleFeatureFlag = (key: FeatureFlagKey) => featureFlags.toggleFlag(key)
export const resetFeatureFlag = (key: FeatureFlagKey) => featureFlags.resetFlag(key)
export const resetAllFeatureFlags = () => featureFlags.resetAll()
export const getAllFeatureFlags = () => featureFlags.getAllFlags()
