import type { Edge, Node } from '@xyflow/react'

export const DEVICE_TYPES = [
  'isp', 'firewall', 'router', 'l2-switch', 'switch', 'access-point', 'load-balancer',
  'laptop', 'mobile', 'pc', 'ip-camera', 'ip-phone',
  'server', 'web-server', 'dns-server', 'app-server', 'db-server', 'file-server', 'mail-server', 'storage-server',
  'ddos-protection', 'waf', 'edr', 'xdr', 'iam', 'pam', 'siem', 'soar', 'db-firewall', 'dlp', 'sandbox', 'ciphertrust',
  'ups', 'log-management', 'network-monitor', 'text-box', 'zone',
] as const
export type DeviceType = (typeof DEVICE_TYPES)[number]
export type DeviceCategory = 'network' | 'endpoints' | 'servers' | 'security' | 'operations'
export type ZoneLineStyle = 'solid' | 'dashed'
export interface ZoneToolOptions { color: string; lineStyle: ZoneLineStyle }
export type TextBoxBackgroundStyle = 'filled' | 'transparent'
export interface TextBoxToolOptions { backgroundStyle: TextBoxBackgroundStyle; backgroundColor: string; textColor: string }
export const CABLE_TYPES = ['copper-straight', 'copper-crossover', 'fiber', 'serial'] as const
export type CableType = (typeof CABLE_TYPES)[number]
export const CABLE_PATH_STYLES = ['straight', 'curved', 'orthogonal'] as const
export type CablePathStyle = (typeof CABLE_PATH_STYLES)[number]
export const LINK_SPEEDS = ['Auto', '10 Mbps', '100 Mbps', '1 Gbps', '2.5 Gbps', '5 Gbps', '10 Gbps', '25 Gbps', '40 Gbps', '50 Gbps', '100 Gbps', '200 Gbps', '400 Gbps', '800 Gbps'] as const
export type LinkSpeed = (typeof LINK_SPEEDS)[number]
export const LINK_PURPOSES = ['Data', 'LAN', 'WAN', 'Internet', 'Uplink', 'Trunk', 'Management', 'HA', 'Heartbeat', 'Sync', 'Cluster', 'Stacking', 'Storage', 'Replication', 'Backup', 'Console', 'Other'] as const
export type LinkPurpose = (typeof LINK_PURPOSES)[number]

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
  zoneColor?: string
  zoneLineStyle?: ZoneLineStyle
  textBackgroundStyle?: TextBoxBackgroundStyle
  textBackgroundColor?: string
  textColor?: string
}

export interface ConnectionData extends Record<string, unknown> {
  cableType: CableType
  color: string
  speed: LinkSpeed
  purpose: LinkPurpose
  showCableType: boolean
  pathStyle: CablePathStyle
  sourceInterface: string
  targetInterface: string
  description: string
  parallelOffset?: number
  routingLaneIndex?: number
  sourceLaneOffset?: number
  targetLaneOffset?: number
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
