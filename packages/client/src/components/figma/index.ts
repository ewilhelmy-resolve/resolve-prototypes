/**
 * Figma Components Export Barrel
 *
 * This file exports all Figma-generated and customized components
 * for easy importing throughout the Rita Go application.
 *
 * Usage:
 * import { FigmaButton, CustomHeroSection } from '@/components/figma'
 */

// Generated components (direct from Figma plugin)
export * from './generated'

// Customized components (Rita-specific modifications)
export * from './customized'

// Re-export common types for convenience
export type { FigmaComponentProps, FigmaConversionMetadata } from '@/types/figma'