'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import type { ToastVariant } from '@/store/app-store'

interface ProgressBarProps {
  duration: number
  onComplete: () => void
}

function ProgressBar({ duration, onComplete }: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.style.transition = 'none'
    el.style.width = '100%'

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = `width ${duration}ms linear`
        el.style.width = '0%'
      })
    })

    const timer = setTimeout(onComplete, duration)
    return () => clearTimeout(timer)
  }, [duration, onComplete])

  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10 dark:bg-white/10 overflow-hidden rounded-b-lg">
      <div ref={ref} className="h-full bg-current opacity-40" style={{ width: '100%' }} />
    </div>
  )
}

const variantConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; bg: string; border: string; text: string; iconColor: string }
> = {
  default: {
    icon: <Info className="w-4 h-4" />,
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-900 dark:text-blue-100',
    iconColor: 'text-blue-500',
  },
  success: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-900 dark:text-green-100',
    iconColor: 'text-green-500',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-900 dark:text-red-100',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-900 dark:text-yellow-100',
    iconColor: 'text-yellow-500',
  },
}

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)
  const removeToast = useAppStore((s) => s.removeToast)

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const variant = toast.variant ?? 'default'
          const config = variantConfig[variant]
          const duration = toast.duration ?? 4000

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 64, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 64, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`
                pointer-events-auto relative min-w-[300px] max-w-[400px]
                rounded-lg border px-4 py-3 shadow-lg
                ${config.bg} ${config.border} ${config.text}
              `}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 ${config.iconColor}`}>{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug">{toast.title}</p>
                  {toast.message && (
                    <p className="text-xs mt-0.5 opacity-80 leading-snug">{toast.message}</p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ProgressBar duration={duration} onComplete={() => removeToast(toast.id)} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
