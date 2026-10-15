import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { Cable, ChevronDown, ClipboardPaste, Copy, LayoutGrid, Maximize2, SquareDashed, Trash2, Type } from 'lucide-react'
import {
  Background, BackgroundVariant, ConnectionMode, Controls, MiniMap, ReactFlow,
  type Connection, type EdgeChange, type EdgeTypes, type NodeChange, type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { DeviceNode } from './nodes/DeviceNode'
import { ZoneNode } from './nodes/ZoneNode'
import { DEVICE_PRESETS } from '../constants/devices'
import { CABLE_PRESETS } from '../constants/cables'
import { DEVICE_TYPES, type DeviceType, type TopologyEdge, type TopologyNode, type ZoneToolOptions } from '../types/topology'
import { ParallelCableEdge } from './edges/ParallelCableEdge'
import { nearestOutlineHandle } from '../constants/attachments'

const nodeTypes = Object.fromEntries(DEVICE_TYPES.map((type) => [type, type === 'zone' ? ZoneNode : DeviceNode])) as NodeTypes
const edgeTypes = { parallelCable: ParallelCableEdge } satisfies EdgeTypes

interface TopologyCanvasProps {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  onNodesChange: (changes: NodeChange<TopologyNode>[]) => void
  onEdgesChange: (changes: EdgeChange<TopologyEdge>[]) => void
  onDropDevice: (type: DeviceType, point: { x: number; y: number }) => void
  onInit: (instance: ReactFlowInstance<TopologyNode, TopologyEdge>) => void
  onZoomChange: (zoom: number) => void
  onSelectionChange: (node: TopologyNode | null, edge: TopologyEdge | null) => void
  onNodeClick: (node: TopologyNode, handleId: string) => void
  onEdgeClick: (edge: TopologyEdge) => void
  onReconnect: (edge: TopologyEdge, connection: Connection) => void
  cableMode: boolean
  deleteMode: boolean
  textToolMode: boolean
  zoneToolMode: boolean
  zoneOptions: ZoneToolOptions
  cableSourceNodeId: string | null
  cableStatus: string | null
  showCables: boolean
  portSelection: boolean
  showDeviceLabels: boolean
  onAddTextBox: (point: { x: number; y: number }) => void
  onDrawZone: (start: { x: number; y: number }, end: { x: number; y: number }) => void
  onContextAction: (action: CanvasContextAction, target?: TopologyNode | TopologyEdge) => void
  hasClipboard: boolean
}

export type CanvasContextAction = 'copy' | 'duplicate' | 'delete' | 'zone' | 'paste' | 'arrange' | 'fit'
type CanvasContextMenu = { kind: 'node'; x: number; y: number; target: TopologyNode } | { kind: 'edge'; x: number; y: number; target: TopologyEdge } | { kind: 'pane'; x: number; y: number }
type CanvasContextRequest = { kind: 'node'; target: TopologyNode } | { kind: 'edge'; target: TopologyEdge } | { kind: 'pane' }

interface DrawPoint { x: number; y: number; clientX: number; clientY: number }

export const TopologyCanvas = forwardRef<HTMLDivElement, TopologyCanvasProps>(function TopologyCanvas(props, ref) {
  const [zoneDrag, setZoneDrag] = useState<{ start: DrawPoint; current: DrawPoint } | null>(null)
  const [legendPinned, setLegendPinned] = useState(false)
  const [legendHovered, setLegendHovered] = useState(false)
  const cursorBadgeRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<CanvasContextMenu | null>(null)
  const activeTool = props.deleteMode ? 'Delete' : props.textToolMode ? 'Place text' : props.zoneToolMode ? 'Draw zone' : props.cableMode ? 'Connect' : null

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const closeWithEscape = (event: KeyboardEvent) => event.key === 'Escape' && close()
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', closeWithEscape)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', closeWithEscape)
      window.removeEventListener('blur', close)
    }
  }, [contextMenu])

  const openContextMenu = (event: { clientX: number; clientY: number; preventDefault: () => void; stopPropagation: () => void }, menu: CanvasContextRequest) => {
    event.preventDefault()
    event.stopPropagation()
    const width = menu.kind === 'node' ? 218 : 198
    const height = menu.kind === 'node' ? 176 : menu.kind === 'edge' ? 50 : 132
    setContextMenu({ ...menu, x: Math.min(event.clientX, window.innerWidth - width - 8), y: Math.min(event.clientY, window.innerHeight - height - 8) } as CanvasContextMenu)
  }

  const runContextAction = (action: CanvasContextAction) => {
    if (!contextMenu) return
    props.onContextAction(action, contextMenu.kind === 'pane' ? undefined : contextMenu.target)
    setContextMenu(null)
  }
  const renderedNodes = useMemo(() => [...props.nodes].sort((a, b) => (a.data.deviceType === 'zone' ? -1 : 0) - (b.data.deviceType === 'zone' ? -1 : 0)).map((node) => ({
    ...node,
    zIndex: node.data.deviceType === 'zone' ? 0 : 2,
    className: [node.className, node.id === props.cableSourceNodeId ? 'is-cable-source' : ''].filter(Boolean).join(' '),
  })), [props.cableSourceNodeId, props.nodes])

  const renderedEdges = useMemo(() => {
    const endpointGroups = new Map<string, string[]>()
    const routeGroups = new Map<string, string[]>()
    const speedGroups = new Map<string, string[]>()
    const nodeById = new Map(props.nodes.map((node) => [node.id, node]))
    const speedGroupKey = (edge: TopologyEdge): string => {
      const pair = [edge.source, edge.target].sort().join('::')
      return `${pair}::${edge.data?.speed ?? 'Auto'}::${edge.data?.purpose ?? 'Data'}::${edge.data?.cableType ?? 'copper-straight'}::${edge.data?.color ?? '#38bdf8'}`
    }
    const compactSpeed = (speed: string): string => speed === 'Auto' ? '' : speed.replace(' Mbps', 'M').replace(' Gbps', 'G')
    const isHorizontalHandle = (handleId: string | null | undefined): boolean => {
      const handle = handleId ?? 'right'
      return handle.includes('left') || handle.includes('right')
    }
    const routeGroupKey = (edge: TopologyEdge): string => {
      const sourceNode = nodeById.get(edge.source)
      const targetNode = nodeById.get(edge.target)
      const horizontal = isHorizontalHandle(edge.sourceHandle)
      const sourceCenter = horizontal
        ? (sourceNode?.position.x ?? 0) + (sourceNode?.width ?? 112) / 2
        : (sourceNode?.position.y ?? 0) + (sourceNode?.height ?? 112) / 2
      const targetCenter = horizontal
        ? (targetNode?.position.x ?? 0) + (targetNode?.width ?? 112) / 2
        : (targetNode?.position.y ?? 0) + (targetNode?.height ?? 112) / 2
      const corridor = (sourceCenter + targetCenter) / 2
      return `${horizontal ? 'x' : 'y'}:${Math.round(corridor / 24)}`
    }
    props.edges.forEach((edge) => {
      const sourceKey = `${edge.source}::${edge.sourceHandle ?? 'right'}`
      const targetKey = `${edge.target}::${edge.targetHandle ?? 'left'}`
      const routeKey = routeGroupKey(edge)
      endpointGroups.set(sourceKey, [...(endpointGroups.get(sourceKey) ?? []), `${edge.id}:source`])
      endpointGroups.set(targetKey, [...(endpointGroups.get(targetKey) ?? []), `${edge.id}:target`])
      routeGroups.set(routeKey, [...(routeGroups.get(routeKey) ?? []), edge.id])
      if ((edge.data?.speed ?? 'Auto') !== 'Auto') {
        const groupKey = speedGroupKey(edge)
        speedGroups.set(groupKey, [...(speedGroups.get(groupKey) ?? []), edge.id])
      }
    })

    const endpointLaneOffset = (key: string, token: string): number => {
      const endpointEdges = endpointGroups.get(key) ?? [token]
      const index = endpointEdges.indexOf(token)
      const spacing = Math.min(10, 64 / Math.max(1, endpointEdges.length - 1))
      return (index - (endpointEdges.length - 1) / 2) * spacing
    }

    return props.edges.map((edge) => {
      const sourceKey = `${edge.source}::${edge.sourceHandle ?? 'right'}`
      const targetKey = `${edge.target}::${edge.targetHandle ?? 'left'}`
      const routeGroup = routeGroups.get(routeGroupKey(edge)) ?? [edge.id]
      const routeIndex = routeGroup.indexOf(edge.id)
      const centeredRouteIndex = routeIndex - (routeGroup.length - 1) / 2
      const data = edge.data ?? { cableType: 'copper-straight', color: '#38bdf8', speed: 'Auto', purpose: 'Data', showCableType: true, pathStyle: 'orthogonal', sourceInterface: '', targetInterface: '', description: '' }
      const interfaceLabel = [data.sourceInterface, data.targetInterface].filter(Boolean).join(' ↔ ')
      const speedGroup = data.speed === 'Auto' ? [] : speedGroups.get(speedGroupKey(edge)) ?? [edge.id]
      const showSpeedLabel = speedGroup[0] === edge.id
      const speedLabel = showSpeedLabel ? `${speedGroup.length > 1 ? `${speedGroup.length} x ` : ''}${compactSpeed(data.speed)}` : ''
      const label = [speedLabel, props.portSelection ? interfaceLabel : ''].filter(Boolean).join('  ·  ')
      return {
        ...edge,
        type: 'parallelCable',
        zIndex: 1,
        label,
        data: {
          ...data,
          parallelOffset: centeredRouteIndex * 10,
          routingLaneIndex: routeIndex,
          sourceLaneOffset: endpointLaneOffset(sourceKey, `${edge.id}:source`),
          targetLaneOffset: endpointLaneOffset(targetKey, `${edge.id}:target`),
        },
      }
    })
  }, [props.edges, props.nodes, props.portSelection])

  const cableLegend = useMemo(() => {
    const entries = new Map<string, { color: string; dash?: string; width: number; label: string }>()
    props.edges.forEach((edge) => {
      const cableType = edge.data?.cableType ?? 'copper-straight'
      const preset = CABLE_PRESETS[cableType]
      const color = edge.data?.color ?? preset.color
      const configuredSpeed = edge.data?.speed ?? 'Auto'
      const label = configuredSpeed === 'Auto'
        ? 'Auto'
        : configuredSpeed.replace(' Mbps', 'M').replace(' Gbps', 'G')
      const key = `${color}|${preset.dash ?? ''}|${label}`
      if (!entries.has(key)) entries.set(key, { color, dash: preset.dash, width: cableType === 'fiber' ? 3 : 2.25, label })
    })
    return [...entries.values()]
  }, [props.edges])

  return (
    <main className={`canvas-shell ${props.cableMode ? 'cable-mode' : ''} ${props.deleteMode ? 'delete-mode' : ''} ${props.textToolMode ? 'text-mode' : ''} ${props.zoneToolMode ? 'zone-mode' : ''} ${props.showCables ? '' : 'cables-hidden'} ${props.showDeviceLabels ? '' : 'labels-hidden'} ${props.portSelection ? 'port-selection-enabled' : ''}`} ref={ref} onPointerMove={(event) => {
      if (!activeTool || !cursorBadgeRef.current) return
      cursorBadgeRef.current.style.visibility = 'visible'
      cursorBadgeRef.current.style.transform = `translate3d(${event.clientX + 15}px, ${event.clientY + 17}px, 0)`
    }} onPointerLeave={() => { if (cursorBadgeRef.current) cursorBadgeRef.current.style.visibility = 'hidden' }}>
      {props.nodes.length === 0 && <div className="empty-canvas"><span className="empty-canvas__glyph">+</span><h2>Build your network</h2><p>Drag a device here to start building your topology.</p></div>}
      <ReactFlow<TopologyNode, TopologyEdge>
        nodes={renderedNodes}
        edges={renderedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={props.onNodesChange}
        onEdgesChange={props.onEdgesChange}
        onInit={props.onInit}
        onMove={(_, viewport) => props.onZoomChange(viewport.zoom)}
        onNodeClick={(event, node) => {
          const element = (event.target as Element).closest('.react-flow__node') as HTMLElement | null
          if (!element) return
          const visual = element.querySelector<HTMLElement>('.device-node__visual')
          const bounds = (visual ?? element).getBoundingClientRect()
          props.onNodeClick(node, nearestOutlineHandle((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height))
        }}
        onEdgeClick={(event, edge) => { event.stopPropagation(); props.onEdgeClick(edge) }}
        onNodeContextMenu={(event, node) => openContextMenu(event, { kind: 'node', target: node })}
        onEdgeContextMenu={(event, edge) => openContextMenu(event, { kind: 'edge', target: edge })}
        onPaneContextMenu={(event) => openContextMenu(event, { kind: 'pane' })}
        onReconnect={props.onReconnect}
        onSelectionChange={({ nodes, edges }) => props.onSelectionChange(nodes[0] ?? null, edges[0] ?? null)}
        onPaneClick={(event) => { setContextMenu(null); if (props.textToolMode) props.onAddTextBox({ x: event.clientX, y: event.clientY }) }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
        onDrop={(event) => {
          event.preventDefault()
          const type = event.dataTransfer.getData('application/reactflow') as DeviceType
          if (!type) return
          props.onDropDevice(type, { x: event.clientX, y: event.clientY })
        }}
        defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#5990ad', strokeWidth: 2 }, labelStyle: { fill: 'var(--edge-label-text)', fontSize: 11, fontWeight: 700 }, labelBgStyle: { fill: 'var(--edge-label-bg)', fillOpacity: 0.96, stroke: 'var(--edge-label-border)', strokeWidth: 0.75 }, labelBgPadding: [5, 3], labelBgBorderRadius: 4 }}
        nodesConnectable
        edgesReconnectable
        reconnectRadius={24}
        connectionMode={ConnectionMode.Loose}
        nodesDraggable={!props.cableMode && !props.deleteMode && !props.zoneToolMode}
        deleteKeyCode={['Backspace', 'Delete']}
        minZoom={0.15}
        maxZoom={2.5}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        selectionOnDrag
        elevateNodesOnSelect={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#294056" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap<TopologyNode> position="bottom-right" pannable zoomable nodeStrokeWidth={3} style={{ width: 160, height: 105 }} maskColor="rgba(3, 9, 17, .68)" nodeColor={(node) => node.data.deviceType === 'zone' ? node.data.zoneColor ?? '#ef4444' : DEVICE_PRESETS[(node.type ?? 'router') as DeviceType]?.accent ?? '#0d6efd'} />
        <div className="canvas-badge">CANVAS · {props.nodes.filter((node) => node.data.deviceType !== 'text-box' && node.data.deviceType !== 'zone').length} DEVICES · {props.edges.length} LINK{props.edges.length === 1 ? '' : 'S'}{props.showCables ? '' : ' · HIDDEN'}</div>
        <aside className={`topology-legend ${legendPinned || legendHovered ? 'is-expanded' : ''} ${legendPinned ? 'is-pinned' : ''}`} aria-label="Connection legend" onMouseEnter={() => setLegendHovered(true)} onMouseLeave={() => setLegendHovered(false)}>
          <button className="topology-legend__heading" onClick={() => setLegendPinned((current) => !current)} aria-expanded={legendPinned || legendHovered} title={legendPinned ? 'Collapse connection legend' : 'Open and pin connection legend'}><strong>LEGEND</strong><span>{cableLegend.length} STYLE{cableLegend.length === 1 ? '' : 'S'}</span><ChevronDown size={13} /></button>
          {(legendPinned || legendHovered) && (cableLegend.length ? <div className="topology-legend__items">{cableLegend.map((item) => (
            <div className="topology-legend__item" key={`${item.color}-${item.dash ?? 'solid'}-${item.label}`}>
              <i style={{ '--legend-color': item.color, '--legend-width': `${item.width}px`, '--legend-dash': item.dash ? 'dashed' : 'solid' } as React.CSSProperties} />
              <span>{item.label}</span>
            </div>
          ))}</div> : <p>No cables yet</p>)}
        </aside>
        {props.cableStatus && <div className="cable-mode-badge"><span />{props.cableStatus}<kbd>ESC</kbd></div>}
        {props.deleteMode && <div className="delete-mode-badge"><Trash2 size={14} />Click a device or cable to remove it<kbd>ESC</kbd></div>}
        {props.textToolMode && <div className="text-mode-badge"><Type size={14} />Click the canvas to place a text box<kbd>ESC</kbd></div>}
        {props.zoneToolMode && <div className="zone-mode-badge"><SquareDashed size={14} />Drag on the canvas to draw a zone<kbd>ESC</kbd></div>}
      </ReactFlow>
      {activeTool && <div ref={cursorBadgeRef} className={`active-tool-cursor active-tool-cursor--${props.deleteMode ? 'delete' : props.textToolMode ? 'text' : props.zoneToolMode ? 'zone' : 'cable'}`}>
        {props.deleteMode ? <Trash2 size={13} /> : props.textToolMode ? <Type size={13} /> : props.zoneToolMode ? <SquareDashed size={13} /> : <Cable size={13} />}
        <span>{activeTool}</span>
      </div>}
      {contextMenu && <div className="canvas-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onPointerDown={(event) => event.stopPropagation()} role="menu">
        {contextMenu.kind === 'node' && <>
          <button onClick={() => runContextAction('copy')} role="menuitem"><Copy size={15} /><span>Copy selection</span><kbd>Ctrl+C</kbd></button>
          <button onClick={() => runContextAction('duplicate')} role="menuitem"><ClipboardPaste size={15} /><span>Duplicate</span></button>
          {contextMenu.target.data.deviceType !== 'zone' && contextMenu.target.data.deviceType !== 'text-box' && <button onClick={() => runContextAction('zone')} role="menuitem"><SquareDashed size={15} /><span>Create zone around</span></button>}
          <div className="canvas-context-menu__divider" />
          <button className="is-danger" onClick={() => runContextAction('delete')} role="menuitem"><Trash2 size={15} /><span>Delete</span><kbd>Del</kbd></button>
        </>}
        {contextMenu.kind === 'edge' && <button className="is-danger" onClick={() => runContextAction('delete')} role="menuitem"><Trash2 size={15} /><span>Delete connection</span><kbd>Del</kbd></button>}
        {contextMenu.kind === 'pane' && <>
          <button onClick={() => runContextAction('paste')} disabled={!props.hasClipboard} role="menuitem"><ClipboardPaste size={15} /><span>Paste</span><kbd>Ctrl+V</kbd></button>
          <button onClick={() => runContextAction('arrange')} role="menuitem"><LayoutGrid size={15} /><span>Arrange topology</span></button>
          <button onClick={() => runContextAction('fit')} role="menuitem"><Maximize2 size={15} /><span>Fit and center</span><kbd>F</kbd></button>
        </>}
      </div>}
      {props.zoneToolMode && <div
        className="zone-draw-layer"
        onPointerDown={(event) => {
          if (event.button !== 0) return
          const bounds = event.currentTarget.getBoundingClientRect()
          const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, clientX: event.clientX, clientY: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
          setZoneDrag({ start: point, current: point })
        }}
        onPointerMove={(event) => {
          if (!zoneDrag) return
          const bounds = event.currentTarget.getBoundingClientRect()
          setZoneDrag({ ...zoneDrag, current: { x: event.clientX - bounds.left, y: event.clientY - bounds.top, clientX: event.clientX, clientY: event.clientY } })
        }}
        onPointerUp={(event) => {
          if (!zoneDrag) return
          event.currentTarget.releasePointerCapture(event.pointerId)
          const width = Math.abs(zoneDrag.current.x - zoneDrag.start.x)
          const height = Math.abs(zoneDrag.current.y - zoneDrag.start.y)
          if (width >= 40 && height >= 40) props.onDrawZone({ x: zoneDrag.start.clientX, y: zoneDrag.start.clientY }, { x: zoneDrag.current.clientX, y: zoneDrag.current.clientY })
          setZoneDrag(null)
        }}
        onPointerCancel={() => setZoneDrag(null)}
      >
        {zoneDrag && <div className="zone-draw-preview" style={{
          left: Math.min(zoneDrag.start.x, zoneDrag.current.x),
          top: Math.min(zoneDrag.start.y, zoneDrag.current.y),
          width: Math.abs(zoneDrag.current.x - zoneDrag.start.x),
          height: Math.abs(zoneDrag.current.y - zoneDrag.start.y),
          borderColor: props.zoneOptions.color,
          borderStyle: props.zoneOptions.lineStyle,
          '--zone-preview-color': props.zoneOptions.color,
        } as React.CSSProperties} />}
      </div>}
    </main>
  )
})
