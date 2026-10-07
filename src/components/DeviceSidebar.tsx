import { Flame, GripVertical, Network, PanelLeftClose, Server, SquareTerminal, Waypoints } from 'lucide-react'
import { DEVICE_PRESETS } from '../constants/devices'
import type { DeviceType } from '../types/topology'

const icons = { firewall: Flame, router: Waypoints, switch: Network, pc: SquareTerminal, server: Server }

interface DeviceSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function DeviceSidebar({ collapsed, onToggle }: DeviceSidebarProps) {
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
      <div className="library-tip">
        <span className="tip-key">TIP</span>
        <p>Connect devices by dragging between the small handles on each card.</p>
      </div>
    </aside>
  )
}
