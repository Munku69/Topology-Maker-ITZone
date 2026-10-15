import { Building2, Database, GitBranch, ShieldCheck, X } from 'lucide-react'
import { TOPOLOGY_TEMPLATES, type TopologyTemplateDefinition } from '../constants/templates'

interface TopologyTemplatesDialogProps {
  open: boolean
  onClose: () => void
  onChoose: (template: TopologyTemplateDefinition) => void
}

const icons = { 'small-office': Building2, 'dual-isp-ha': ShieldCheck, 'branch-office': GitBranch, 'data-center': Database }

export function TopologyTemplatesDialog({ open, onClose, onChoose }: TopologyTemplatesDialogProps) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="automation-dialog" role="dialog" aria-modal="true" aria-labelledby="templates-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close topology templates"><X size={17} /></button>
        <div className="automation-dialog__heading"><span className="dialog-icon"><GitBranch size={21} /></span><div><p className="eyebrow">Quick start</p><h2 id="templates-title">Topology templates</h2></div></div>
        <p className="automation-dialog__help">Start with a complete editable design. Loading a template replaces the current canvas after confirmation.</p>
        <div className="template-card-grid">
          {TOPOLOGY_TEMPLATES.map((template) => {
            const Icon = icons[template.id]
            return <button key={template.id} className="template-card" onClick={() => onChoose(template)}>
              <span><Icon size={21} /></span>
              <strong>{template.name}</strong>
              <p>{template.description}</p>
              <small>{template.summary}</small>
            </button>
          })}
        </div>
      </div>
    </div>
  )
}
