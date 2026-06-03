import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format price in Turkish Lira
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(price)
}

/**
 * Format date in Turkish locale
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/**
 * Generate slug from text
 */
export function slugify(text: string): string {
  const turkishChars: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
    Ç: 'c',
    Ğ: 'g',
    İ: 'i',
    Ö: 'o',
    Ş: 's',
    Ü: 'u',
  }

  return text
    .toLowerCase()
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (char) => turkishChars[char] || char)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length).trim() + '...'
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(price: number, comparePrice: number): number {
  if (!comparePrice || comparePrice <= price) return 0
  return Math.round((1 - price / comparePrice) * 100)
}

/**
 * Get initials from name
 */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return first + last || 'U'
}

/**
 * Generate order number
 */
export function generateOrderNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2)
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
  return `${year}${random}`
}

/**
 * Validate Turkish phone number
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return /^(05|5)[0-9]{9}$/.test(cleaned)
}

/**
 * Format phone number
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `0${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`
  }
  return phone
}

/**
 * Wait for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if running on server
 */
export function isServer(): boolean {
  return typeof window === 'undefined'
}

/**
 * Check if running on client
 */
export function isClient(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Get base URL
 */
export function getBaseUrl(): string {
  if (isClient()) return ''
  
  // Production URL from environment
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  
  // Vercel deployment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Development fallback
  const port = process.env.PORT ?? 3000
  return `http://localhost:${port}`
}

// =============================================================================
// SECURITY: Upload validation helpers
// =============================================================================

export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export const ALLOWED_IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const

export const ALLOWED_DOCUMENT_MIME = [
  'application/pdf',
  ...ALLOWED_IMAGE_MIME,
] as const

export const ALLOWED_DOCUMENT_EXT = [
  'pdf',
  ...ALLOWED_IMAGE_EXT,
] as const

export type ValidationResult =
  | { ok: true; ext: string }
  | { ok: false; error: string }

/**
 * Validate image upload — MIME + extension whitelist + size cap.
 * Returns sanitized extension for safe filename use.
 */
export function validateImageUpload(file: File, maxBytes = 5 * 1024 * 1024): ValidationResult {
  if (file.size > maxBytes) {
    return { ok: false, error: `Görsel ${(maxBytes / 1024 / 1024).toFixed(0)} MB üstünde olamaz.` }
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, error: 'Sadece JPG, PNG, WebP, GIF görseller kabul edilir.' }
  }
  if (!(ALLOWED_IMAGE_EXT as readonly string[]).includes(ext)) {
    return { ok: false, error: 'Geçersiz dosya uzantısı.' }
  }
  return { ok: true, ext }
}

/**
 * Validate document upload — broader whitelist (PDF + images).
 */
export function validateDocumentUpload(file: File, maxBytes = 10 * 1024 * 1024): ValidationResult {
  if (file.size > maxBytes) {
    return { ok: false, error: `Dosya ${(maxBytes / 1024 / 1024).toFixed(0)} MB üstünde olamaz.` }
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!(ALLOWED_DOCUMENT_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, error: 'Sadece PDF, JPG, PNG, WebP dosyaları kabul edilir.' }
  }
  if (!(ALLOWED_DOCUMENT_EXT as readonly string[]).includes(ext)) {
    return { ok: false, error: 'Geçersiz dosya uzantısı.' }
  }
  return { ok: true, ext }
}

/**
 * Safe filename generator — random suffix + sanitized ext only.
 * Prevents path traversal (../../etc) and unicode/control-char attacks.
 */
export function safeUploadPath(prefix: string, ext: string): string {
  const safeExt = (ext || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  const rand = Math.random().toString(36).slice(2, 10)
  return `${prefix}/${Date.now()}-${rand}.${safeExt}`
}
