import { getCableStyle } from '../constants/cables'
import { createDeviceData, newId } from '../constants/devices'
import type { DeviceData, DeviceType, LinkSpeed, TopologyEdge, TopologyNode } from '../types/topology'
import { suggestConnection } from './automation'

export type CompanySize = 'small' | 'medium' | 'large'
export type WifiRequirement = 'none' | 'standard' | 'high-density'

export interface TopologyWizardOptions {
  companyName: string
  companySize: CompanySize
  officeCount: number
  internetConnections: number
  firewallHa: boolean
  serverCount: number
  wifi: WifiRequirement
  coreSpeed: LinkSpeed
}

export function buildTopologyFromWizard(options: TopologyWizardOptions): { projectName: string; nodes: TopologyNode[]; edges: TopologyEdge[] } {
  const nodes: TopologyNode[] = []
  const edges: TopologyEdge[] = []
  const officeWidth = options.companySize === 'large' ? 680 : 580
  const officeGap = 90
  const endpointCount = options.companySize === 'small' ? 1 : options.companySize === 'medium' ? 2 : 4
  const apCount = options.wifi === 'none' ? 0 : options.wifi === 'standard' ? 1 : options.companySize === 'large' ? 3 : 2
  const serverRows = Math.ceil(options.serverCount / 4)
  const officeHeight = 760 + serverRows * 145

  const addNode = (type: DeviceType, x: number, y: number, name: string, managementIp = '', patch: Partial<DeviceData> = {}) => {
    const id = newId('device')
    nodes.push({ id, type, position: { x, y }, data: { ...createDeviceData(type), ...patch, deviceType: type, name, hostname: name, managementIp } })
    return id
  }

  const addZone = (x: number, name: string, color: string) => {
    const id = newId('zone')
    nodes.push({
      id, type: 'zone', position: { x, y: 145 }, width: officeWidth, height: officeHeight,
      data: { ...createDeviceData('zone'), deviceType: 'zone', name, hostname: name, zoneColor: color, zoneLineStyle: 'dashed' },
    })
  }

  const addEdge = (sourceId: string, targetId: string, override: Partial<NonNullable<TopologyEdge['data']>> = {}) => {
    const source = nodes.find((node) => node.id === sourceId)!
    const target = nodes.find((node) => node.id === targetId)!
    const suggestion = suggestConnection(source, target, edges)
    const data = {
      cableType: suggestion.cableType,
      color: suggestion.color,
      speed: suggestion.speed,
      purpose: suggestion.purpose,
      showCableType: true,
      pathStyle: 'straight' as const,
      sourceInterface: suggestion.sourceInterface,
      targetInterface: suggestion.targetInterface,
      description: '',
      ...override,
    }
    edges.push({ id: newId('edge'), source: sourceId, target: targetId, sourceHandle: 'bottom', targetHandle: 'top', type: 'parallelCable', data, style: getCableStyle(data.cableType, data.color) })
  }

  const totalWidth = options.officeCount * officeWidth + Math.max(0, options.officeCount - 1) * officeGap
  const ispIds = Array.from({ length: options.internetConnections }, (_, index) => addNode('isp', totalWidth / 2 - 130 + index * 260, -30, `ISP-${String(index + 1).padStart(2, '0')}`))

  for (let officeIndex = 0; officeIndex < options.officeCount; officeIndex += 1) {
    const baseX = officeIndex * (officeWidth + officeGap)
    const officeCode = officeIndex === 0 ? 'HQ' : `BR${String(officeIndex).padStart(2, '0')}`
    const zoneColor = officeIndex === 0 ? '#0ea5e9' : ['#22c55e', '#a78bfa', '#f59e0b', '#ec4899'][officeIndex % 4]!
    addZone(baseX, `${officeCode} Office Zone`, zoneColor)

    const firewallIds = Array.from({ length: options.firewallHa ? 2 : 1 }, (_, index) => addNode(
      'firewall',
      baseX + officeWidth / 2 - (options.firewallHa ? 140 : 56) + index * 170,
      205,
      `${officeCode}-FW-${String(index + 1).padStart(2, '0')}`,
      `10.${officeIndex + 1}.0.${index + 1}/24`,
    ))
    const coreId = addNode('switch', baseX + officeWidth / 2 - 56, 385, `${officeCode}-CORE-01`, `10.${officeIndex + 1}.0.10/24`)

    ispIds.forEach((ispId) => firewallIds.forEach((firewallId) => addEdge(ispId, firewallId, { purpose: 'WAN', speed: '1 Gbps' })))
    firewallIds.forEach((firewallId) => addEdge(firewallId, coreId, { purpose: 'Uplink', speed: options.coreSpeed, cableType: 'fiber', color: '#a78bfa' }))
    if (firewallIds.length === 2) addEdge(firewallIds[0]!, firewallIds[1]!, { purpose: 'HA', speed: '10 Gbps', cableType: 'copper-crossover', color: '#f59e0b' })

    for (let endpointIndex = 0; endpointIndex < endpointCount; endpointIndex += 1) {
      const type: DeviceType = endpointIndex % 2 === 0 ? 'pc' : 'laptop'
      const endpointId = addNode(type, baseX + 35 + endpointIndex * 135, 565, `${officeCode}-${type === 'pc' ? 'PC' : 'LAP'}-${String(endpointIndex + 1).padStart(2, '0')}`, `10.${officeIndex + 1}.10.${20 + endpointIndex}/24`)
      addEdge(coreId, endpointId, { purpose: 'LAN', speed: '1 Gbps' })
    }

    for (let apIndex = 0; apIndex < apCount; apIndex += 1) {
      const apId = addNode('access-point', baseX + officeWidth - 145 - apIndex * 130, 565, `${officeCode}-AP-${String(apIndex + 1).padStart(2, '0')}`, `10.${officeIndex + 1}.30.${10 + apIndex}/24`)
      addEdge(coreId, apId, { purpose: 'LAN', speed: '1 Gbps' })
    }

    if (officeIndex === 0) {
      const serverTypes: DeviceType[] = ['server', 'web-server', 'app-server', 'db-server', 'file-server', 'dns-server']
      for (let serverIndex = 0; serverIndex < options.serverCount; serverIndex += 1) {
        const serverId = addNode(serverTypes[serverIndex % serverTypes.length]!, baseX + 35 + (serverIndex % 4) * 145, 720 + Math.floor(serverIndex / 4) * 145, `HQ-SRV-${String(serverIndex + 1).padStart(2, '0')}`, `10.1.20.${10 + serverIndex}/24`)
        addEdge(coreId, serverId, { purpose: 'LAN', speed: options.coreSpeed, cableType: options.coreSpeed === '1 Gbps' ? 'copper-straight' : 'fiber', color: options.coreSpeed === '1 Gbps' ? '#38bdf8' : '#a78bfa' })
      }
      if (options.companySize !== 'small') {
        const monitorId = addNode('network-monitor', baseX + officeWidth - 145, 720 + serverRows * 145, 'HQ-NMS-01', '10.1.50.10/24')
        addEdge(coreId, monitorId, { purpose: 'Management', speed: '1 Gbps' })
      }
    }
  }

  return { projectName: `${options.companyName.trim() || 'Company'} Network`, nodes, edges }
}
