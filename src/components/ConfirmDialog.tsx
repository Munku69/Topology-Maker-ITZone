import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <button className="icon-button dialog-close" onClick={onCancel}><X size={17} /></button>
        <span className="dialog-icon"><AlertTriangle size={22} /></span>
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="dialog-actions"><button className="button button--ghost" onClick={onCancel}>Cancel</button><button className="button button--danger" onClick={onConfirm}>{confirmLabel}</button></div>
      </div>
    </div>
  )
}
