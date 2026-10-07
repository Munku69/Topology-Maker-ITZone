import type { Edge, Node } from '@xyflow/react'

export const DEVICE_TYPES = ['firewall', 'router', 'switch', 'pc', 'server'] as const
export type DeviceType = (typeof DEVICE_TYPES)[number]

export interface DeviceInterface {
  id: string
  name: string
  ip: string
  vlan: string
  role: string
  description: string
}

export interface DeviceData extends Record<string, unknown> {
  deviceType: DeviceType
  name: string
  hostname: string
  managementIp: string
  subnet: string
  description: string
  interfaces: DeviceInterface[]
}

export interface ConnectionData extends Record<string, unknown> {
  sourceInterface: string
  targetInterface: string
  description: string
}

export type TopologyNode = Node<DeviceData, DeviceType>
export type TopologyEdge = Edge<ConnectionData>

export interface TopologyProject {
  version: 1
  projectName: string
  createdAt: string
  updatedAt: string
  nodes: TopologyNode[]
  edges: TopologyEdge[]
}

export type SaveState = 'saved' | 'unsaved' | 'saving'
