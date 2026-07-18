import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastContextValue {
  toast: (msg: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number>(0)

  const toast = useCallback((m: string) => {
    window.clearTimeout(timer.current)
    setMsg(m)
    timer.current = window.setTimeout(() => setMsg(null), 2400)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {msg && (
        <div className="toast" role="status" aria-live="polite">
          <span className="diamond" aria-hidden="true" />
          <span>{msg}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
