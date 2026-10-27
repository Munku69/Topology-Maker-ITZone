import { Boxes, Building2, Check, Database, GitBranch, LayoutGrid, Network, X } from 'lucide-react'
import { useState } from 'react'
import type { LayoutPreset } from '../utils/automation'

interface LayoutAutomationDialogProps {
  open: boolean
  selectedCount: number
  zoneCount: number
  onClose: () => void
  onApply: (preset: LayoutPreset, options: { selectedOnly: boolean; keepSelectedLocked: boolean }) => void
}

const PRESETS: Array<{ id: LayoutPreset; name: string; description: string; icon: typeof LayoutGrid }> = [
  { id: 'hierarchical', name: 'Hierarchical', description: 'Follow the existing connection flow from top to bottom.', icon: GitBranch },
  { id: 'core-access', name: 'Core / access', description: 'Group internet, security, core, access, and users into tiers.', icon: Network },
  { id: 'internet-users', name: 'Internet to users', description: 'Create a clean edge-to-endpoint documentation flow.', icon: LayoutGrid },
  { id: 'branch', name: 'Branch topology', description: 'Place HQ and branch-prefixed devices into office columns.', icon: Building2 },
  { id: 'data-center', name: 'Data center', description: 'Arrange protection, delivery, application, and data tiers.', icon: Database },
  { id: 'inside-zones', name: 'Inside each zone', description: 'Neatly grid devices within their current zone boundaries.', icon: Boxes },
]

export function LayoutAutomationDialog({ open, selectedCount, zoneCount, onClose, onApply }: LayoutAutomationDialogProps) {
  const [preset, setPreset] = useState<LayoutPreset>('hierarchical')
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [keepSelectedLocked, setKeepSelectedLocked] = useState(false)
  if (!open) return null
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="automation-dialog layout-dialog" role="dialog" aria-modal="true" aria-labelledby="layout-title">
      <button className="icon-button dialog-close" onClick={onClose} aria-label="Close layout options"><X size={17} /></button>
      <div className="automation-dialog__heading"><span className="dialog-icon"><LayoutGrid size={21} /></span><div><p className="eyebrow">Smart arrangement</p><h2 id="layout-title">Choose a layout</h2></div></div>
      <p className="automation-dialog__help">Zones remain in place. Choose whether selected devices are the layout target or anchors that must not move.</p>
      <div className="layout-preset-grid">{PRESETS.map((item) => { const Icon = item.icon; return <button key={item.id} className={preset === item.id ? 'is-selected' : ''} onClick={() => setPreset(item.id)} disabled={item.id === 'inside-zones' && !zoneCount}><Icon size={19} /><span><strong>{item.name}</strong><small>{item.description}</small></span>{preset === item.id && <Check size={15} />}</button> })}</div>
      <div className="layout-options">
        <label><input type="checkbox" checked={selectedOnly} disabled={!selectedCount || keepSelectedLocked} onChange={(event) => setSelectedOnly(event.target.checked)} /><span><strong>Arrange selected devices only</strong><small>{selectedCount ? `${selectedCount} devices selected` : 'Select devices on the canvas first'}</small></span></label>
        <label><input type="checkbox" checked={keepSelectedLocked} disabled={!selectedCount || selectedOnly} onChange={(event) => setKeepSelectedLocked(event.target.checked)} /><span><strong>Keep selected devices locked</strong><small>Use selected devices as fixed manual anchors.</small></span></label>
      </div>
      <div className="dialog-actions"><button className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" onClick={() => onApply(preset, { selectedOnly, keepSelectedLocked })}><LayoutGrid size={15} /> Apply layout</button></div>
    </div>
  </div>
}
