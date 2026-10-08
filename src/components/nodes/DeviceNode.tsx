import { memo } from 'react'
import { Handle, Position, useStore, type NodeProps } from '@xyflow/react'
import { DEVICE_PRESETS } from '../../constants/devices'
import { OUTLINE_ATTACHMENTS } from '../../constants/attachments'
import type { TopologyNode } from '../../types/topology'

function DeviceNodeView({ id, data, selected }: NodeProps<TopologyNode>) {
  const preset = DEVICE_PRESETS[data.deviceType]
  const isConnected = useStore((state) => state.edges.some((edge) => edge.source === id || edge.target === id))
  return (
    <div className={`device-node ${selected ? 'is-selected' : ''}`} style={{ '--node-accent': preset.accent } as React.CSSProperties}>
      <div className="device-node__visual">
        {OUTLINE_ATTACHMENTS.map((attachment) => <Handle
          key={attachment.id}
          id={attachment.id}
          type="source"
          position={attachment.position}
          className="outline-handle"
          isConnectableStart={false}
          isConnectableEnd
          style={attachment.side === 'top' || attachment.side === 'bottom' ? { left: `${attachment.offset}%` } : { top: `${attachment.offset}%` }}
        />)}
        <Handle id="top" type="target" position={Position.Top} className="node-handle node-handle--legacy" />
        <Handle id="left" type="target" position={Position.Left} className="node-handle node-handle--legacy" />
        <Handle id="source-top" type="source" position={Position.Top} className="node-handle node-handle--legacy" />
        <Handle id="source-left" type="source" position={Position.Left} className="node-handle node-handle--legacy" />
        <span className="device-node__image device-art"><img src={preset.iconPath} alt={preset.label} draggable={false} /></span>
        <span className="device-node__ports">{data.interfaces.length} PORT{data.interfaces.length === 1 ? '' : 'S'}</span>
        <span className={`device-node__status ${isConnected ? 'is-online' : 'is-offline'}`} title={isConnected ? 'Online · connected to the topology' : 'Offline · no cable connected'} aria-label={isConnected ? 'Online' : 'Offline'} />
        <Handle id="right" type="source" position={Position.Right} className="node-handle node-handle--legacy" />
        <Handle id="bottom" type="source" position={Position.Bottom} className="node-handle node-handle--legacy" />
        <Handle id="target-right" type="target" position={Position.Right} className="node-handle node-handle--legacy" />
        <Handle id="target-bottom" type="target" position={Position.Bottom} className="node-handle node-handle--legacy" />
      </div>
      <div className="device-node__caption">
        <strong className="device-node__name">{data.name || preset.defaultName}</strong>
        <span className={`device-node__ip ${data.managementIp ? '' : 'is-empty'}`}>{data.managementIp || preset.label}</span>
      </div>
    </div>
  )
}

export const DeviceNode = memo(DeviceNodeView)
