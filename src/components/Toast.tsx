import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'
export interface ToastMessage { id: number; kind: ToastKind; message: string }

export function Toasts({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return <div className="toast-stack" aria-live="polite">{toasts.map((toast) => {
    const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertCircle : Info
    return <div className={`toast toast--${toast.kind}`} key={toast.id}><Icon size={18} /><span>{toast.message}</span><button onClick={() => onDismiss(toast.id)}><X size={14} /></button></div>
  })}</div>
}
