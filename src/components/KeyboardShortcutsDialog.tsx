import { Code2, Keyboard, Sparkles, X } from 'lucide-react'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onClose: () => void
}

const shortcuts = [
  ['Ctrl / Cmd + Z', 'Undo the last change'],
  ['Ctrl / Cmd + Y', 'Redo the last undone change'],
  ['Ctrl / Cmd + C', 'Copy selected devices'],
  ['Ctrl / Cmd + V', 'Paste copied devices'],
  ['Delete / Backspace', 'Delete the current selection'],
  ['Ctrl / Cmd + S', 'Save the current project'],
  ['F', 'Fit and center the topology'],
  ['Esc', 'Cancel the active tool'],
  ['?', 'Open this shortcut guide'],
] as const

export function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="automation-dialog shortcuts-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close keyboard shortcuts"><X size={17} /></button>
        <div className="automation-dialog__heading"><span className="dialog-icon shortcuts-dialog__icon"><Keyboard size={21} /></span><div><p className="eyebrow">Quick reference</p><h2 id="shortcuts-title">Keyboard shortcuts</h2></div></div>
        <p className="automation-dialog__help">Keep your hands on the keyboard while arranging and editing a topology.</p>
        <div className="shortcut-list">
          {shortcuts.map(([keys, action]) => <div className="shortcut-row" key={keys}><kbd>{keys}</kbd><span>{action}</span></div>)}
        </div>
        <div className="shortcuts-credits">
          <div className="shortcuts-credits__avatar">MO</div>
          <div className="shortcuts-credits__person">
            <span>Designed &amp; built by</span>
            <strong>Munkh Odbayar</strong>
            <small>Cyber Security Engineer · ITZone LLC</small>
          </div>
          <div className="shortcuts-credits__stack"><span><Code2 size={12} /> React · TypeScript · React Flow · Vite</span><em><Sparkles size={11} /> Built with Codex</em></div>
        </div>
      </div>
    </div>
  )
}
