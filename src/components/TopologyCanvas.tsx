import { forwardRef, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Background, BackgroundVariant, ConnectionMode, Controls, MiniMap, ReactFlow,
  type Connection, type EdgeChange, type EdgeTypes, type NodeChange, type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { DeviceNode } from './nodes/DeviceNode'
import { DEVICE_PRESETS } from '../constants/devices'
import { DEVICE_TYPES, type DeviceType, type TopologyEdge, type TopologyNode } from '../types/topology'
import { ParallelCableEdge } from './edges/ParallelCableEdge'
import { nearestOutlineHandle } from '../constants/attachments'

const nodeTypes = Object.fromEntries(DEVICE_TYPES.map((type) => [type, DeviceNode])) as NodeTypes
const edgeTypes = { parallelCable: ParallelCableEdge } satisfies EdgeTypes

interface TopologyCanvasProps {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  onNodesChange: (changes: NodeChange<TopologyNode>[]) => void
  onEdgesChange: (changes: EdgeChange<TopologyEdge>[]) => void
  onDropDevice: (type: DeviceType, point: { x: number; y: number }) => void
  onInit: (instance: ReactFlowInstance<TopologyNode, TopologyEdge>) => void
  onSelectionChange: (node: TopologyNode | null, edge: TopologyEdge | null) => void
  onNodeClick: (node: TopologyNode, handleId: string) => void
  onEdgeClick: (edge: TopologyEdge) => void
  onReconnect: (edge: TopologyEdge, connection: Connection) => void
  cableMode: boolean
  deleteMode: boolean
  cableSourceNodeId: string | null
  cableStatus: string | null
  showCables: boolean
  portSelection: boolean
  showDeviceLabels: boolean
}

export const TopologyCanvas = forwardRef<HTMLDivElement, TopologyCanvasProps>(function TopologyCanvas(props, ref) {
  const renderedNodes = useMemo(() => props.nodes.map((node) => ({
    ...node,
    className: [node.className, node.id === props.cableSourceNodeId ? 'is-cable-source' : ''].filter(Boolean).join(' '),
  })), [props.cableSourceNodeId, props.nodes])

  const renderedEdges = useMemo(() => {
    const groups = new Map<string, TopologyEdge[]>()
    props.edges.forEach((edge) => {
      const key = [edge.source, edge.target].sort().join('::')
      groups.set(key, [...(groups.get(key) ?? []), edge])
    })

    return props.edges.map((edge) => {
      const key = [edge.source, edge.target].sort().join('::')
      const group = groups.get(key) ?? [edge]
      const index = group.findIndex((item) => item.id === edge.id)
      const centeredIndex = index - (group.length - 1) / 2
      const direction = edge.source.localeCompare(edge.target) <= 0 ? 1 : -1
      const data = edge.data ?? { cableType: 'copper-straight', sourceInterface: '', targetInterface: '', description: '' }
      const description = data.description.trim()
      const interfaceLabel = [data.sourceInterface, data.targetInterface].filter(Boolean).join(' ↔ ')
      const label = [props.portSelection ? interfaceLabel : '', description].filter(Boolean).join(' — ')
      return {
        ...edge,
        type: 'parallelCable',
        label,
        data: { ...data, parallelOffset: centeredIndex * 34 * direction },
      }
    })
  }, [props.edges, props.portSelection])

  return (
    <main className={`canvas-shell ${props.cableMode ? 'cable-mode' : ''} ${props.deleteMode ? 'delete-mode' : ''} ${props.showCables ? '' : 'cables-hidden'} ${props.showDeviceLabels ? '' : 'labels-hidden'}`} ref={ref}>
      {props.nodes.length === 0 && <div className="empty-canvas"><span className="empty-canvas__glyph">+</span><h2>Build your network</h2><p>Drag a device here to start building your topology.</p></div>}
      <ReactFlow<TopologyNode, TopologyEdge>
        nodes={renderedNodes}
        edges={renderedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={props.onNodesChange}
        onEdgesChange={props.onEdgesChange}
        onInit={props.onInit}
        onNodeClick={(event, node) => {
          const element = (event.target as Element).closest('.react-flow__node') as HTMLElement | null
          if (!element) return
          const visual = element.querySelector<HTMLElement>('.device-node__visual')
          const bounds = (visual ?? element).getBoundingClientRect()
          props.onNodeClick(node, nearestOutlineHandle((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height))
        }}
        onEdgeClick={(event, edge) => { event.stopPropagation(); props.onEdgeClick(edge) }}
        onReconnect={props.onReconnect}
        onSelectionChange={({ nodes, edges }) => props.onSelectionChange(nodes[0] ?? null, edges[0] ?? null)}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
        onDrop={(event) => {
          event.preventDefault()
          const type = event.dataTransfer.getData('application/reactflow') as DeviceType
          if (!type) return
          props.onDropDevice(type, { x: event.clientX, y: event.clientY })
        }}
        defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#5990ad', strokeWidth: 2 }, labelStyle: { fill: '#9fb7c8', fontSize: 11, fontWeight: 600 }, labelBgStyle: { fill: '#0b1726', fillOpacity: 0.9 }, labelBgPadding: [5, 3], labelBgBorderRadius: 4 }}
        nodesConnectable
        edgesReconnectable
        reconnectRadius={24}
        connectionMode={ConnectionMode.Loose}
        nodesDraggable={!props.cableMode && !props.deleteMode}
        deleteKeyCode={['Backspace', 'Delete']}
        minZoom={0.15}
        maxZoom={2.5}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        selectionOnDrag
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#294056" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap position="bottom-right" pannable zoomable nodeStrokeWidth={3} style={{ width: 160, height: 105 }} maskColor="rgba(3, 9, 17, .68)" nodeColor={(node) => DEVICE_PRESETS[(node.type ?? 'router') as DeviceType]?.accent ?? '#0d6efd'} />
        <div className="canvas-badge">CANVAS · {props.nodes.length} DEVICE{props.nodes.length === 1 ? '' : 'S'} · {props.edges.length} LINK{props.edges.length === 1 ? '' : 'S'}{props.showCables ? '' : ' · HIDDEN'}</div>
        {props.cableStatus && <div className="cable-mode-badge"><span />{props.cableStatus}<kbd>ESC</kbd></div>}
        {props.deleteMode && <div className="delete-mode-badge"><Trash2 size={14} />Click a device or cable to remove it<kbd>ESC</kbd></div>}
      </ReactFlow>
    </main>
  )
})
