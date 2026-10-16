import { useState } from 'react'
import { Activity, Cable, ChevronDown, CornerDownRight, Minus, PanelLeftClose, Radio, Search, Shuffle, Spline, SquareDashed, Trash2, Type, X } from 'lucide-react'
import { DEVICE_GROUPS, DEVICE_PRESETS } from '../constants/devices'
import { CABLE_COLORS, CABLE_PRESETS } from '../constants/cables'
import { LINK_PURPOSES, LINK_SPEEDS, type CablePathStyle, type CableType, type DeviceCategory, type DeviceType, type LinkPurpose, type LinkSpeed } from '../types/topology'
import { LinkCountInput } from './LinkCountInput'

const cableIcons = { 'copper-straight': Cable, 'copper-crossover': Shuffle, fiber: Activity, serial: Radio }

interface DeviceSidebarProps {
  collapsed: boolean
  onToggle: () => void
  selectedCable: CableType | null
  cableStartLabel: string | null
  onSelectCable: (type: CableType) => void
  cableColor: string
  cableSpeed: LinkSpeed
  cableCount: number
  cablePurpose: LinkPurpose
  cablePathStyle: CablePathStyle
  onCableColorChange: (value: string) => void
  onCableSpeedChange: (value: LinkSpeed) => void
  onCableCountChange: (value: number) => void
  onCablePurposeChange: (value: LinkPurpose) => void
  onCablePathStyleChange: (value: CablePathStyle) => void
  portSelection: boolean
  onResizeStart: (event: React.PointerEvent) => void
  deleteMode: boolean
  onToggleDeleteMode: () => void
  textToolMode: boolean
  onToggleTextTool: () => void
  zoneToolMode: boolean
  onToggleZoneTool: () => void
}

export function DeviceSidebar({ collapsed, onToggle, selectedCable, cableStartLabel, onSelectCable, cableColor, cableSpeed, cableCount, cablePurpose, cablePathStyle, onCableColorChange, onCableSpeedChange, onCableCountChange, onCablePurposeChange, onCablePathStyleChange, portSelection, onResizeStart, deleteMode, onToggleDeleteMode, textToolMode, onToggleTextTool, zoneToolMode, onToggleZoneTool }: DeviceSidebarProps) {
  const [openGroups, setOpenGroups] = useState<Set<DeviceCategory>>(() => new Set(['network']))
  const [search, setSearch] = useState('')
  if (collapsed) return null
  const query = search.trim().toLowerCase()
  const visibleGroups = DEVICE_GROUPS.map((group) => ({
    ...group,
    types: group.types.filter((type) => {
      if (!query) return true
      const preset = DEVICE_PRESETS[type]
      return [preset.label, preset.description, preset.defaultName, preset.type].some((value) => value.toLowerCase().includes(query))
    }),
  })).filter((group) => group.types.length)
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
      <label className="device-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search devices" aria-label="Search devices" />{search && <button onClick={() => setSearch('')} title="Clear device search"><X size={13} /></button>}</label>
      <div className="device-groups">
        {visibleGroups.map((group) => {
          const open = Boolean(query) || openGroups.has(group.id)
          return <section className="device-group" key={group.id}>
            <button className="device-group__header" onClick={() => toggleGroup(group.id)} aria-expanded={open}>
              <span><strong>{group.label}</strong><small>{group.types.length} devices</small></span>
              <ChevronDown size={15} className={open ? 'is-open' : ''} />
            </button>
            {open && <div className="device-grid">
              {group.types.map((type) => {
                const preset = DEVICE_PRESETS[type]
                return <button key={type} draggable onDragStart={(event) => onDragStart(event, type)} className={`device-tile device-tile--${type}`} style={{ '--device-accent': preset.accent } as React.CSSProperties} title={`${preset.label} · ${preset.description}`}>
                  <span className="device-art"><img src={preset.iconPath} alt="" draggable={false} /></span>
                  <strong>{preset.label}</strong>
                </button>
              })}
            </div>}
          </section>
        })}
        {!visibleGroups.length && <p className="device-search-empty">No devices match “{search.trim()}”.</p>}
      </div>
      <div className="cable-section">
        <div className="cable-section__heading"><div><p className="eyebrow">Connections</p><h3>Cables</h3></div>{selectedCable && <span className="tool-active">ACTIVE</span>}</div>
        <p className="panel-help cable-help">{portSelection ? 'Choose a cable type, speed, and purpose, then select a port on each device.' : 'Choose a color and link details, then click the two devices to connect them.'}</p>
        <div className="cable-list">
          {portSelection ? (Object.keys(CABLE_PRESETS) as CableType[]).map((type) => {
            const preset = CABLE_PRESETS[type]
            const Icon = cableIcons[type]
            const active = selectedCable === type
            return <button key={type} className={`cable-tool ${active ? 'is-active' : ''}`} style={{ '--cable-color': preset.color } as React.CSSProperties} onClick={() => onSelectCable(type)} title={preset.label}>
              <span className="cable-tool__line" />
              <Icon size={17} />
              <span><strong>{preset.shortLabel}</strong><small>{preset.description}</small></span>
            </button>
          }) : <button className={`cable-tool cable-tool--generic ${selectedCable ? 'is-active' : ''}`} style={{ '--cable-color': cableColor } as React.CSSProperties} onClick={() => onSelectCable('copper-straight')} title="Draw a connection">
            <span className="cable-tool__line" />
            <Cable size={18} />
            <span><strong>Cable</strong><small>Simple connection</small></span>
          </button>}
        </div>
        <div className="cable-options">
          <label><span>Path</span><div className="cable-path-options">
            <button className={cablePathStyle === 'straight' ? 'is-selected' : ''} onClick={() => onCablePathStyleChange('straight')} title="Straight line"><Minus size={15} /><span>Straight</span></button>
            <button className={cablePathStyle === 'curved' ? 'is-selected' : ''} onClick={() => onCablePathStyleChange('curved')} title="Curved line"><Spline size={15} /><span>Curved</span></button>
            <button className={cablePathStyle === 'orthogonal' ? 'is-selected' : ''} onClick={() => onCablePathStyleChange('orthogonal')} title="90 degree turns"><CornerDownRight size={15} /><span>90°</span></button>
          </div></label>
          <label><span>Color</span><div className="cable-color-options">
            {CABLE_COLORS.map((color) => <button key={color} className={cableColor.toLowerCase() === color.toLowerCase() ? 'is-selected' : ''} style={{ backgroundColor: color }} onClick={() => onCableColorChange(color)} title={color} aria-label={`Use cable color ${color}`} />)}
            <span className="cable-custom-color"><input type="color" value={cableColor} onChange={(event) => onCableColorChange(event.target.value)} title="Custom cable color" /></span>
          </div></label>
          <div className="cable-option-grid">
            <label><span>Count</span><LinkCountInput value={cableCount} onChange={onCableCountChange} /></label>
            <label><span>Speed</span><select value={cableSpeed} onChange={(event) => onCableSpeedChange(event.target.value as LinkSpeed)}>{LINK_SPEEDS.map((speed) => <option key={speed}>{speed}</option>)}</select></label>
            <label><span>Purpose</span><select value={cablePurpose} onChange={(event) => onCablePurposeChange(event.target.value as LinkPurpose)}>{LINK_PURPOSES.map((purpose) => <option key={purpose}>{purpose}</option>)}</select></label>
          </div>
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
