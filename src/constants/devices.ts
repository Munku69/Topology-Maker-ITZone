import type { CableType, DeviceCategory, DeviceData, DeviceInterface, DeviceType, TopologyEdge, TopologyNode } from '../types/topology'
import { getCableStyle } from './cables'

export interface DevicePreset {
  type: DeviceType
  category: DeviceCategory
  label: string
  defaultName: string
  description: string
  accent: string
  iconPath: string
  defaultInterfaces: Omit<DeviceInterface, 'id'>[]
}

const iface = (name: string, role: string, ip = ''): Omit<DeviceInterface, 'id'> => ({ name, ip, vlan: '', role, description: '' })
const pair = (first = 'eth0', second = 'eth1'): Omit<DeviceInterface, 'id'>[] => [iface(first, 'LAN'), iface(second, 'WAN')]

export const DEVICE_PRESETS: Record<DeviceType, DevicePreset> = {
  isp: {
    type: 'isp', category: 'network', label: 'ISP', defaultName: 'ISP-01', description: 'Internet service provider connection', accent: '#2563eb', iconPath: '/device-icons/isp.png',
    defaultInterfaces: [iface('WAN1', 'Internet'), iface('WAN2', 'Internet')],
  },
  firewall: {
    type: 'firewall', category: 'network', label: 'Firewall', defaultName: 'FGT-HQ', description: 'Secure the network edge', accent: '#fb7185', iconPath: '/device-icons/firewall.png',
    defaultInterfaces: [iface('port1', 'LAN'), iface('port2', 'WAN', 'DHCP')],
  },
  router: {
    type: 'router', category: 'network', label: 'Router', defaultName: 'RTR-01', description: 'Route between networks', accent: '#3b82f6', iconPath: '/device-icons/router.png',
    defaultInterfaces: [iface('Gi0/0', 'WAN'), iface('Gi0/1', 'LAN')],
  },
  'l2-switch': {
    type: 'l2-switch', category: 'network', label: 'L2 Switch', defaultName: 'ACCESS-SW1', description: 'Layer 2 access switching', accent: '#22d3ee', iconPath: '/device-icons/l2-switch.png',
    defaultInterfaces: [iface('Gi0/1', 'Trunk'), iface('Gi0/2', 'Access'), iface('Fa0/1', 'Access'), iface('Fa0/2', 'Access')],
  },
  switch: {
    type: 'switch', category: 'network', label: 'L3 Switch', defaultName: 'CORE-SW1', description: 'Layer 3 core switching', accent: '#2dd4bf', iconPath: '/device-icons/l3-switch.png',
    defaultInterfaces: [iface('Gi0/1', 'Trunk'), iface('Gi0/2', 'Access'), iface('Fa0/1', 'Access'), iface('Fa0/2', 'Access')],
  },
  'access-point': {
    type: 'access-point', category: 'network', label: 'Access Point', defaultName: 'AP-01', description: 'Wireless network access', accent: '#06b6d4', iconPath: '/device-icons/access-point.png',
    defaultInterfaces: [iface('eth0', 'LAN'), iface('wlan0', 'Wireless')],
  },
  'load-balancer': {
    type: 'load-balancer', category: 'network', label: 'Load Balancer', defaultName: 'LB-01', description: 'Distribute application traffic', accent: '#0ea5e9', iconPath: '/device-icons/load-balancer.png', defaultInterfaces: pair(),
  },
  laptop: {
    type: 'laptop', category: 'endpoints', label: 'Laptop', defaultName: 'LAPTOP-01', description: 'Portable user endpoint', accent: '#8b5cf6', iconPath: '/device-icons/laptop.png', defaultInterfaces: [iface('wlan0', 'Wireless'), iface('eth0', 'LAN')],
  },
  mobile: {
    type: 'mobile', category: 'endpoints', label: 'Mobile', defaultName: 'MOBILE-01', description: 'Mobile endpoint', accent: '#a78bfa', iconPath: '/device-icons/mobile.png', defaultInterfaces: [iface('wlan0', 'Wireless')],
  },
  pc: {
    type: 'pc', category: 'endpoints', label: 'PC', defaultName: 'PC-01', description: 'Desktop user endpoint', accent: '#7c3aed', iconPath: '/device-icons/pc.png', defaultInterfaces: [iface('eth0', 'LAN', 'DHCP')],
  },
  'ip-camera': {
    type: 'ip-camera', category: 'endpoints', label: 'IP Camera', defaultName: 'CAM-01', description: 'Network surveillance camera', accent: '#c084fc', iconPath: '/device-icons/ip-camera.png', defaultInterfaces: [iface('eth0', 'LAN', 'DHCP')],
  },
  'ip-phone': {
    type: 'ip-phone', category: 'endpoints', label: 'IP Phone', defaultName: 'PHONE-01', description: 'Voice over IP endpoint', accent: '#9333ea', iconPath: '/device-icons/ip-phone.png', defaultInterfaces: [iface('switch', 'Voice'), iface('pc', 'Pass-through')],
  },
  server: {
    type: 'server', category: 'servers', label: 'Server', defaultName: 'SRV-01', description: 'General-purpose server', accent: '#fbbf24', iconPath: '/device-icons/server.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  'web-server': {
    type: 'web-server', category: 'servers', label: 'Web Server', defaultName: 'WEB-SRV', description: 'Host web applications', accent: '#f59e0b', iconPath: '/device-icons/web-server.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  'dns-server': {
    type: 'dns-server', category: 'servers', label: 'DNS Server', defaultName: 'DNS-SRV', description: 'Resolve network names', accent: '#eab308', iconPath: '/device-icons/dns-server.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  'app-server': {
    type: 'app-server', category: 'servers', label: 'App Server', defaultName: 'APP-SRV', description: 'Host business applications', accent: '#f97316', iconPath: '/device-icons/app-server.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  'db-server': {
    type: 'db-server', category: 'servers', label: 'DB Server', defaultName: 'DB-SRV', description: 'Host application databases', accent: '#d97706', iconPath: '/device-icons/db-server.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  'file-server': {
    type: 'file-server', category: 'servers', label: 'File Server', defaultName: 'FILE-SRV', description: 'Provide shared file storage', accent: '#f59e0b', iconPath: '/device-icons/file-server.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  'mail-server': {
    type: 'mail-server', category: 'servers', label: 'Mail Server', defaultName: 'MAIL-SRV', description: 'Host email services', accent: '#fbbf24', iconPath: '/device-icons/mail-server.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  'storage-server': {
    type: 'storage-server', category: 'servers', label: 'Storage Server', defaultName: 'STORAGE-01', description: 'Central network storage', accent: '#fb923c', iconPath: '/device-icons/storage-server.png', defaultInterfaces: pair('eth0', 'eth1'),
  },
  'ddos-protection': {
    type: 'ddos-protection', category: 'security', label: 'DDoS Protection', defaultName: 'DDOS-01', description: 'Mitigate denial-of-service attacks', accent: '#fb7185', iconPath: '/device-icons/ddos-protection.png', defaultInterfaces: pair(),
  },
  waf: {
    type: 'waf', category: 'security', label: 'WAF', defaultName: 'WAF-01', description: 'Protect web applications', accent: '#f43f5e', iconPath: '/device-icons/waf.png', defaultInterfaces: pair(),
  },
  edr: {
    type: 'edr', category: 'security', label: 'EDR', defaultName: 'EDR-01', description: 'Endpoint detection and response', accent: '#e11d48', iconPath: '/device-icons/edr.png', defaultInterfaces: [iface('mgmt0', 'Management')],
  },
  xdr: {
    type: 'xdr', category: 'security', label: 'XDR', defaultName: 'XDR-01', description: 'Extended detection and response', accent: '#f43f5e', iconPath: '/device-icons/xdr.png', defaultInterfaces: [iface('mgmt0', 'Management')],
  },
  iam: {
    type: 'iam', category: 'security', label: 'IAM', defaultName: 'IAM-01', description: 'Identity and access management', accent: '#ec4899', iconPath: '/device-icons/iam.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  pam: {
    type: 'pam', category: 'security', label: 'PAM', defaultName: 'PAM-01', description: 'Privileged access management', accent: '#db2777', iconPath: '/device-icons/pam.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  siem: {
    type: 'siem', category: 'security', label: 'SIEM', defaultName: 'SIEM-01', description: 'Security event monitoring', accent: '#f43f5e', iconPath: '/device-icons/siem.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  soar: {
    type: 'soar', category: 'security', label: 'SOAR', defaultName: 'SOAR-01', description: 'Security orchestration and response', accent: '#e11d48', iconPath: '/device-icons/soar.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  'db-firewall': {
    type: 'db-firewall', category: 'security', label: 'DB Firewall', defaultName: 'DB-FW01', description: 'Protect database traffic', accent: '#fb7185', iconPath: '/device-icons/db-firewall.png', defaultInterfaces: pair(),
  },
  dlp: {
    type: 'dlp', category: 'security', label: 'DLP', defaultName: 'DLP-01', description: 'Prevent sensitive data loss', accent: '#ec4899', iconPath: '/device-icons/dlp.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  sandbox: {
    type: 'sandbox', category: 'security', label: 'Sandbox', defaultName: 'SANDBOX-01', description: 'Analyze suspicious files', accent: '#f43f5e', iconPath: '/device-icons/sandbox.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  ciphertrust: {
    type: 'ciphertrust', category: 'security', label: 'CipherTrust', defaultName: 'CTM-01', description: 'Enterprise data security', accent: '#db2777', iconPath: '/device-icons/ciphertrust.png', defaultInterfaces: pair(),
  },
  ups: {
    type: 'ups', category: 'operations', label: 'UPS', defaultName: 'UPS-01', description: 'Uninterruptible power supply', accent: '#34d399', iconPath: '/device-icons/ups.png', defaultInterfaces: [iface('mgmt0', 'Management')],
  },
  'log-management': {
    type: 'log-management', category: 'operations', label: 'Log Management', defaultName: 'LOG-01', description: 'Centralize infrastructure logs', accent: '#10b981', iconPath: '/device-icons/log-management.png', defaultInterfaces: [iface('eth0', 'LAN')],
  },
  'network-monitor': {
    type: 'network-monitor', category: 'operations', label: 'Network Monitor', defaultName: 'NMS-01', description: 'Monitor network health', accent: '#14b8a6', iconPath: '/device-icons/network-monitor.png', defaultInterfaces: [iface('eth0', 'Management')],
  },
  'text-box': {
    type: 'text-box', category: 'operations', label: 'Text Box', defaultName: 'Note', description: 'Add notes to the canvas', accent: '#f59e0b', iconPath: '', defaultInterfaces: [],
  },
}

export const DEVICE_GROUPS: { id: DeviceCategory; label: string; description: string; types: DeviceType[] }[] = [
  { id: 'network', label: 'Network', description: 'Routing, switching, and delivery', types: ['isp', 'firewall', 'router', 'l2-switch', 'switch', 'access-point', 'load-balancer'] },
  { id: 'endpoints', label: 'Endpoints', description: 'Users, phones, and cameras', types: ['laptop', 'mobile', 'pc', 'ip-camera', 'ip-phone'] },
  { id: 'servers', label: 'Servers', description: 'Compute, applications, and storage', types: ['server', 'web-server', 'dns-server', 'app-server', 'db-server', 'file-server', 'mail-server', 'storage-server'] },
  { id: 'security', label: 'Security', description: 'Detection, access, and protection', types: ['ddos-protection', 'waf', 'edr', 'xdr', 'iam', 'pam', 'siem', 'soar', 'db-firewall', 'dlp', 'sandbox', 'ciphertrust'] },
  { id: 'operations', label: 'Operations', description: 'Power, logging, and monitoring', types: ['ups', 'log-management', 'network-monitor'] },
]

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
    makeNode('demo-internet', 'isp', 380, 40, { name: 'INTERNET', hostname: 'INTERNET' }),
    makeNode('demo-fw', 'firewall', 380, 230, { name: 'FGT-HQ', hostname: 'FGT-HQ', managementIp: '192.168.1.99/24' }),
    makeNode('demo-switch', 'switch', 380, 430, { name: 'CORE-SW1', hostname: 'CORE-SW1', managementIp: '192.168.1.2/24' }),
    makeNode('demo-pc', 'pc', 160, 650, { name: 'PC-01', hostname: 'PC-01', managementIp: '192.168.1.100/24' }),
    makeNode('demo-server', 'server', 600, 650, { name: 'WEB-SRV', hostname: 'WEB-SRV', managementIp: '192.168.1.10/24' }),
  ]
  const makeEdge = (id: string, source: string, target: string, sourceInterface: string, targetInterface: string, cableType: CableType = 'copper-straight'): TopologyEdge => ({
    id, source, target, type: 'smoothstep', animated: false,
    sourceHandle: 'bottom', targetHandle: 'top',
    data: { cableType, sourceInterface, targetInterface, description: '' },
    label: [sourceInterface, targetInterface].filter(Boolean).join('  ·  '),
    style: getCableStyle(cableType),
  })
  return { nodes, edges: [
    makeEdge('demo-edge-1', 'demo-internet', 'demo-fw', 'WAN1', 'port2'),
    makeEdge('demo-edge-2', 'demo-fw', 'demo-switch', 'port1', 'Gi0/1'),
    makeEdge('demo-edge-3', 'demo-switch', 'demo-pc', 'Fa0/1', 'eth0'),
    makeEdge('demo-edge-4', 'demo-switch', 'demo-server', 'Fa0/2', 'eth0'),
  ] }
}
