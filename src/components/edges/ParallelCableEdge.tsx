import { BaseEdge, Position, useInternalNode, useStore, type EdgeProps } from '@xyflow/react'
import type { DeviceData, TopologyEdge, TopologyNode } from '../../types/topology'

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

function rightAnglePath(points: Point[]): string {
  return points.slice(1).reduce((path, point) => `${path} L ${point.x},${point.y}`, `M ${points[0]!.x},${points[0]!.y}`)
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

function bezierPath(source: Point, target: Point, sourceDirection: Point, targetDirection: Point, laneOffset: number): { path: string; label: Point } {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const length = Math.max(1, Math.hypot(dx, dy))
  const controlDistance = Math.max(45, Math.min(180, length * 0.45))
  const normal = { x: -dy / length, y: dx / length }
  const controlOne = { x: source.x + sourceDirection.x * controlDistance + normal.x * laneOffset, y: source.y + sourceDirection.y * controlDistance + normal.y * laneOffset }
  const controlTwo = { x: target.x + targetDirection.x * controlDistance + normal.x * laneOffset, y: target.y + targetDirection.y * controlDistance + normal.y * laneOffset }
  const label = {
    x: (source.x + 3 * controlOne.x + 3 * controlTwo.x + target.x) / 8,
    y: (source.y + 3 * controlOne.y + 3 * controlTwo.y + target.y) / 8,
  }
  return { path: `M ${source.x},${source.y} C ${controlOne.x},${controlOne.y} ${controlTwo.x},${controlTwo.y} ${target.x},${target.y}`, label }
}

interface MeasuredInternalNode {
  measured?: { width?: number; height?: number }
  internals: { positionAbsolute: Point }
}

function visualBounds(node: MeasuredInternalNode | null | undefined): Bounds | null {
  if (!node) return null
  const width = node.measured?.width ?? VISUAL_SIZE
  const height = node.measured?.height ?? VISUAL_SIZE
  const left = node.internals.positionAbsolute.x
  const top = node.internals.positionAbsolute.y
  return { left, right: left + width, top, bottom: top + height }
}

function expanded(bounds: Bounds): Bounds {
  return {
    left: bounds.left - ROUTE_CLEARANCE,
    right: bounds.right + ROUTE_CLEARANCE,
    top: bounds.top - ROUTE_CLEARANCE,
    bottom: bounds.bottom + ROUTE_CLEARANCE,
  }
}

function offsetEndpoint(point: Point, position: Position, offset: number, bounds: Bounds | null): Point {
  if (!offset) return point
  if (position === Position.Top || position === Position.Bottom) {
    const x = point.x + offset
    return { x: bounds ? Math.min(bounds.right - 4, Math.max(bounds.left + 4, x)) : x, y: point.y }
  }
  const y = point.y + offset
  return { x: point.x, y: bounds ? Math.min(bounds.bottom - 4, Math.max(bounds.top + 4, y)) : y }
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

function routedLeads(sourceLead: Point, targetLead: Point, horizontalStart: boolean, offset: number, laneIndex: number, obstacles: Bounds[]): Point[] {
  const preferredX = (sourceLead.x + targetLead.x) / 2 + offset
  const preferredY = (sourceLead.y + targetLead.y) / 2 + offset
  const preferred = horizontalStart
    ? [sourceLead, { x: preferredX, y: sourceLead.y }, { x: preferredX, y: targetLead.y }, targetLead]
    : [sourceLead, { x: sourceLead.x, y: preferredY }, { x: targetLead.x, y: preferredY }, targetLead]

  if (isClear(preferred, obstacles)) return preferred

  const lane = 12 + laneIndex * 8
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
  const flowNodes = useStore((state) => state.nodes)
  const nodeLookup = useStore((state) => state.nodeLookup)
  const sourceBounds = visualBounds(sourceNode)
  const targetBounds = visualBounds(targetNode)
  const source = offsetEndpoint({ x: sourceX, y: sourceY }, sourcePosition, data?.sourceLaneOffset ?? 0, sourceBounds)
  const target = offsetEndpoint({ x: targetX, y: targetY }, targetPosition, data?.targetLaneOffset ?? 0, targetBounds)
  const sourceDirection = directions[sourcePosition]
  const targetDirection = directions[targetPosition]
  const leadLength = 22
  const sourceLead = { x: source.x + sourceDirection.x * leadLength, y: source.y + sourceDirection.y * leadLength }
  const targetLead = { x: target.x + targetDirection.x * leadLength, y: target.y + targetDirection.y * leadLength }
  const offset = data?.parallelOffset ?? 0
  const horizontalStart = sourceDirection.x !== 0
  const otherDeviceBounds = flowNodes
    .filter((node) => {
      const deviceType = (node.data as Partial<DeviceData>).deviceType
      return node.id !== sourceId && node.id !== targetId && deviceType !== 'zone' && deviceType !== 'text-box'
    })
    .map((node) => visualBounds(nodeLookup.get(node.id)))
    .filter((bounds): bounds is Bounds => bounds !== null)
  const obstacles = [sourceBounds, targetBounds, ...otherDeviceBounds].filter((bounds): bounds is Bounds => bounds !== null).map(expanded)
  const pathStyle = data?.pathStyle ?? 'orthogonal'
  let path: string
  let labelPoint: Point
  if (pathStyle === 'straight') {
    path = `M ${source.x},${source.y} L ${target.x},${target.y}`
    labelPoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 }
  } else if (pathStyle === 'curved') {
    const curve = bezierPath(source, target, sourceDirection, targetDirection, offset)
    path = curve.path
    labelPoint = curve.label
  } else {
    const routed = routedLeads(sourceLead, targetLead, horizontalStart, offset, data?.routingLaneIndex ?? 0, obstacles)
    const points = compactPoints([source, ...routed, target])
    path = rightAnglePath(points)
    labelPoint = midpoint(points)
  }

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
