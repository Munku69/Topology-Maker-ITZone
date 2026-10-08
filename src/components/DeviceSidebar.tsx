import { useState } from 'react'
import { Activity, Cable, ChevronDown, PanelLeftClose, Radio, Shuffle } from 'lucide-react'
import { DEVICE_GROUPS, DEVICE_PRESETS } from '../constants/devices'
import { CABLE_PRESETS } from '../constants/cables'
import type { CableType, DeviceCategory, DeviceType } from '../types/topology'

const cableIcons = { 'copper-straight': Cable, 'copper-crossover': Shuffle, fiber: Activity, serial: Radio }

interface DeviceSidebarProps {
  collapsed: boolean
  onToggle: () => void
  selectedCable: CableType | null
  cableStartLabel: string | null
  onSelectCable: (type: CableType) => void
  portSelection: boolean
}

export function DeviceSidebar({ collapsed, onToggle, selectedCable, cableStartLabel, onSelectCable, portSelection }: DeviceSidebarProps) {
  const [openGroups, setOpenGroups] = useState<Set<DeviceCategory>>(() => new Set(['network']))
  if (collapsed) return null
  const toggleGroup = (category: DeviceCategory) => setOpenGroups((current) => {
    const next = new Set(current)
    if (next.has(category)) next.delete(category)
    else next.add(category)
    return next
  })
  const onDragStart = (event: React.DragEvent, type: DeviceType) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }
  return (
    <aside className="sidebar library-panel" aria-label="Device library">
      <div className="panel-heading">
        <div><p className="eyebrow">Components</p><h2>Device library</h2></div>
        <button className="icon-button" onClick={onToggle} title="Collapse device library"><PanelLeftClose size={17} /></button>
      </div>
      <p className="panel-help">Drag a device onto the canvas to add it.</p>
      <div className="device-groups">
        {DEVICE_GROUPS.map((group) => {
          const open = openGroups.has(group.id)
          return <section className="device-group" key={group.id}>
            <button className="device-group__header" onClick={() => toggleGroup(group.id)} aria-expanded={open}>
              <span><strong>{group.label}</strong><small>{group.types.length} devices</small></span>
              <ChevronDown size={15} className={open ? 'is-open' : ''} />
            </button>
            {open && <div className="device-grid">
              {group.types.map((type) => {
                const preset = DEVICE_PRESETS[type]
                return <button key={type} draggable onDragStart={(event) => onDragStart(event, type)} className="device-tile" style={{ '--device-accent': preset.accent } as React.CSSProperties} title={`${preset.label} · ${preset.description}`}>
                  <span className="device-art"><img src={preset.iconPath} alt="" draggable={false} /></span>
                  <strong>{preset.label}</strong>
                </button>
              })}
            </div>}
          </section>
        })}
      </div>
      <div className="cable-section">
        <div className="cable-section__heading"><div><p className="eyebrow">Connections</p><h3>Cables</h3></div>{selectedCable && <span className="tool-active">ACTIVE</span>}</div>
        <p className="panel-help cable-help">{portSelection ? 'Choose a cable, then click each device and select its port.' : 'Choose a cable, then click the two devices you want to connect.'}</p>
        <div className="cable-list">
          {(Object.keys(CABLE_PRESETS) as CableType[]).map((type) => {
            const preset = CABLE_PRESETS[type]
            const Icon = cableIcons[type]
            const active = selectedCable === type
            return <button key={type} className={`cable-tool ${active ? 'is-active' : ''}`} style={{ '--cable-color': preset.color } as React.CSSProperties} onClick={() => onSelectCable(type)} title={preset.label}>
              <span className="cable-tool__line" />
              <Icon size={17} />
              <span><strong>{preset.shortLabel}</strong><small>{preset.description}</small></span>
            </button>
          })}
        </div>
        {selectedCable && <div className="cable-progress"><span className={cableStartLabel ? 'is-complete' : ''}>1</span><p>{cableStartLabel ? `${cableStartLabel} selected` : 'Click the first device'}</p><i /><span>2</span><p>Click the second device</p></div>}
      </div>
      <div className="library-tip">
        <span className="tip-key">TIP</span>
        <p>Press Escape at any time to cancel the active cable operation.</p>
      </div>
    </aside>
  )
}
