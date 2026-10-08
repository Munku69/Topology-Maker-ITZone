import { Cable, ChevronDown, Network, PanelRightClose, Plus, Trash2, Type, X } from 'lucide-react'
import { DEVICE_PRESETS } from '../constants/devices'
import { CABLE_PRESETS } from '../constants/cables'
import type { CableType, DeviceData, DeviceInterface, DeviceType, TopologyEdge, TopologyNode } from '../types/topology'

interface PropertiesPanelProps {
  selectedNode: TopologyNode | null
  selectedEdge: TopologyEdge | null
  nodes: TopologyNode[]
  collapsed: boolean
  onToggle: () => void
  onUpdateNode: (id: string, patch: Partial<DeviceData>, type?: DeviceType) => void
  onUpdateEdge: (id: string, patch: Partial<NonNullable<TopologyEdge['data']>>) => void
  onDelete: () => void
  onCloseSelection: () => void
  onAddInterface: (nodeId: string) => void
  onUpdateInterface: (nodeId: string, interfaceId: string, patch: Partial<DeviceInterface>) => void
  onRemoveInterface: (nodeId: string, interfaceId: string) => void
  portSelection: boolean
  onResizeStart: (event: React.PointerEvent) => void
}

function Field({ label, value, onChange, placeholder, multiline = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean }) {
  return <label className="field"><span>{label}</span>{multiline
    ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} />
    : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}</label>
}

function PortField({ label, value, interfaces, onChange }: { label: string; value: string; interfaces: DeviceInterface[]; onChange: (value: string) => void }) {
  const valueExists = interfaces.some((item) => item.name === value)
  return <label className="field"><span>{label}</span><div className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">Unassigned</option>
    {value && !valueExists && <option value={value}>{value} (saved)</option>}
    {interfaces.map((item) => <option key={item.id} value={item.name}>{item.name || 'Unnamed interface'}{item.role ? ` · ${item.role}` : ''}{item.ip ? ` · ${item.ip}` : ''}</option>)}
  </select><ChevronDown size={15} /></div></label>
}

export function PropertiesPanel(props: PropertiesPanelProps) {
  if (props.collapsed) return null
  const { selectedNode, selectedEdge } = props
  const isTextBox = selectedNode?.data.deviceType === 'text-box'
  const source = selectedEdge ? props.nodes.find((n) => n.id === selectedEdge.source) : undefined
  const target = selectedEdge ? props.nodes.find((n) => n.id === selectedEdge.target) : undefined
  return (
    <aside className="sidebar properties-panel" aria-label="Properties panel">
      <div className="panel-resizer panel-resizer--properties" role="separator" aria-orientation="vertical" aria-label="Resize properties panel" onPointerDown={props.onResizeStart} />
      <div className="panel-heading">
        <div><p className="eyebrow">Inspector</p><h2>Properties</h2></div>
        <button className="icon-button" onClick={props.onToggle} title="Collapse properties"><PanelRightClose size={17} /></button>
      </div>

      {!selectedNode && !selectedEdge && (
        <div className="no-selection"><Network size={30} /><h3>Nothing selected</h3><p>Select a device or connection to edit its details.</p></div>
      )}

      {selectedNode && (
        <div className="inspector-scroll">
          <div className="selection-header">
            {isTextBox
              ? <span className="selection-icon"><Type size={19} /></span>
              : <span className="selection-icon device-art" style={{ color: DEVICE_PRESETS[selectedNode.data.deviceType].accent }}><img src={DEVICE_PRESETS[selectedNode.data.deviceType].iconPath} alt="" /></span>}
            <div><strong>{selectedNode.data.name || (isTextBox ? 'Note' : 'Unnamed device')}</strong><small>{isTextBox ? 'Canvas annotation' : DEVICE_PRESETS[selectedNode.data.deviceType].label}</small></div>
            <button className="icon-button" onClick={props.onCloseSelection} title="Clear selection"><X size={16} /></button>
          </div>
          {isTextBox ? <section className="property-section">
            <h3>Text box</h3>
            <Field label="Title" value={selectedNode.data.name} onChange={(name) => props.onUpdateNode(selectedNode.id, { name })} placeholder="e.g. Internet edge" />
            <Field label="Text" value={selectedNode.data.description} onChange={(description) => props.onUpdateNode(selectedNode.id, { description })} placeholder="Add documentation to the canvas" multiline />
          </section> : <>
            <section className="property-section">
              <h3>Device details</h3>
              <Field label="Device name" value={selectedNode.data.name} onChange={(name) => props.onUpdateNode(selectedNode.id, { name })} placeholder="e.g. FGT-HQ" />
              <label className="field"><span>Device type</span><div className="select-wrap"><select value={selectedNode.data.deviceType} onChange={(e) => props.onUpdateNode(selectedNode.id, { deviceType: e.target.value as DeviceType }, e.target.value as DeviceType)}>{(Object.keys(DEVICE_PRESETS) as DeviceType[]).filter((type) => type !== 'text-box').map((type) => <option key={type} value={type}>{DEVICE_PRESETS[type].label}</option>)}</select><ChevronDown size={15} /></div></label>
              <Field label="Hostname" value={selectedNode.data.hostname} onChange={(hostname) => props.onUpdateNode(selectedNode.id, { hostname })} placeholder="e.g. FGT-HQ" />
              <Field label="Management IP" value={selectedNode.data.managementIp} onChange={(managementIp) => props.onUpdateNode(selectedNode.id, { managementIp })} placeholder="192.168.1.99/24" />
              <Field label="Subnet mask / CIDR" value={selectedNode.data.subnet} onChange={(subnet) => props.onUpdateNode(selectedNode.id, { subnet })} placeholder="255.255.255.0 or /24" />
              <Field label="Description" value={selectedNode.data.description} onChange={(description) => props.onUpdateNode(selectedNode.id, { description })} placeholder="Purpose or location" multiline />
            </section>
            <section className="property-section interfaces-section">
            <div className="section-title"><div><h3>Interfaces</h3><span>{selectedNode.data.interfaces.length} configured</span></div><button className="button button--small" onClick={() => props.onAddInterface(selectedNode.id)}><Plus size={15} /> Add</button></div>
            {selectedNode.data.interfaces.length === 0 && <p className="empty-note">No interfaces configured.</p>}
            {selectedNode.data.interfaces.map((item, index) => (
              <div className="interface-card" key={item.id}>
                <div className="interface-card__title"><span>Interface {index + 1}</span><button onClick={() => props.onRemoveInterface(selectedNode.id, item.id)} title="Remove interface"><Trash2 size={15} /></button></div>
                <div className="two-col"><Field label="Name" value={item.name} onChange={(name) => props.onUpdateInterface(selectedNode.id, item.id, { name })} placeholder="port1" /><Field label="Role" value={item.role} onChange={(role) => props.onUpdateInterface(selectedNode.id, item.id, { role })} placeholder="LAN" /></div>
                <Field label="IP / CIDR" value={item.ip} onChange={(ip) => props.onUpdateInterface(selectedNode.id, item.id, { ip })} placeholder="192.168.1.1/24" />
                <Field label="VLAN ID" value={item.vlan} onChange={(vlan) => props.onUpdateInterface(selectedNode.id, item.id, { vlan })} placeholder="10" />
                <Field label="Description" value={item.description} onChange={(description) => props.onUpdateInterface(selectedNode.id, item.id, { description })} placeholder="Uplink to core" />
              </div>
            ))}
            </section>
          </>}
          <button className="danger-button" onClick={props.onDelete}><Trash2 size={16} /> Delete {isTextBox ? 'text box' : 'device'}</button>
        </div>
      )}

      {selectedEdge && (
        <div className="inspector-scroll">
          <div className="selection-header"><span className="selection-icon"><Cable size={19} /></span><div><strong>Connection</strong><small>{source?.data.name ?? 'Source'} → {target?.data.name ?? 'Target'}</small></div><button className="icon-button" onClick={props.onCloseSelection}><X size={16} /></button></div>
          <section className="property-section">
            <h3>Connection details</h3>
            <label className="field"><span>Cable type</span><div className="select-wrap"><select value={selectedEdge.data?.cableType ?? 'copper-straight'} onChange={(event) => props.onUpdateEdge(selectedEdge.id, { cableType: event.target.value as CableType })}>{(Object.keys(CABLE_PRESETS) as CableType[]).map((type) => <option key={type} value={type}>{CABLE_PRESETS[type].label}</option>)}</select><ChevronDown size={15} /></div></label>
            {props.portSelection ? <>
              <PortField label={`Source interface · ${source?.data.name ?? ''}`} value={selectedEdge.data?.sourceInterface ?? ''} interfaces={source?.data.interfaces ?? []} onChange={(sourceInterface) => props.onUpdateEdge(selectedEdge.id, { sourceInterface })} />
              <PortField label={`Destination interface · ${target?.data.name ?? ''}`} value={selectedEdge.data?.targetInterface ?? ''} interfaces={target?.data.interfaces ?? []} onChange={(targetInterface) => props.onUpdateEdge(selectedEdge.id, { targetInterface })} />
            </> : <p className="feature-disabled-note">Port assignment is off. Enable <strong>Choose ports</strong> in Features to edit endpoint ports.</p>}
            <Field label="Description (documentation only)" value={selectedEdge.data?.description ?? ''} onChange={(description) => props.onUpdateEdge(selectedEdge.id, { description })} placeholder="Primary uplink" multiline />
            <p className="feature-disabled-note">Cable descriptions are saved but not drawn over the cable. Use the Text box tool for visible canvas notes.</p>
          </section>
          <p className="feature-disabled-note">Drag either highlighted cable endpoint on the canvas to move it along a device outline.</p>
          <div className="connection-summary"><span className="dot" /><span>{source?.data.name ?? 'Source'}</span><span className="line" /><span>{target?.data.name ?? 'Target'}</span></div>
          <button className="danger-button" onClick={props.onDelete}><Trash2 size={16} /> Delete connection</button>
        </div>
      )}
    </aside>
  )
}
