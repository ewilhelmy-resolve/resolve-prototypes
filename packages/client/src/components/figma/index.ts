/**
 * Figma Components Export Barrel
 *
 * This file exports all Figma-generated and customized components
 * for easy importing throughout the RITA Go application.
 *
 * Usage:
 * import { FigmaButton, CustomHeroSection } from '@/components/figma'
 */

// Re-export common types for convenience
export type {
	FigmaComponentProps,
	FigmaConversionMetadata,
} from "@/types/figma";

// Customized components (Rita-specific modifications)
export * from "./customized";
// Generated components (direct from Figma plugin)
export * from "./generated";
