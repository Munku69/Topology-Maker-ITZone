import { FileDown, ImageDown, Monitor, Sun, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ExportBackground, PdfExportDetails, PdfLayout } from '../types/export'

export type ExportFormat = 'png' | 'pdf'

interface ExportOptionsDialogProps {
  format: ExportFormat | null
  exporting: boolean
  onCancel: () => void
  onFormatChange: (format: ExportFormat) => void
  onExport: (background: ExportBackground, pdfLayout: PdfLayout, details: PdfExportDetails) => void
}

const PDF_LAYOUTS: Array<{ id: PdfLayout; label: string; description: string }> = [
  { id: 'standard', label: 'Standard report', description: 'Clean report with a large landscape diagram.' },
  { id: 'itzone-landscape', label: 'ITZone landscape', description: 'Landscape frame, legend, logo, and title block.' },
  { id: 'itzone-portrait', label: 'ITZone portrait', description: 'Portrait frame, legend, logo, and title block.' },
]

export function ExportOptionsDialog({ format, exporting, onCancel, onFormatChange, onExport }: ExportOptionsDialogProps) {
  const [background, setBackground] = useState<ExportBackground>('white')
  const [pdfLayout, setPdfLayout] = useState<PdfLayout>('itzone-landscape')
  const [author, setAuthor] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!format) return
    setBackground(format === 'pdf' ? 'white' : 'canvas')
    setPdfLayout('itzone-landscape')
    setAuthor('')
    setNotes('')
  }, [format])

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
          <div><p className="eyebrow">Export {format.toUpperCase()}</p><h2 id="export-options-title">Export options</h2></div>
        </div>
        <p className="export-options-dialog__help">The complete topology will be included in the {formatLabel}, including devices outside the current viewport.</p>

        <div className="export-format-options" aria-label="Export format">
          <button className={isPng ? 'is-selected' : ''} onClick={() => onFormatChange('png')} disabled={exporting}><ImageDown size={16} /><span><strong>PNG image</strong><small>Diagram only</small></span></button>
          <button className={!isPng ? 'is-selected' : ''} onClick={() => onFormatChange('pdf')} disabled={exporting}><FileDown size={16} /><span><strong>PDF report</strong><small>ITZone page templates</small></span></button>
        </div>

        {!isPng && (
          <section className="export-option-section">
            <label>Page template</label>
            <div className="export-template-options">
              {PDF_LAYOUTS.map((layout) => (
                <button key={layout.id} className={pdfLayout === layout.id ? 'is-selected' : ''} onClick={() => setPdfLayout(layout.id)} disabled={exporting}>
                  <span className={`export-template-preview export-template-preview--${layout.id}`}><i /><b>ITZone</b></span>
                  <span><strong>{layout.label}</strong><small>{layout.description}</small></span>
                </button>
              ))}
            </div>
          </section>
        )}

        {!isPng && (
          <section className="export-option-section">
            <label>Title block details</label>
            <div className="export-detail-fields">
              <label><span>Author / name</span><input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="e.g. Munkh Odbayar" maxLength={80} /></label>
              <label><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Project notes, scope, revision, or location" rows={3} maxLength={280} /></label>
            </div>
          </section>
        )}

        <section className="export-option-section">
          <label>Diagram background</label>
          <div className="export-background-options">
            <button className={background === 'canvas' ? 'is-selected' : ''} onClick={() => setBackground('canvas')} disabled={exporting}>
              <span className="export-background-preview export-background-preview--canvas"><Monitor size={22} /></span>
              <span><strong>Canvas background</strong><small>Use the current canvas color.</small></span>
            </button>
            <button className={background === 'white' ? 'is-selected' : ''} onClick={() => setBackground('white')} disabled={exporting}>
              <span className="export-background-preview export-background-preview--white"><Sun size={22} /></span>
              <span><strong>White background</strong><small>Best for documents and printing.</small></span>
            </button>
          </div>
        </section>

        <div className="dialog-actions">
          <button className="button button--ghost" onClick={onCancel} disabled={exporting}>Cancel</button>
          <button className="button button--primary" onClick={() => onExport(background, pdfLayout, { author: author.trim(), notes: notes.trim() })} disabled={exporting}><FormatIcon size={15} /> Export {format.toUpperCase()}</button>
        </div>
      </div>
    </div>
  )
}
