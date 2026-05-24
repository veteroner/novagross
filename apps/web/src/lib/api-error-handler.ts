/**
 * API Error Handling Utilities
 * Centralized error handling for API calls with user-friendly messages
 */

export interface ApiErrorResponse {
  error: string
  statusCode?: number
  details?: string
}

export class ApiError extends Error {
  statusCode: number
  details?: string

  constructor(message: string, statusCode: number = 500, details?: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * Get user-friendly error message based on error type
 */
export function getErrorMessage(error: unknown): string {
  // Network error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.'
  }

  // API Error
  if (error instanceof ApiError) {
    return error.message
  }

  // Generic Error
  if (error instanceof Error) {
    return error.message
  }

  // Unknown error
  return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
}

/**
 * Retry logic for failed API calls
 */
export async function retryApiCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry on client errors (4xx)
      if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError
}

/**
 * Parse API error response
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  let errorMessage = 'Bir hata oluştu'
  let details: string | undefined

  try {
    const data = await response.json()
    errorMessage = data.error || data.message || errorMessage
    details = data.details
  } catch {
    // If JSON parsing fails, use status text
    errorMessage = response.statusText || errorMessage
  }

  return new ApiError(errorMessage, response.status, details)
}

/**
 * Fetch wrapper with error handling
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      throw await parseApiError(response)
    }

    return await response.json()
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error
    }

    // Network error or other
    throw new ApiError(
      getErrorMessage(error),
      0,
      error instanceof Error ? error.message : undefined
    )
  }
}
