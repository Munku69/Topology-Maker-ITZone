import type { Edge, Node } from '@xyflow/react'

export const DEVICE_TYPES = [
  'isp', 'firewall', 'router', 'l2-switch', 'switch', 'access-point', 'load-balancer',
  'laptop', 'mobile', 'pc', 'ip-camera', 'ip-phone',
  'server', 'web-server', 'dns-server', 'app-server', 'db-server', 'file-server', 'mail-server', 'storage-server',
  'ddos-protection', 'waf', 'edr', 'xdr', 'iam', 'pam', 'siem', 'soar', 'db-firewall', 'dlp', 'sandbox', 'ciphertrust',
  'ups', 'log-management', 'network-monitor', 'text-box',
] as const
export type DeviceType = (typeof DEVICE_TYPES)[number]
export type DeviceCategory = 'network' | 'endpoints' | 'servers' | 'security' | 'operations'
export const CABLE_TYPES = ['copper-straight', 'copper-crossover', 'fiber', 'serial'] as const
export type CableType = (typeof CABLE_TYPES)[number]

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
  cableType: CableType
  sourceInterface: string
  targetInterface: string
  description: string
  parallelOffset?: number
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

export interface StoredTopologyProject extends TopologyProject {
  id: string
}

export interface ProjectSummary {
  id: string
  projectName: string
  updatedAt: string
  deviceCount: number
  connectionCount: number
}

export type SaveState = 'saved' | 'unsaved' | 'saving'
