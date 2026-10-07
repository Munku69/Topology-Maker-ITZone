import type { DeviceData, DeviceInterface, DeviceType, TopologyEdge, TopologyNode } from '../types/topology'

export interface DevicePreset {
  type: DeviceType
  label: string
  defaultName: string
  description: string
  accent: string
  defaultInterfaces: Omit<DeviceInterface, 'id'>[]
}

export const DEVICE_PRESETS: Record<DeviceType, DevicePreset> = {
  firewall: {
    type: 'firewall', label: 'Firewall', defaultName: 'FortiGate', description: 'Secure the network edge', accent: '#fb7185',
    defaultInterfaces: [
      { name: 'port1', ip: '', vlan: '', role: 'LAN', description: '' },
      { name: 'port2', ip: 'DHCP', vlan: '', role: 'WAN', description: '' },
    ],
  },
  router: {
    type: 'router', label: 'Router', defaultName: 'RTR-01', description: 'Route between networks', accent: '#60a5fa',
    defaultInterfaces: [
      { name: 'Gi0/0', ip: '', vlan: '', role: 'WAN', description: '' },
      { name: 'Gi0/1', ip: '', vlan: '', role: 'LAN', description: '' },
    ],
  },
  switch: {
    type: 'switch', label: 'Switch', defaultName: 'CORE-SW1', description: 'Connect local devices', accent: '#2dd4bf',
    defaultInterfaces: [
      { name: 'Gi0/1', ip: '', vlan: '', role: 'Trunk', description: '' },
      { name: 'Gi0/2', ip: '', vlan: '', role: 'Access', description: '' },
    ],
  },
  pc: {
    type: 'pc', label: 'PC', defaultName: 'PC-01', description: 'User endpoint', accent: '#a78bfa',
    defaultInterfaces: [{ name: 'eth0', ip: 'DHCP', vlan: '', role: 'LAN', description: '' }],
  },
  server: {
    type: 'server', label: 'Server', defaultName: 'WEB-SRV', description: 'Host network services', accent: '#fbbf24',
    defaultInterfaces: [{ name: 'eth0', ip: '', vlan: '', role: 'LAN', description: '' }],
  },
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function createDeviceData(type: DeviceType): DeviceData {
  const preset = DEVICE_PRESETS[type]
  return {
    deviceType: type,
    name: preset.defaultName,
    hostname: preset.defaultName,
    managementIp: '',
    subnet: '',
    description: '',
    interfaces: preset.defaultInterfaces.map((item) => ({ ...item, id: newId('if') })),
  }
}

export function createDemoTopology(): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  const makeNode = (id: string, type: DeviceType, x: number, y: number, patch: Partial<DeviceData>): TopologyNode => ({
    id,
    type,
    position: { x, y },
    data: { ...createDeviceData(type), ...patch, deviceType: type },
  })
  const nodes = [
    makeNode('demo-internet', 'router', 380, 40, { name: 'INTERNET', hostname: 'INTERNET' }),
    makeNode('demo-fw', 'firewall', 380, 230, { name: 'FGT-HQ', hostname: 'FGT-HQ', managementIp: '192.168.1.99/24' }),
    makeNode('demo-switch', 'switch', 380, 430, { name: 'CORE-SW1', hostname: 'CORE-SW1', managementIp: '192.168.1.2/24' }),
    makeNode('demo-pc', 'pc', 160, 650, { name: 'PC-01', hostname: 'PC-01', managementIp: '192.168.1.100/24' }),
    makeNode('demo-server', 'server', 600, 650, { name: 'WEB-SRV', hostname: 'WEB-SRV', managementIp: '192.168.1.10/24' }),
  ]
  const makeEdge = (id: string, source: string, target: string, sourceInterface: string, targetInterface: string): TopologyEdge => ({
    id, source, target, type: 'smoothstep', animated: false,
    data: { sourceInterface, targetInterface, description: '' },
    label: [sourceInterface, targetInterface].filter(Boolean).join('  ·  '),
  })
  return { nodes, edges: [
    makeEdge('demo-edge-1', 'demo-internet', 'demo-fw', 'WAN', 'port2'),
    makeEdge('demo-edge-2', 'demo-fw', 'demo-switch', 'port1', 'Gi0/1'),
    makeEdge('demo-edge-3', 'demo-switch', 'demo-pc', 'Fa0/1', 'eth0'),
    makeEdge('demo-edge-4', 'demo-switch', 'demo-server', 'Fa0/2', 'eth0'),
  ] }
}
