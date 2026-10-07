import { Activity, Cable, Flame, GripVertical, Network, PanelLeftClose, Radio, Server, Shuffle, SquareTerminal, Waypoints } from 'lucide-react'
import { DEVICE_PRESETS } from '../constants/devices'
import { CABLE_PRESETS } from '../constants/cables'
import type { CableType, DeviceType } from '../types/topology'

const icons = { firewall: Flame, router: Waypoints, switch: Network, pc: SquareTerminal, server: Server }
const cableIcons = { 'copper-straight': Cable, 'copper-crossover': Shuffle, fiber: Activity, serial: Radio }

interface DeviceSidebarProps {
  collapsed: boolean
  onToggle: () => void
  selectedCable: CableType | null
  cableStartLabel: string | null
  onSelectCable: (type: CableType) => void
}

export function DeviceSidebar({ collapsed, onToggle, selectedCable, cableStartLabel, onSelectCable }: DeviceSidebarProps) {
  if (collapsed) return null
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
      <div className="device-list">
        {(Object.keys(DEVICE_PRESETS) as DeviceType[]).map((type) => {
          const preset = DEVICE_PRESETS[type]
          const Icon = icons[type]
          return (
            <button
              key={type}
              draggable
              onDragStart={(event) => onDragStart(event, type)}
              className="library-device"
              style={{ '--device-accent': preset.accent } as React.CSSProperties}
              title={`Drag ${preset.label} to canvas`}
            >
              <span className="library-device__icon"><Icon size={20} /></span>
              <span className="library-device__copy"><strong>{preset.label}</strong><small>{preset.description}</small></span>
              <GripVertical size={16} className="grip" />
            </button>
          )
        })}
      </div>
      <div className="cable-section">
        <div className="cable-section__heading"><div><p className="eyebrow">Connections</p><h3>Cables</h3></div>{selectedCable && <span className="tool-active">ACTIVE</span>}</div>
        <p className="panel-help cable-help">Choose a cable, then click each device and select its port.</p>
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
