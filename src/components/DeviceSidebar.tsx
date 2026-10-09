import { useState } from 'react'
import { Activity, Cable, ChevronDown, PanelLeftClose, Radio, Shuffle, SquareDashed, Trash2, Type } from 'lucide-react'
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
  onResizeStart: (event: React.PointerEvent) => void
  deleteMode: boolean
  onToggleDeleteMode: () => void
  textToolMode: boolean
  onToggleTextTool: () => void
  zoneToolMode: boolean
  onToggleZoneTool: () => void
}

export function DeviceSidebar({ collapsed, onToggle, selectedCable, cableStartLabel, onSelectCable, portSelection, onResizeStart, deleteMode, onToggleDeleteMode, textToolMode, onToggleTextTool, zoneToolMode, onToggleZoneTool }: DeviceSidebarProps) {
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
      <div className="panel-resizer panel-resizer--library" role="separator" aria-orientation="vertical" aria-label="Resize device library" title="Drag to resize the device library" onPointerDown={onResizeStart} />
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
      <div className="sidebar-tools">
        <button className={`sidebar-zone-tool ${zoneToolMode ? 'is-active' : ''}`} onClick={onToggleZoneTool} title={zoneToolMode ? 'Cancel zone drawing' : 'Draw a rectangular network zone'} aria-pressed={zoneToolMode}>
          <SquareDashed size={16} />
          <span><strong>Zone tool</strong><small>{zoneToolMode ? 'Drag a rectangle on the canvas' : 'Draw colored zone boundaries'}</small></span>
          <em>{zoneToolMode ? 'ACTIVE' : 'TOOL'}</em>
        </button>
        <button className={`sidebar-text-tool ${textToolMode ? 'is-active' : ''}`} onClick={onToggleTextTool} title={textToolMode ? 'Exit text box mode' : 'Add a text box to the canvas'} aria-pressed={textToolMode}>
          <Type size={16} />
          <span><strong>Text box</strong><small>{textToolMode ? 'Click an empty canvas area' : 'Add a movable canvas note'}</small></span>
          <em>{textToolMode ? 'ACTIVE' : 'TOOL'}</em>
        </button>
        <button className={`sidebar-delete-tool ${deleteMode ? 'is-active' : ''}`} onClick={onToggleDeleteMode} title={deleteMode ? 'Exit delete mode' : 'Delete devices and cables'} aria-pressed={deleteMode}>
          <Trash2 size={16} />
          <span><strong>Delete tool</strong><small>{deleteMode ? 'Click a device or cable' : 'Remove devices and cables'}</small></span>
          <em>{deleteMode ? 'ACTIVE' : 'TOOL'}</em>
        </button>
      </div>
    </aside>
  )
}
