/**
 * Feature Flags Type Definitions
 *
 * Centralized feature flag registry for RITA Go.
 * All feature flags must be registered here with their default values.
 */

/**
 * Feature flag identifier
 */
export type FeatureFlagKey =
  | 'SHOW_WELCOME_MODAL'
  | 'ENABLE_DEBUG_MODE'
  | 'ENABLE_EXPERIMENTAL_FEATURES'
  | 'ENABLE_SERVICENOW'
  | 'ENABLE_MULTI_FILE_UPLOAD'
  | 'ENABLE_TICKETS_V2'

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  /** Unique identifier for the flag */
  key: FeatureFlagKey
  /** Human-readable label for UI */
  label: string
  /** Description of what the flag controls */
  description: string
  /** Default value (enabled/disabled) */
  defaultValue: boolean
  /** Category for grouping in UI */
  category: 'general' | 'debug' | 'experimental'
}

/**
 * Feature flag registry
 *
 * Central source of truth for all feature flags in the application.
 * Add new flags here with their configuration.
 */
export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagConfig> = {
  SHOW_WELCOME_MODAL: {
    key: 'SHOW_WELCOME_MODAL',
    label: 'Show Welcome Modal',
    description: 'Force show welcome modal (for testing). Normal users see it automatically on first visit.',
    defaultValue: false,
    category: 'debug',
  },
  ENABLE_DEBUG_MODE: {
    key: 'ENABLE_DEBUG_MODE',
    label: 'Debug Mode',
    description: 'Enable developer debugging features and console logs',
    defaultValue: false,
    category: 'debug',
  },
  ENABLE_EXPERIMENTAL_FEATURES: {
    key: 'ENABLE_EXPERIMENTAL_FEATURES',
    label: 'Experimental Features',
    description: 'Enable beta features and experimental functionality',
    defaultValue: false,
    category: 'experimental',
  },
  ENABLE_SERVICENOW: {
    key: 'ENABLE_SERVICENOW',
    label: 'ServiceNow Integration',
    description: 'Enable ServiceNow KB and ITSM sync features',
    defaultValue: false,
    category: 'experimental',
  },
  ENABLE_MULTI_FILE_UPLOAD: {
    key: 'ENABLE_MULTI_FILE_UPLOAD',
    label: 'Multi-File Upload',
    description: 'Enable uploading multiple files at once in file inputs',
    defaultValue: false,
    category: 'experimental',
  },
  ENABLE_TICKETS_V2: {
    key: 'ENABLE_TICKETS_V2',
    label: 'Tickets',
    description: 'Enable new tickets page UI',
    defaultValue: false,
    category: 'experimental',
  },
}

/**
 * Feature flag state stored in localStorage
 */
export interface FeatureFlagState {
  [key: string]: boolean
}
