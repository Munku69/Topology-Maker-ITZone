import { forwardRef } from 'react'
import {
  Background, BackgroundVariant, Controls, MiniMap, ReactFlow,
  type Connection, type EdgeChange, type NodeChange, type NodeTypes, type OnConnect,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { FirewallNode, PcNode, RouterNode, ServerNode, SwitchNode } from './nodes/DeviceNode'
import type { DeviceType, TopologyEdge, TopologyNode } from '../types/topology'

const nodeTypes: NodeTypes = { firewall: FirewallNode, router: RouterNode, switch: SwitchNode, pc: PcNode, server: ServerNode }

interface TopologyCanvasProps {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  onNodesChange: (changes: NodeChange<TopologyNode>[]) => void
  onEdgesChange: (changes: EdgeChange<TopologyEdge>[]) => void
  onConnect: OnConnect
  onDropDevice: (type: DeviceType, point: { x: number; y: number }) => void
  onInit: (instance: ReactFlowInstance<TopologyNode, TopologyEdge>) => void
  onSelectionChange: (node: TopologyNode | null, edge: TopologyEdge | null) => void
}

export const TopologyCanvas = forwardRef<HTMLDivElement, TopologyCanvasProps>(function TopologyCanvas(props, ref) {
  return (
    <main className="canvas-shell" ref={ref}>
      {props.nodes.length === 0 && <div className="empty-canvas"><span className="empty-canvas__glyph">+</span><h2>Build your network</h2><p>Drag a device here to start building your topology.</p></div>}
      <ReactFlow<TopologyNode, TopologyEdge>
        nodes={props.nodes}
        edges={props.edges}
        nodeTypes={nodeTypes}
        onNodesChange={props.onNodesChange}
        onEdgesChange={props.onEdgesChange}
        onConnect={props.onConnect}
        onInit={props.onInit}
        onSelectionChange={({ nodes, edges }) => props.onSelectionChange(nodes[0] ?? null, edges[0] ?? null)}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
        onDrop={(event) => {
          event.preventDefault()
          const type = event.dataTransfer.getData('application/reactflow') as DeviceType
          if (!type) return
          props.onDropDevice(type, { x: event.clientX, y: event.clientY })
        }}
        defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#5990ad', strokeWidth: 2 }, labelStyle: { fill: '#9fb7c8', fontSize: 11, fontWeight: 600 }, labelBgStyle: { fill: '#0b1726', fillOpacity: 0.9 }, labelBgPadding: [5, 3], labelBgBorderRadius: 4 }}
        connectionLineStyle={{ stroke: '#38bdf8', strokeWidth: 2 }}
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
        <MiniMap position="bottom-right" pannable zoomable nodeStrokeWidth={3} maskColor="rgba(3, 9, 17, .68)" nodeColor={(node) => ({ firewall: '#fb7185', router: '#60a5fa', switch: '#2dd4bf', pc: '#a78bfa', server: '#fbbf24' }[node.type ?? 'router'] ?? '#60a5fa')} />
        <div className="canvas-badge">CANVAS · {props.nodes.length} DEVICE{props.nodes.length === 1 ? '' : 'S'} · {props.edges.length} LINK{props.edges.length === 1 ? '' : 'S'}</div>
      </ReactFlow>
    </main>
  )
})

export type CanvasConnection = Connection
