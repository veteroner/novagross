/**
 * Color Contrast Utilities for WCAG AA Compliance
 * 
 * WCAG AA Standards:
 * - Normal text (< 18pt or < 14pt bold): 4.5:1 contrast ratio
 * - Large text (≥ 18pt or ≥ 14pt bold): 3:1 contrast ratio
 * - Non-text elements (UI components, graphics): 3:1 contrast ratio
 */

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

/**
 * Calculate relative luminance
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
export function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const rsRGB = rgb.r / 255
  const gsRGB = rgb.g / 255
  const bsRGB = rgb.b / 255

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
export function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) return null

  const l1 = getRelativeLuminance(rgb1)
  const l2 = getRelativeLuminance(rgb2)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  options: {
    large?: boolean // Large text has lower requirement (3:1 vs 4.5:1)
  } = {}
): {
  passes: boolean
  ratio: number | null
  required: number
} {
  const ratio = getContrastRatio(foreground, background)
  const required = options.large ? 3 : 4.5

  return {
    passes: ratio !== null && ratio >= required,
    ratio,
    required,
  }
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  options: {
    large?: boolean // Large text: 4.5:1, Normal text: 7:1
  } = {}
): {
  passes: boolean
  ratio: number | null
  required: number
} {
  const ratio = getContrastRatio(foreground, background)
  const required = options.large ? 4.5 : 7

  return {
    passes: ratio !== null && ratio >= required,
    ratio,
    required,
  }
}

/**
 * Suggest a darker or lighter version of a color to meet contrast requirements
 */
export function suggestAccessibleColor(
  foreground: string,
  background: string,
  options: {
    large?: boolean
    targetAAA?: boolean
  } = {}
): string {
  const targetRatio = options.targetAAA
    ? options.large
      ? 4.5
      : 7
    : options.large
    ? 3
    : 4.5

  const bgRgb = hexToRgb(background)
  const fgRgb = hexToRgb(foreground)

  if (!bgRgb || !fgRgb) return foreground

  const bgLuminance = getRelativeLuminance(bgRgb)

  // Determine if we need to darken or lighten the foreground
  const needsDarker = bgLuminance > 0.5

  let adjustedRgb = { ...fgRgb }
  let step = needsDarker ? -5 : 5

  // Iteratively adjust color until we meet the target ratio
  for (let i = 0; i < 50; i++) {
    const currentRatio = getContrastRatio(
      `#${rgbToHex(adjustedRgb.r, adjustedRgb.g, adjustedRgb.b)}`,
      background
    )

    if (currentRatio && currentRatio >= targetRatio) {
      return `#${rgbToHex(adjustedRgb.r, adjustedRgb.g, adjustedRgb.b)}`
    }

    adjustedRgb.r = Math.max(0, Math.min(255, adjustedRgb.r + step))
    adjustedRgb.g = Math.max(0, Math.min(255, adjustedRgb.g + step))
    adjustedRgb.b = Math.max(0, Math.min(255, adjustedRgb.b + step))
  }

  return foreground // Return original if we can't find a solution
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return [r, g, b]
    .map((x) => {
      const hex = Math.round(x).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    })
    .join('')
}

/**
 * Common color palette checks for Novagross
 * Updated to WCAG AA compliant colors
 */
export const novagrossColors = {
  // Primary colors - sky-800 for better contrast
  primary: '#075985', // sky-800 (7.56:1 ratio)
  primaryForeground: '#ffffff',
  
  // Background colors
  background: '#ffffff',
  foreground: '#0f172a', // slate-900
  
  // Muted colors
  muted: '#f1f5f9', // slate-100
  mutedForeground: '#64748b', // slate-500
  
  // Accent colors
  accent: '#f0f9ff', // sky-50
  accentForeground: '#0c4a6e', // sky-900
  
  // Destructive colors - red-700 for better contrast
  destructive: '#b91c1c', // red-700 (6.47:1 ratio)
  destructiveForeground: '#ffffff',
} as const

/**
 * Validate all Novagross color combinations
 */
export function validateNovagrossColors(): {
  combination: string
  passes: boolean
  ratio: number | null
  required: number
}[] {
  const combinations = [
    { name: 'Primary button', fg: novagrossColors.primaryForeground, bg: novagrossColors.primary },
    { name: 'Body text', fg: novagrossColors.foreground, bg: novagrossColors.background },
    { name: 'Muted text', fg: novagrossColors.mutedForeground, bg: novagrossColors.background },
    { name: 'Muted section', fg: novagrossColors.foreground, bg: novagrossColors.muted },
    { name: 'Accent section', fg: novagrossColors.accentForeground, bg: novagrossColors.accent },
    { name: 'Destructive button', fg: novagrossColors.destructiveForeground, bg: novagrossColors.destructive },
  ]

  return combinations.map(({ name, fg, bg }) => {
    const result = meetsWCAGAA(fg, bg)
    return {
      combination: name,
      passes: result.passes,
      ratio: result.ratio,
      required: result.required,
    }
  })
}
