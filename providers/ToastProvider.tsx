'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

type ToastVariant = 'success' | 'error'

type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
}

type ToastItem = ToastInput & {
  id: number
}

type ToastContextValue = {
  toast: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seqRef = useRef(1)

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id = seqRef.current++
      const next: ToastItem = {
        id,
        variant: input.variant ?? 'success',
        durationMs: input.durationMs ?? 2600,
        title: input.title,
        description: input.description,
      }
      setToasts((prev) => [...prev, next])
      window.setTimeout(() => removeToast(id), next.durationMs)
    },
    [removeToast]
  )

  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              'rounded-lg border px-3 py-2 shadow-sm backdrop-blur',
              t.variant === 'error'
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-green-500/30 bg-green-500/10 text-green-800',
            ].join(' ')}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-medium">{t.title}</p>
            {t.description ? <p className="text-xs opacity-90">{t.description}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

