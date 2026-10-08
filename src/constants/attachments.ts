import { Position } from '@xyflow/react'

export const OUTLINE_OFFSETS = [10, 30, 50, 70, 90] as const
export type OutlineSide = 'top' | 'right' | 'bottom' | 'left'

export interface OutlineAttachment {
  id: string
  side: OutlineSide
  position: Position
  offset: number
}

const sidePositions: Record<OutlineSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
}

export const OUTLINE_ATTACHMENTS: OutlineAttachment[] = (['top', 'right', 'bottom', 'left'] as OutlineSide[]).flatMap((side) =>
  OUTLINE_OFFSETS.map((offset) => ({ id: `outline-${side}-${offset}`, side, position: sidePositions[side], offset })),
)

export function nearestOutlineHandle(relativeX: number, relativeY: number): string {
  const x = Math.min(1, Math.max(0, relativeX))
  const y = Math.min(1, Math.max(0, relativeY))
  const sideDistances: Array<[OutlineSide, number, number]> = [
    ['top', y, x],
    ['right', 1 - x, y],
    ['bottom', 1 - y, x],
    ['left', x, y],
  ]
  const [side, , along] = sideDistances.reduce((closest, candidate) => candidate[1] < closest[1] ? candidate : closest)
  const percentage = along * 100
  const offset = OUTLINE_OFFSETS.reduce((closest, candidate) => Math.abs(candidate - percentage) < Math.abs(closest - percentage) ? candidate : closest)
  return `outline-${side}-${offset}`
}
