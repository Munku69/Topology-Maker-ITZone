import { BaseEdge, Position, useInternalNode, type EdgeProps } from '@xyflow/react'
import type { TopologyEdge, TopologyNode } from '../../types/topology'

interface Point { x: number; y: number }
interface Bounds { left: number; right: number; top: number; bottom: number }

const VISUAL_SIZE = 112
const ROUTE_CLEARANCE = 9

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

function visualBounds(node: ReturnType<typeof useInternalNode<TopologyNode>>): Bounds | null {
  if (!node) return null
  const width = node.measured.width ?? 150
  const left = node.internals.positionAbsolute.x + (width - VISUAL_SIZE) / 2
  const top = node.internals.positionAbsolute.y
  return { left, right: left + VISUAL_SIZE, top, bottom: top + VISUAL_SIZE }
}

function expanded(bounds: Bounds): Bounds {
  return {
    left: bounds.left - ROUTE_CLEARANCE,
    right: bounds.right + ROUTE_CLEARANCE,
    top: bounds.top - ROUTE_CLEARANCE,
    bottom: bounds.bottom + ROUTE_CLEARANCE,
  }
}

function segmentCrossesBounds(start: Point, end: Point, bounds: Bounds): boolean {
  if (start.y === end.y) {
    const minX = Math.min(start.x, end.x)
    const maxX = Math.max(start.x, end.x)
    return start.y > bounds.top && start.y < bounds.bottom && Math.max(minX, bounds.left) < Math.min(maxX, bounds.right)
  }
  if (start.x === end.x) {
    const minY = Math.min(start.y, end.y)
    const maxY = Math.max(start.y, end.y)
    return start.x > bounds.left && start.x < bounds.right && Math.max(minY, bounds.top) < Math.min(maxY, bounds.bottom)
  }
  return true
}

function isClear(points: Point[], obstacles: Bounds[]): boolean {
  return points.slice(1).every((point, index) => obstacles.every((bounds) => !segmentCrossesBounds(points[index]!, point, bounds)))
}

function routeLength(points: Point[]): number {
  return points.slice(1).reduce((total, point, index) => total + Math.abs(point.x - points[index]!.x) + Math.abs(point.y - points[index]!.y), 0)
}

function routedLeads(sourceLead: Point, targetLead: Point, horizontalStart: boolean, offset: number, obstacles: Bounds[]): Point[] {
  const preferredX = (sourceLead.x + targetLead.x) / 2 + offset
  const preferredY = (sourceLead.y + targetLead.y) / 2 + offset
  const preferred = horizontalStart
    ? [sourceLead, { x: preferredX, y: sourceLead.y }, { x: preferredX, y: targetLead.y }, targetLead]
    : [sourceLead, { x: sourceLead.x, y: preferredY }, { x: targetLead.x, y: preferredY }, targetLead]

  if (isClear(preferred, obstacles)) return preferred

  const lane = offset === 0 ? 0 : Math.abs(offset) + (offset < 0 ? 8 : 0)
  const xCandidates = [
    preferredX,
    sourceLead.x,
    targetLead.x,
    ...obstacles.flatMap((bounds) => [bounds.left - lane, bounds.right + lane]),
  ]
  const yCandidates = [
    preferredY,
    sourceLead.y,
    targetLead.y,
    ...obstacles.flatMap((bounds) => [bounds.top - lane, bounds.bottom + lane]),
  ]
  const candidates = [
    ...xCandidates.map((x) => [sourceLead, { x, y: sourceLead.y }, { x, y: targetLead.y }, targetLead]),
    ...yCandidates.map((y) => [sourceLead, { x: sourceLead.x, y }, { x: targetLead.x, y }, targetLead]),
  ].filter((points) => isClear(points, obstacles))

  if (!candidates.length) return preferred
  return candidates.reduce((best, candidate) => routeLength(candidate) < routeLength(best) ? candidate : best)
}

export function ParallelCableEdge({
  id, source: sourceId, target: targetId, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, markerStart, markerEnd,
  style, selected, label, labelStyle, labelShowBg, labelBgStyle,
  labelBgPadding, labelBgBorderRadius, interactionWidth, data,
}: EdgeProps<TopologyEdge>) {
  const sourceNode = useInternalNode<TopologyNode>(sourceId)
  const targetNode = useInternalNode<TopologyNode>(targetId)
  const source = { x: sourceX, y: sourceY }
  const target = { x: targetX, y: targetY }
  const sourceDirection = directions[sourcePosition]
  const targetDirection = directions[targetPosition]
  const leadLength = 22
  const sourceLead = { x: sourceX + sourceDirection.x * leadLength, y: sourceY + sourceDirection.y * leadLength }
  const targetLead = { x: targetX + targetDirection.x * leadLength, y: targetY + targetDirection.y * leadLength }
  const offset = data?.parallelOffset ?? 0
  const horizontalStart = sourceDirection.x !== 0
  const obstacles = [visualBounds(sourceNode), visualBounds(targetNode)].filter((bounds): bounds is Bounds => bounds !== null).map(expanded)
  const routed = routedLeads(sourceLead, targetLead, horizontalStart, offset, obstacles)
  const points = compactPoints([source, ...routed, target])
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
