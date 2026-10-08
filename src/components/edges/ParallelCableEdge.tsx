import { BaseEdge, Position, type EdgeProps } from '@xyflow/react'
import type { TopologyEdge } from '../../types/topology'

interface Point { x: number; y: number }

const directions: Record<Position, Point> = {
  [Position.Top]: { x: 0, y: -1 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Bottom]: { x: 0, y: 1 },
  [Position.Left]: { x: -1, y: 0 },
}

function compactPoints(points: Point[]): Point[] {
  const unique = points.filter((point, index) => index === 0 || point.x !== points[index - 1]!.x || point.y !== points[index - 1]!.y)
  return unique.filter((point, index) => {
    if (index === 0 || index === unique.length - 1) return true
    const previous = unique[index - 1]!
    const next = unique[index + 1]!
    return !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y))
  })
}

function roundedBend(previous: Point, point: Point, next: Point, radius: number): string {
  const incoming = Math.hypot(point.x - previous.x, point.y - previous.y)
  const outgoing = Math.hypot(next.x - point.x, next.y - point.y)
  const size = Math.min(radius, incoming / 2, outgoing / 2)
  const before = {
    x: point.x + (previous.x - point.x) / Math.max(incoming, 1) * size,
    y: point.y + (previous.y - point.y) / Math.max(incoming, 1) * size,
  }
  const after = {
    x: point.x + (next.x - point.x) / Math.max(outgoing, 1) * size,
    y: point.y + (next.y - point.y) / Math.max(outgoing, 1) * size,
  }
  return `L ${before.x},${before.y} Q ${point.x},${point.y} ${after.x},${after.y}`
}

function roundedPath(points: Point[], radius = 8): string {
  let path = `M ${points[0]!.x},${points[0]!.y}`
  for (let index = 1; index < points.length - 1; index += 1) path += ` ${roundedBend(points[index - 1]!, points[index]!, points[index + 1]!, radius)}`
  return `${path} L ${points[points.length - 1]!.x},${points[points.length - 1]!.y}`
}

function midpoint(points: Point[]): Point {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index]!.x, point.y - points[index]!.y))
  const half = lengths.reduce((sum, length) => sum + length, 0) / 2
  let travelled = 0
  for (let index = 0; index < lengths.length; index += 1) {
    const segmentLength = lengths[index]!
    if (travelled + segmentLength >= half) {
      const ratio = (half - travelled) / Math.max(segmentLength, 1)
      const start = points[index]!
      const end = points[index + 1]!
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      }
    }
    travelled += segmentLength
  }
  return points[Math.floor(points.length / 2)] ?? { x: 0, y: 0 }
}

export function ParallelCableEdge({
  id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, markerStart, markerEnd,
  style, selected, label, labelStyle, labelShowBg, labelBgStyle,
  labelBgPadding, labelBgBorderRadius, interactionWidth, data,
}: EdgeProps<TopologyEdge>) {
  const source = { x: sourceX, y: sourceY }
  const target = { x: targetX, y: targetY }
  const sourceDirection = directions[sourcePosition]
  const targetDirection = directions[targetPosition]
  const leadLength = 22
  const sourceLead = { x: sourceX + sourceDirection.x * leadLength, y: sourceY + sourceDirection.y * leadLength }
  const targetLead = { x: targetX + targetDirection.x * leadLength, y: targetY + targetDirection.y * leadLength }
  const offset = data?.parallelOffset ?? 0
  const horizontalStart = sourceDirection.x !== 0
  const trunk = horizontalStart
    ? { first: { x: (sourceLead.x + targetLead.x) / 2 + offset, y: sourceLead.y }, second: { x: (sourceLead.x + targetLead.x) / 2 + offset, y: targetLead.y } }
    : { first: { x: sourceLead.x, y: (sourceLead.y + targetLead.y) / 2 + offset }, second: { x: targetLead.x, y: (sourceLead.y + targetLead.y) / 2 + offset } }
  const points = compactPoints([source, sourceLead, trunk.first, trunk.second, targetLead, target])
  const path = roundedPath(points)
  const labelPoint = midpoint(points)

  return <BaseEdge
    id={id}
    path={path}
    markerStart={markerStart}
    markerEnd={markerEnd}
    interactionWidth={interactionWidth ?? 18}
    style={{ ...style, filter: selected ? 'drop-shadow(0 0 3px currentColor)' : style?.filter }}
    label={label}
    labelX={labelPoint.x}
    labelY={labelPoint.y}
    labelStyle={labelStyle}
    labelShowBg={labelShowBg}
    labelBgStyle={labelBgStyle}
    labelBgPadding={labelBgPadding}
    labelBgBorderRadius={labelBgBorderRadius}
  />
}
