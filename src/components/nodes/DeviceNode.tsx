import { memo } from 'react'
import { Handle, Position, useStore, type NodeProps } from '@xyflow/react'
import { DEVICE_PRESETS } from '../../constants/devices'
import { OUTLINE_ATTACHMENTS } from '../../constants/attachments'
import type { DeviceType, TopologyNode } from '../../types/topology'

type IconBounds = readonly [left: number, top: number, right: number, bottom: number]

const ICON_BOUNDS: Partial<Record<DeviceType, IconBounds>> = {
  'access-point': [22.7, 9.8, 22.6, 9.7],
  'app-server': [18.4, 9.4, 18.7, 9.3],
  ciphertrust: [12.5, 9.8, 12.8, 9.3],
  'db-firewall': [14.5, 9.8, 14.7, 9.7],
  'db-server': [21.9, 9.4, 22.2, 9.3],
  'ddos-protection': [9.8, 9.4, 10.1, 9.3],
  dlp: [9.8, 10.2, 9.7, 10.4],
  'dns-server': [17.6, 9.8, 17.5, 9.7],
  edr: [9.8, 23, 9.7, 23.3],
  'file-server': [18.4, 9.4, 18.3, 9.7],
  firewall: [14.1, 9.8, 14, 10.1],
  iam: [9.4, 13.3, 9.3, 13.2],
  'ip-camera': [14.5, 23.8, 14.7, 23.7],
  'ip-phone': [10.9, 21.9, 10.8, 21],
  isp: [12.4, 16.9, 12.2, 12.8],
  'l2-switch': [8.1, 22.3, 8, 19],
  switch: [9.4, 10.2, 9.7, 10.1],
  laptop: [1.1, 20.6, 1, 18.3],
  'load-balancer': [13.7, 10.2, 13.2, 10.1],
  'log-management': [13.3, 9.8, 13.2, 9.7],
  'mail-server': [18.4, 9.4, 18.3, 9.3],
  mobile: [31.2, 19.5, 31.5, 19.4],
  'network-monitor': [10.9, 9.4, 10.8, 9.7],
  pam: [11.7, 9.8, 11.6, 9.7],
  pc: [10.9, 28.9, 10.8, 28.8],
  router: [14.8, 9.4, 15.1, 9.7],
  sandbox: [9.8, 10.2, 9.7, 10.1],
  server: [23, 9.4, 22.9, 9.3],
  siem: [9.8, 11.3, 9.7, 11.2],
  soar: [11.3, 10.2, 11.2, 10.1],
  'storage-server': [19.9, 9.4, 19.8, 9.7],
  ups: [18, 9.4, 17.9, 9.7],
  waf: [12.9, 10.5, 12.8, 10.4],
  'web-server': [17.6, 9.8, 17.5, 9.7],
  xdr: [9.8, 14.1, 9.7, 14],
}

function getIconLayout(type: DeviceType): React.CSSProperties {
  const [left, top, right, bottom] = ICON_BOUNDS[type] ?? [0, 0, 0, 0]
  const contentWidth = 100 - left - right
  const contentHeight = 100 - top - bottom
  const pixelsPerPercent = 112 / Math.max(contentWidth, contentHeight)
  return {
    '--node-width': `${contentWidth * pixelsPerPercent}px`,
    '--node-height': `${contentHeight * pixelsPerPercent}px`,
    '--icon-size': `${100 * pixelsPerPercent}px`,
    '--icon-left': `${-left * pixelsPerPercent}px`,
    '--icon-top': `${-top * pixelsPerPercent}px`,
  } as React.CSSProperties
}

function DeviceNodeView({ id, data, selected }: NodeProps<TopologyNode>) {
  const preset = DEVICE_PRESETS[data.deviceType]
  const isConnected = useStore((state) => state.edges.some((edge) => edge.source === id || edge.target === id))
  if (data.deviceType === 'text-box') {
    const backgroundStyle = data.textBackgroundStyle ?? 'filled'
    return (
      <div
        className={`text-box-node ${backgroundStyle === 'transparent' ? 'is-transparent' : 'has-background'} ${data.textColor ? 'has-custom-text' : ''} ${selected ? 'is-selected' : ''}`}
        style={{ '--text-box-background': data.textBackgroundColor ?? '#0ea5e9', '--text-box-text-color': data.textColor } as React.CSSProperties}
      >
        {data.name && <strong>{data.name}</strong>}
        {data.description && <p>{data.description}</p>}
      </div>
    )
  }
  const layout = getIconLayout(data.deviceType)
  return (
    <div className={`device-node ${selected ? 'is-selected' : ''}`} style={{ '--node-accent': preset.accent, ...layout } as React.CSSProperties}>
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
