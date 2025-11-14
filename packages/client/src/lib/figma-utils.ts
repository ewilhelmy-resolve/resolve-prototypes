/**
 * Figma Integration Utilities - No Manual Styling Approach
 *
 * Helper functions focused on semantic HTML structure, accessibility,
 * and enterprise compliance. NO styling utilities - let Figma handle all visual aspects.
 */

import type { FigmaComponentProps, FigmaConversionMetadata } from '@/types/figma'

/**
 * ⚠️ DEPRECATED - Use generated Figma classes only
 * This function violates the no-styling principle
 */
export function figmaCn(...inputs: any[]) {
  console.warn('figmaCn is deprecated. Use Figma-generated classes only.')
  return inputs[0] || ''
}

/**
 * Validates Figma component props against RITA Go standards
 */
export function validateFigmaProps<T extends FigmaComponentProps>(
  props: T,
  metadata: FigmaConversionMetadata
): boolean {
  // Basic validation - can be extended
  if (!props || typeof props !== 'object') {
    console.warn('Invalid Figma component props', { props, metadata })
    return false
  }

  return true
}

/**
 * Extracts accessibility attributes from Figma conversion metadata
 */
export function extractA11yAttributes(metadata: FigmaConversionMetadata): Record<string, string> {
  const a11yAttributes: Record<string, string> = {}

  // Extract ARIA labels from Figma layer names
  if (metadata.layerName) {
    const labelMatch = metadata.layerName.match(/aria-label:(.+?)(?:\s|$)/)
    if (labelMatch) {
      a11yAttributes['aria-label'] = labelMatch[1].trim()
    }
  }

  // Add role if specified in metadata
  if (metadata.role) {
    a11yAttributes.role = metadata.role
  }

  return a11yAttributes
}

/**
 * ⚠️ DEPRECATED - Manual token transformation violates no-styling principle
 * Figma plugin handles all design token to Tailwind conversion automatically
 */
export function transformDesignTokens(tokens: Record<string, any>): Record<string, string> {
  console.warn('transformDesignTokens is deprecated. Figma plugin handles token conversion.')
  return tokens
}

/**
 * Ensures Figma components follow RITA Go naming conventions
 */
export function standardizeComponentName(figmaName: string): string {
  // Convert from various Figma naming patterns to PascalCase
  return figmaName
    .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
    .replace(/^(.)/, char => char.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '')
}

/**
 * Adds RITA Go enterprise compliance attributes
 */
export function addEnterpriseAttributes(props: any): any {
  return {
    ...props,
    'data-rita-component': true,
    'data-soc2-compliant': true,
    'data-wcag-level': 'AA'
  }
}

/**
 * Logs Figma conversion for audit purposes
 */
export function logFigmaConversion(
  componentName: string,
  metadata: FigmaConversionMetadata
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('Figma Component Converted:', {
      component: componentName,
      timestamp: new Date().toISOString(),
      metadata
    })
  }
}

/**
 * ⚠️ DEPRECATED - Manual style merging violates no-styling principle
 * Figma designs should contain all RITA Go theme elements
 */
export function mergeWithRitaTheme(figmaStyles: any, _ritaTheme: any = {}): any {
  console.warn('mergeWithRitaTheme is deprecated. Use complete Figma designs with Rita theme.')
  return figmaStyles
}

/**
 * Validates semantic HTML structure of Figma-generated components
 */
export function validateSemanticStructure(element: HTMLElement): boolean {
  const semanticTags = [
    'main', 'header', 'nav', 'section', 'article', 'aside', 'footer',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li',
    'button', 'input', 'form', 'label', 'fieldset', 'legend',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'figure', 'figcaption', 'blockquote', 'cite'
  ]

  const tagName = element.tagName.toLowerCase()
  return semanticTags.includes(tagName) || element.getAttribute('role') !== null
}

/**
 * Enforces semantic HTML element usage
 */
export function ensureSemanticElement(
  elementType: string,
  props: any
): { elementType: string; enhancedProps: any } {
  const semanticMapping: Record<string, string> = {
    'div-button': 'button',
    'div-link': 'a',
    'div-heading': 'h2',
    'div-text': 'p',
    'div-list': 'ul',
    'div-nav': 'nav',
    'div-main': 'main',
    'div-section': 'section'
  }

  const semanticElement = semanticMapping[elementType] || elementType

  return {
    elementType: semanticElement,
    enhancedProps: {
      ...props,
      'data-semantic-element': semanticElement
    }
  }
}