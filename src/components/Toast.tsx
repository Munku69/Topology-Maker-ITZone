import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'
export interface ToastMessage { id: number; kind: ToastKind; message: string }

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const [exiting, setExiting] = useState(false)
  const exitTimer = useRef<number | null>(null)
  const removeTimer = useRef<number | null>(null)

  const beginDismiss = () => {
    if (exiting) return
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current)
    if (removeTimer.current !== null) window.clearTimeout(removeTimer.current)
    setExiting(true)
    removeTimer.current = window.setTimeout(() => onDismiss(toast.id), 300)
  }

  useEffect(() => {
    exitTimer.current = window.setTimeout(() => setExiting(true), 3900)
    removeTimer.current = window.setTimeout(() => onDismiss(toast.id), 4200)

    return () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current)
      if (removeTimer.current !== null) window.clearTimeout(removeTimer.current)
    }
  }, [onDismiss, toast.id])

  const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertCircle : Info
  return (
    <div className={`toast toast--${toast.kind}${exiting ? ' is-exiting' : ''}`}>
      <Icon size={18} />
      <span>{toast.message}</span>
      <button onClick={beginDismiss} aria-label="Dismiss notification"><X size={14} /></button>
    </div>
  )
}

export function Toasts({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />)}</div>
}
