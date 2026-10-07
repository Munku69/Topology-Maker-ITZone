import { memo, type ComponentType } from 'react'
import { Handle, Position, useStore, type NodeProps } from '@xyflow/react'
import { Flame, Network, Server, SquareTerminal, Waypoints } from 'lucide-react'
import { DEVICE_PRESETS } from '../../constants/devices'
import type { DeviceType, TopologyNode } from '../../types/topology'

const ICONS: Record<DeviceType, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  firewall: Flame,
  router: Waypoints,
  switch: Network,
  pc: SquareTerminal,
  server: Server,
}

function DeviceNodeView({ id, data, selected }: NodeProps<TopologyNode>) {
  const preset = DEVICE_PRESETS[data.deviceType]
  const Icon = ICONS[data.deviceType]
  const isConnected = useStore((state) => state.edges.some((edge) => edge.source === id || edge.target === id))
  return (
    <div className={`device-node ${selected ? 'is-selected' : ''}`} style={{ '--node-accent': preset.accent } as React.CSSProperties}>
      <Handle id="top" type="target" position={Position.Top} className="node-handle" />
      <Handle id="left" type="target" position={Position.Left} className="node-handle" />
      <Handle id="source-top" type="source" position={Position.Top} className="node-handle" />
      <Handle id="source-left" type="source" position={Position.Left} className="node-handle" />
      <div className="device-node__head">
        <span className="device-node__icon"><Icon size={19} strokeWidth={1.8} /></span>
        <span>{preset.label}</span>
        <span className="device-node__ports">{data.interfaces.length} PORT{data.interfaces.length === 1 ? '' : 'S'}</span>
        <span className={`device-node__status ${isConnected ? 'is-online' : 'is-offline'}`} title={isConnected ? 'Online · connected to the topology' : 'Offline · no cable connected'} aria-label={isConnected ? 'Online' : 'Offline'} />
      </div>
      <div className="device-node__name">{data.name || preset.defaultName}</div>
      <div className={`device-node__ip ${data.managementIp ? '' : 'is-empty'}`}>
        {data.managementIp || 'No management IP'}
      </div>
      <Handle id="right" type="source" position={Position.Right} className="node-handle" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="node-handle" />
      <Handle id="target-right" type="target" position={Position.Right} className="node-handle" />
      <Handle id="target-bottom" type="target" position={Position.Bottom} className="node-handle" />
    </div>
  )
}

export const FirewallNode = memo(DeviceNodeView)
export const RouterNode = memo(DeviceNodeView)
export const SwitchNode = memo(DeviceNodeView)
export const PcNode = memo(DeviceNodeView)
export const ServerNode = memo(DeviceNodeView)
