import { CABLE_PRESETS, getCableStyle } from './cables'
import { createDeviceData, newId } from './devices'
import type { CableType, DeviceData, DeviceType, LinkSpeed, TopologyEdge, TopologyNode } from '../types/topology'

export type TopologyTemplateId = 'small-office' | 'dual-isp-ha' | 'branch-office' | 'data-center'

export interface TopologyTemplateDefinition {
  id: TopologyTemplateId
  name: string
  description: string
  summary: string
}

export const TOPOLOGY_TEMPLATES: TopologyTemplateDefinition[] = [
  { id: 'small-office', name: 'Small Office', description: 'Internet edge, firewall, switching, Wi-Fi, users, and a server.', summary: '7 devices · 6 links' },
  { id: 'dual-isp-ha', name: 'Dual ISP + Firewall HA', description: 'Resilient internet edge with active/passive firewalls and redundant core switching.', summary: '10 devices · 12 links' },
  { id: 'branch-office', name: 'Headquarters + Branch', description: 'Head office and branch office connected across a WAN.', summary: '11 devices · 11 links' },
  { id: 'data-center', name: 'Data Center', description: 'Protected application stack with load balancing, web, application, database, and monitoring tiers.', summary: '10 devices · 10 links' },
]

function build(templateId: TopologyTemplateId): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  const nodes: TopologyNode[] = []
  const edges: TopologyEdge[] = []
  const addNode = (key: string, type: DeviceType, x: number, y: number, name: string, managementIp = '') => {
    const data: DeviceData = { ...createDeviceData(type), deviceType: type, name, hostname: name, managementIp }
    nodes.push({ id: key, type, position: { x, y }, data })
    return key
  }
  const addEdge = (source: string, target: string, speed: LinkSpeed = '1 Gbps', color = '#38bdf8', cableType: CableType = 'copper-straight') => {
    const id = newId('edge')
    edges.push({
      id, source, target, sourceHandle: 'bottom', targetHandle: 'top', type: 'smoothstep',
      data: { cableType, color, speed, purpose: 'Data', showCableType: false, pathStyle: 'straight', sourceInterface: '', targetInterface: '', description: '' },
      style: getCableStyle(cableType, color),
    })
  }

  if (templateId === 'small-office') {
    addNode('tpl-isp', 'isp', 360, 20, 'ISP-01')
    addNode('tpl-fw', 'firewall', 360, 190, 'FGT-HQ', '192.168.1.1/24')
    addNode('tpl-sw', 'switch', 360, 370, 'CORE-SW1', '192.168.1.2/24')
    addNode('tpl-ap', 'access-point', 70, 570, 'AP-01', '192.168.1.3/24')
    addNode('tpl-pc', 'pc', 270, 570, 'PC-01', '192.168.1.100/24')
    addNode('tpl-laptop', 'laptop', 470, 570, 'LAPTOP-01', '192.168.1.101/24')
    addNode('tpl-server', 'server', 670, 570, 'SRV-01', '192.168.1.10/24')
    addEdge('tpl-isp', 'tpl-fw', '1 Gbps'); addEdge('tpl-fw', 'tpl-sw', '10 Gbps'); addEdge('tpl-sw', 'tpl-ap'); addEdge('tpl-sw', 'tpl-pc'); addEdge('tpl-sw', 'tpl-laptop'); addEdge('tpl-sw', 'tpl-server')
  }

  if (templateId === 'dual-isp-ha') {
    addNode('tpl-isp1', 'isp', 180, 10, 'ISP-01'); addNode('tpl-isp2', 'isp', 620, 10, 'ISP-02')
    addNode('tpl-fw1', 'firewall', 280, 210, 'FGT-ACTIVE', '10.0.0.2/30'); addNode('tpl-fw2', 'firewall', 520, 210, 'FGT-PASSIVE', '10.0.0.3/30')
    addNode('tpl-core1', 'switch', 280, 430, 'CORE-SW1', '10.10.0.2/24'); addNode('tpl-core2', 'switch', 520, 430, 'CORE-SW2', '10.10.0.3/24')
    addNode('tpl-access1', 'l2-switch', 80, 650, 'ACCESS-SW1', '10.10.0.11/24'); addNode('tpl-access2', 'l2-switch', 320, 650, 'ACCESS-SW2', '10.10.0.12/24')
    addNode('tpl-server', 'server', 560, 650, 'APP-SRV', '10.10.20.10/24'); addNode('tpl-nms', 'network-monitor', 760, 650, 'NMS-01', '10.10.30.10/24')
    addEdge('tpl-isp1', 'tpl-fw1', '10 Gbps'); addEdge('tpl-isp1', 'tpl-fw2', '10 Gbps'); addEdge('tpl-isp2', 'tpl-fw1', '10 Gbps'); addEdge('tpl-isp2', 'tpl-fw2', '10 Gbps')
    addEdge('tpl-fw1', 'tpl-fw2', '10 Gbps', '#ef4444'); addEdge('tpl-fw1', 'tpl-core1', '25 Gbps'); addEdge('tpl-fw2', 'tpl-core2', '25 Gbps'); addEdge('tpl-core1', 'tpl-core2', '100 Gbps', '#a78bfa', 'fiber')
    addEdge('tpl-core1', 'tpl-access1', '10 Gbps'); addEdge('tpl-core2', 'tpl-access2', '10 Gbps'); addEdge('tpl-core1', 'tpl-server', '25 Gbps'); addEdge('tpl-core2', 'tpl-nms', '10 Gbps')
  }

  if (templateId === 'branch-office') {
    addNode('tpl-isp', 'isp', 390, 10, 'INTERNET')
    addNode('tpl-hq-fw', 'firewall', 170, 190, 'HQ-FW', '10.1.0.1/24'); addNode('tpl-br-fw', 'firewall', 610, 190, 'BRANCH-FW', '10.2.0.1/24')
    addNode('tpl-hq-core', 'switch', 170, 390, 'HQ-CORE', '10.1.0.2/24'); addNode('tpl-br-sw', 'l2-switch', 610, 390, 'BRANCH-SW1', '10.2.0.2/24')
    addNode('tpl-hq-pc', 'pc', 20, 590, 'HQ-PC01', '10.1.10.20/24'); addNode('tpl-hq-srv', 'server', 220, 590, 'HQ-SRV', '10.1.20.10/24'); addNode('tpl-hq-ap', 'access-point', 390, 590, 'HQ-AP01', '10.1.30.10/24')
    addNode('tpl-br-pc', 'pc', 560, 590, 'BR-PC01', '10.2.10.20/24'); addNode('tpl-br-ap', 'access-point', 730, 590, 'BR-AP01', '10.2.30.10/24'); addNode('tpl-nms', 'network-monitor', 390, 790, 'NMS-01', '10.1.20.20/24')
    addEdge('tpl-isp', 'tpl-hq-fw', '1 Gbps'); addEdge('tpl-isp', 'tpl-br-fw', '1 Gbps'); addEdge('tpl-hq-fw', 'tpl-br-fw', '1 Gbps', '#f59e0b'); addEdge('tpl-hq-fw', 'tpl-hq-core', '10 Gbps'); addEdge('tpl-br-fw', 'tpl-br-sw', '10 Gbps')
    addEdge('tpl-hq-core', 'tpl-hq-pc'); addEdge('tpl-hq-core', 'tpl-hq-srv', '10 Gbps'); addEdge('tpl-hq-core', 'tpl-hq-ap'); addEdge('tpl-br-sw', 'tpl-br-pc'); addEdge('tpl-br-sw', 'tpl-br-ap'); addEdge('tpl-hq-core', 'tpl-nms')
  }

  if (templateId === 'data-center') {
    addNode('tpl-isp', 'isp', 390, 0, 'DC-INTERNET')
    addNode('tpl-ddos', 'ddos-protection', 390, 150, 'DDOS-01', '172.16.0.2/30')
    addNode('tpl-fw', 'firewall', 390, 310, 'DC-FW', '172.16.1.1/24')
    addNode('tpl-lb', 'load-balancer', 390, 470, 'LB-01', '172.16.10.5/24')
    addNode('tpl-web1', 'web-server', 60, 650, 'WEB-01', '172.16.10.11/24'); addNode('tpl-web2', 'web-server', 260, 650, 'WEB-02', '172.16.10.12/24')
    addNode('tpl-app1', 'app-server', 460, 650, 'APP-01', '172.16.20.11/24'); addNode('tpl-db', 'db-server', 660, 650, 'DB-01', '172.16.30.11/24')
    addNode('tpl-storage', 'storage-server', 260, 840, 'STORAGE-01', '172.16.40.11/24'); addNode('tpl-nms', 'network-monitor', 560, 840, 'NMS-01', '172.16.50.11/24')
    addEdge('tpl-isp', 'tpl-ddos', '10 Gbps'); addEdge('tpl-ddos', 'tpl-fw', '10 Gbps'); addEdge('tpl-fw', 'tpl-lb', '25 Gbps'); addEdge('tpl-lb', 'tpl-web1', '10 Gbps'); addEdge('tpl-lb', 'tpl-web2', '10 Gbps'); addEdge('tpl-web1', 'tpl-app1', '10 Gbps'); addEdge('tpl-web2', 'tpl-app1', '10 Gbps'); addEdge('tpl-app1', 'tpl-db', '25 Gbps'); addEdge('tpl-db', 'tpl-storage', '25 Gbps', '#a78bfa', 'fiber'); addEdge('tpl-fw', 'tpl-nms', '1 Gbps')
  }
  return { nodes, edges }
}

export function createTopologyTemplate(id: TopologyTemplateId): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  return build(id)
}
