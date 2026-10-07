import { Cable, Check, CircleOff, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CABLE_PRESETS } from '../constants/cables'
import type { CableType, TopologyNode } from '../types/topology'

interface PortSelectionDialogProps {
  node: TopologyNode | null
  stage: 'first' | 'second'
  cableType: CableType | null
  usedInterfaces: Set<string>
  onCancel: () => void
  onConfirm: (interfaceName: string) => void
}

export function PortSelectionDialog({ node, stage, cableType, usedInterfaces, onCancel, onConfirm }: PortSelectionDialogProps) {
  const availableInterfaces = useMemo(() => node?.data.interfaces.filter((item) => item.name.trim() && !usedInterfaces.has(item.name)) ?? [], [node, usedInterfaces])
  const [selectedInterface, setSelectedInterface] = useState('')

  useEffect(() => {
    setSelectedInterface(availableInterfaces[0]?.name ?? '')
  }, [availableInterfaces, node?.id])

  if (!node || !cableType) return null
  const cable = CABLE_PRESETS[cableType]

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="port-dialog" role="dialog" aria-modal="true" aria-labelledby="port-dialog-title">
        <button className="icon-button dialog-close" onClick={onCancel} aria-label="Cancel port selection"><X size={17} /></button>
        <div className="port-dialog__header">
          <span className="dialog-icon port-dialog__icon" style={{ color: cable.color }}><Cable size={22} /></span>
          <div><p className="eyebrow">{stage === 'first' ? 'First endpoint' : 'Second endpoint'} · {cable.shortLabel}</p><h2 id="port-dialog-title">Choose a port on {node.data.name}</h2></div>
        </div>
        <p className="port-dialog__help">Only unused, named interfaces are available for a new cable.</p>

        <div className="port-list">
          {node.data.interfaces.map((item) => {
            const unavailable = !item.name.trim() || usedInterfaces.has(item.name)
            const selected = selectedInterface === item.name && !unavailable
            return <button key={item.id} className={`port-option ${selected ? 'is-selected' : ''}`} disabled={unavailable} onClick={() => setSelectedInterface(item.name)}>
              <span className="port-option__status">{unavailable ? <CircleOff size={17} /> : selected ? <Check size={17} /> : <span />}</span>
              <span className="port-option__copy"><strong>{item.name || 'Unnamed interface'}</strong><small>{[item.role, item.ip, item.vlan ? `VLAN ${item.vlan}` : ''].filter(Boolean).join(' · ') || 'No interface details'}</small></span>
              {unavailable && <em>{item.name ? 'In use' : 'Name required'}</em>}
            </button>
          })}
          {!node.data.interfaces.length && <div className="port-empty"><CircleOff size={24} /><strong>No interfaces configured</strong><p>Cancel, select this device, and add an interface in the Properties panel.</p></div>}
          {node.data.interfaces.length > 0 && !availableInterfaces.length && <div className="port-empty"><CircleOff size={24} /><strong>No available ports</strong><p>Add another interface or disconnect an existing cable first.</p></div>}
        </div>

        <div className="dialog-actions">
          <button className="button button--ghost" onClick={onCancel}>Cancel</button>
          <button className="button button--primary" disabled={!selectedInterface} onClick={() => onConfirm(selectedInterface)}><Check size={15} /> Use this port</button>
        </div>
      </div>
    </div>
  )
}
