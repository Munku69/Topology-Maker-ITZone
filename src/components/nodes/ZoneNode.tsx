import { memo } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import type { TopologyNode } from '../../types/topology'

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map((part) => `${part}${part}`).join('')
    : normalized.padEnd(6, '0').slice(0, 6)
  const parsed = Number.parseInt(value, 16)
  if (Number.isNaN(parsed)) return `rgba(239, 68, 68, ${alpha})`
  return `rgba(${(parsed >> 16) & 255}, ${(parsed >> 8) & 255}, ${parsed & 255}, ${alpha})`
}

function ZoneNodeView({ data, selected }: NodeProps<TopologyNode>) {
  const color = data.zoneColor ?? '#ef4444'
  const lineStyle = data.zoneLineStyle ?? 'dashed'

  return (
    <div
      className={`zone-node ${selected ? 'is-selected' : ''}`}
      style={{
        '--zone-color': color,
        '--zone-fill': hexToRgba(color, 0.035),
        borderStyle: lineStyle,
      } as React.CSSProperties}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={110}
        color={color}
        handleClassName="zone-resize-handle"
        lineClassName="zone-resize-line"
      />
      {data.name && <span className="zone-node__label">{data.name}</span>}
    </div>
  )
}

export const ZoneNode = memo(ZoneNodeView)
