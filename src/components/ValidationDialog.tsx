import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import type { TopologyIssue } from '../utils/automation'

interface ValidationDialogProps {
  open: boolean
  issues: TopologyIssue[]
  onClose: () => void
  onLocate: (issue: TopologyIssue) => void
}

const issueIcons = { error: AlertCircle, warning: AlertTriangle, info: Info }

export function ValidationDialog({ open, issues, onClose, onLocate }: ValidationDialogProps) {
  if (!open) return null
  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.filter((issue) => issue.severity === 'warning').length
  const information = issues.filter((issue) => issue.severity === 'info').length
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="automation-dialog validation-dialog" role="dialog" aria-modal="true" aria-labelledby="validation-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close validation results"><X size={17} /></button>
        <div className="automation-dialog__heading"><span className="dialog-icon"><CheckCircle2 size={21} /></span><div><p className="eyebrow">Documentation check</p><h2 id="validation-title">Topology validation</h2></div></div>
        <div className="validation-summary"><span className="is-error">{errors} errors</span><span className="is-warning">{warnings} warnings</span><span>{information} suggestions</span></div>
        {!issues.length ? <div className="validation-empty"><CheckCircle2 size={28} /><strong>No issues found</strong><p>Your topology passes the current documentation checks.</p></div> : <div className="validation-list">
          {issues.map((issue) => {
            const Icon = issueIcons[issue.severity]
            return <button key={issue.id} className={`validation-item is-${issue.severity}`} onClick={() => onLocate(issue)}>
              <Icon size={17} />
              <span><strong>{issue.title}</strong><small>{issue.detail}</small></span>
              {(issue.nodeId || issue.edgeId) && <em>LOCATE</em>}
            </button>
          })}
        </div>}
      </div>
    </div>
  )
}
