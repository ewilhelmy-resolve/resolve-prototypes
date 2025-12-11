/**
 * Figma Integration Type Definitions
 *
 * TypeScript types for Figma-generated components and
 * integration with RITA Go architecture.
 */
/** biome-ignore-all lint/complexity/noBannedTypes: temp */
/** biome-ignore-all lint/suspicious/noExplicitAny: temp */

import type { ReactNode } from 'react'

/**
 * Base interface for all Figma-generated components
 */
export interface FigmaComponentProps {
  /** Component children */
  children?: ReactNode
  /** Custom CSS classes */
  className?: string
  /** Component ID for testing and accessibility */
  id?: string
  /** ARIA attributes for accessibility */
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  /** Data attributes for enterprise compliance */
  'data-testid'?: string
  'data-rita-component'?: boolean
  'data-soc2-compliant'?: boolean
  'data-wcag-level'?: 'A' | 'AA' | 'AAA'
}

/**
 * Metadata from Figma conversion process
 */
export interface FigmaConversionMetadata {
  /** Original Figma layer name */
  layerName: string
  /** Figma file ID */
  fileId?: string
  /** Figma node ID */
  nodeId?: string
  /** Conversion timestamp */
  convertedAt: string
  /** AI model used for conversion */
  aiModel?: 'claude-3.5-sonnet' | 'gemini-2.5-pro' | 'v0'
  /** Component type detected by AI */
  componentType: FigmaComponentType
  /** Accessibility role */
  role?: string
  /** Design tokens extracted */
  designTokens?: FigmaDesignTokens
  /** RITA Go specific customizations applied */
  ritaCustomizations?: string[]
}

/**
 * Supported Figma component types
 */
export type FigmaComponentType =
  | 'button'
  | 'input'
  | 'card'
  | 'header'
  | 'footer'
  | 'navigation'
  | 'hero-section'
  | 'feature-section'
  | 'form'
  | 'modal'
  | 'dialog'
  | 'table'
  | 'list'
  | 'layout'
  | 'container'
  | 'text'
  | 'image'
  | 'icon'
  | 'divider'
  | 'badge'
  | 'avatar'
  | 'skeleton'
  | 'tooltip'
  | 'dropdown'
  | 'tabs'
  | 'accordion'
  | 'carousel'
  | 'chart'
  | 'dashboard'
  | 'sidebar'
  | 'breadcrumb'
  | 'pagination'
  | 'search'
  | 'filter'
  | 'custom'

/**
 * Design tokens extracted from Figma
 */
export interface FigmaDesignTokens {
  colors?: {
    primary?: string
    secondary?: string
    background?: string
    foreground?: string
    muted?: string
    accent?: string
    destructive?: string
    border?: string
  }
  spacing?: {
    xs?: string
    sm?: string
    md?: string
    lg?: string
    xl?: string
  }
  typography?: {
    fontSize?: string
    fontWeight?: string
    lineHeight?: string
    fontFamily?: string
  }
  borderRadius?: {
    sm?: string
    md?: string
    lg?: string
    full?: string
  }
  shadows?: {
    sm?: string
    md?: string
    lg?: string
  }
}

/**
 * RITA Go specific component configuration
 */
export interface RitaComponentConfig {
  /** Whether component requires authentication */
  requiresAuth?: boolean
  /** SOC2 compliance level */
  complianceLevel?: 'basic' | 'enhanced' | 'strict'
  /** WCAG compliance target */
  wcagTarget?: 'A' | 'AA' | 'AAA'
  /** Performance monitoring enabled */
  performanceTracking?: boolean
  /** Security scan required */
  securityScan?: boolean
  /** Feature flag dependencies */
  featureFlags?: string[]
}

/**
 * Component with Figma metadata
 */
export interface FigmaComponent<T = {}> {
  /** Component props */
  props: T & FigmaComponentProps
  /** Conversion metadata */
  metadata: FigmaConversionMetadata
  /** RITA Go configuration */
  ritaConfig?: RitaComponentConfig
}

/**
 * Figma plugin response structure
 */
export interface FigmaPluginResponse {
  /** Generated component code */
  componentCode: string
  /** Component metadata */
  metadata: FigmaConversionMetadata
  /** Suggested improvements */
  suggestions?: string[]
  /** Detected issues */
  issues?: FigmaConversionIssue[]
}

/**
 * Issues detected during conversion
 */
export interface FigmaConversionIssue {
  /** Issue type */
  type: 'accessibility' | 'performance' | 'security' | 'compatibility'
  /** Issue severity */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** Issue description */
  message: string
  /** Suggested fix */
  suggestion?: string
  /** Auto-fixable */
  autoFixable?: boolean
}

/**
 * Figma to RITA Go component mapping
 */
export interface FigmaComponentMapping {
  /** Original Figma component name */
  figmaName: string
  /** Standardized RITA Go component name */
  ritaName: string
  /** Component category */
  category: 'ui' | 'layout' | 'feature' | 'page'
  /** Import path */
  importPath: string
  /** Dependencies */
  dependencies?: string[]
}

/**
 * Design system configuration
 */
export interface DesignSystemConfig {
  /** Theme configuration */
  theme: {
    colors: Record<string, string>
    spacing: Record<string, string>
    typography: Record<string, any>
    breakpoints: Record<string, string>
  }
  /** Component defaults */
  componentDefaults: Record<string, any>
  /** Brand guidelines */
  brand: {
    logo?: string
    primaryColor: string
    fontFamily: string
  }
}

/**
 * Utility type for Figma component factories
 */
export type FigmaComponentFactory<T = {}> = (
  props: T & FigmaComponentProps,
  metadata?: FigmaConversionMetadata
) => React.ComponentType<T & FigmaComponentProps>

/**
 * Props for components that wrap Figma-generated content
 */
export interface FigmaWrapperProps extends FigmaComponentProps {
  /** Whether to apply RITA Go enterprise styles */
  applyEnterpriseStyles?: boolean
  /** Whether to enable accessibility enhancements */
  enhanceAccessibility?: boolean
  /** Whether to add security attributes */
  addSecurityAttributes?: boolean
  /** Custom theme overrides */
  themeOverrides?: Partial<DesignSystemConfig['theme']>
}