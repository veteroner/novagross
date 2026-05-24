#!/usr/bin/env node

// Color contrast validation for WCAG AA compliance

const novagrossColors = {
  // Updated to WCAG AA compliant colors
  primary: '#075985', // sky-800
  primaryForeground: '#ffffff',
  background: '#ffffff',
  foreground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  accent: '#f0f9ff',
  accentForeground: '#0c4a6e',
  destructive: '#b91c1c', // red-700
  destructiveForeground: '#ffffff',
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function getRelativeLuminance(rgb: { r: number; g: number; b: number }) {
  const rsRGB = rgb.r / 255
  const gsRGB = rgb.g / 255
  const bsRGB = rgb.b / 255

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function getContrastRatio(color1: string, color2: string) {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) return null

  const l1 = getRelativeLuminance(rgb1)
  const l2 = getRelativeLuminance(rgb2)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

function meetsWCAGAA(foreground: string, background: string) {
  const ratio = getContrastRatio(foreground, background)
  const required = 4.5

  return {
    passes: ratio !== null && ratio >= required,
    ratio,
    required,
  }
}

const combinations = [
  { name: 'Primary button', fg: novagrossColors.primaryForeground, bg: novagrossColors.primary },
  { name: 'Body text', fg: novagrossColors.foreground, bg: novagrossColors.background },
  { name: 'Muted text', fg: novagrossColors.mutedForeground, bg: novagrossColors.background },
  { name: 'Muted section', fg: novagrossColors.foreground, bg: novagrossColors.muted },
  { name: 'Accent section', fg: novagrossColors.accentForeground, bg: novagrossColors.accent },
  { name: 'Destructive button', fg: novagrossColors.destructiveForeground, bg: novagrossColors.destructive },
]

console.log('🎨 WCAG AA Color Contrast Validation for Novagross\n')
console.log('Standards: Normal text requires 4.5:1, Large text requires 3:1\n')

const results = combinations.map(({ name, fg, bg }) => {
  const result = meetsWCAGAA(fg, bg)
  return {
    combination: name,
    passes: result.passes,
    ratio: result.ratio,
    required: result.required,
  }
})

results.forEach((result) => {
  const status = result.passes ? '✅ PASS' : '❌ FAIL'
  const ratioStr = result.ratio ? result.ratio.toFixed(2) : 'N/A'
  
  console.log(`${status} ${result.combination}`)
  console.log(`   Contrast ratio: ${ratioStr}:1 (required: ${result.required}:1)`)
  
  if (!result.passes) {
    console.log(`   ⚠️  This combination does not meet WCAG AA standards!`)
  }
  console.log('')
})

const allPass = results.every(r => r.passes)
console.log('\n' + '='.repeat(50))
if (allPass) {
  console.log('✅ All color combinations pass WCAG AA standards!')
} else {
  console.log('❌ Some color combinations need adjustment')
  console.log('   Please update the failing combinations to meet accessibility standards')
}
console.log('='.repeat(50))

process.exit(allPass ? 0 : 1)
