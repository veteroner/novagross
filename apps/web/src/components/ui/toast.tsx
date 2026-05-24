'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

let toastId = 0

const toastCallbacks: Set<(toast: Toast) => void> = new Set()

export const toast = {
  success: (message: string, duration = 3000) => {
    const newToast: Toast = { id: `toast-${toastId++}`, type: 'success', message, duration }
    toastCallbacks.forEach((callback) => callback(newToast))
  },
  error: (message: string, duration = 4000) => {
    const newToast: Toast = { id: `toast-${toastId++}`, type: 'error', message, duration }
    toastCallbacks.forEach((callback) => callback(newToast))
  },
  info: (message: string, duration = 3000) => {
    const newToast: Toast = { id: `toast-${toastId++}`, type: 'info', message, duration }
    toastCallbacks.forEach((callback) => callback(newToast))
  },
  warning: (message: string, duration = 3500) => {
    const newToast: Toast = { id: `toast-${toastId++}`, type: 'warning', message, duration }
    toastCallbacks.forEach((callback) => callback(newToast))
  },
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const addToast = (newToast: Toast) => {
      setToasts((prev) => [...prev, newToast])

      if (newToast.duration) {
        setTimeout(() => {
          removeToast(newToast.id)
        }, newToast.duration)
      }
    }

    toastCallbacks.add(addToast)

    return () => {
      toastCallbacks.delete(addToast)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-top-5 ${getStyles(
            toast.type
          )}`}
        >
          {getIcon(toast.type)}
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-current hover:opacity-70 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
