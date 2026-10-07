import type { CSSProperties } from 'react'
import type { CableType } from '../types/topology'

export interface CablePreset {
  type: CableType
  label: string
  shortLabel: string
  description: string
  color: string
  dash?: string
}

export const CABLE_PRESETS: Record<CableType, CablePreset> = {
  'copper-straight': {
    type: 'copper-straight',
    label: 'Copper straight-through',
    shortLabel: 'Ethernet',
    description: 'Standard Ethernet link',
    color: '#38bdf8',
  },
  'copper-crossover': {
    type: 'copper-crossover',
    label: 'Copper crossover',
    shortLabel: 'Crossover',
    description: 'Direct device-to-device link',
    color: '#f59e0b',
    dash: '8 5',
  },
  fiber: {
    type: 'fiber',
    label: 'Fiber optic',
    shortLabel: 'Fiber',
    description: 'High-speed optical link',
    color: '#a78bfa',
  },
  serial: {
    type: 'serial',
    label: 'Serial',
    shortLabel: 'Serial',
    description: 'WAN or console-style link',
    color: '#fb7185',
    dash: '3 5',
  },
}

export function getCableStyle(type: CableType): CSSProperties {
  const preset = CABLE_PRESETS[type]
  return {
    stroke: preset.color,
    strokeWidth: type === 'fiber' ? 3 : 2.25,
    strokeDasharray: preset.dash,
  }
}
