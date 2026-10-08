import { FileDown, ImageDown, Monitor, Sun, X } from 'lucide-react'
import type { ExportBackground } from './Toolbar'

export type ExportFormat = 'png' | 'pdf'

interface ExportOptionsDialogProps {
  format: ExportFormat | null
  exporting: boolean
  onCancel: () => void
  onExport: (background: ExportBackground) => void
}

export function ExportOptionsDialog({ format, exporting, onCancel, onExport }: ExportOptionsDialogProps) {
  if (!format) return null
  const isPng = format === 'png'
  const FormatIcon = isPng ? ImageDown : FileDown
  const formatLabel = isPng ? 'PNG image' : 'PDF report'

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="export-options-dialog" role="dialog" aria-modal="true" aria-labelledby="export-options-title">
        <button className="icon-button dialog-close" onClick={onCancel} disabled={exporting} aria-label="Close export options"><X size={17} /></button>
        <div className="export-options-dialog__heading">
          <span><FormatIcon size={20} /></span>
          <div><p className="eyebrow">Export {format.toUpperCase()}</p><h2 id="export-options-title">Choose a background</h2></div>
        </div>
        <p className="export-options-dialog__help">The complete topology will be included in the {formatLabel}, including devices outside the current viewport.</p>
        <div className="export-background-options">
          <button onClick={() => onExport('canvas')} disabled={exporting}>
            <span className="export-background-preview export-background-preview--canvas"><Monitor size={22} /></span>
            <span><strong>Canvas background</strong><small>Use the current light or dark canvas color.</small></span>
          </button>
          <button onClick={() => onExport('white')} disabled={exporting}>
            <span className="export-background-preview export-background-preview--white"><Sun size={22} /></span>
            <span><strong>White background</strong><small>Clean white background for documents and printing.</small></span>
          </button>
        </div>
        <div className="dialog-actions"><button className="button button--ghost" onClick={onCancel} disabled={exporting}>Cancel</button></div>
      </div>
    </div>
  )
}
