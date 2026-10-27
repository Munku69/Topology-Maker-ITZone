import { getCableStyle } from '../constants/cables'
import { newId } from '../constants/devices'
import type { CableType, ConnectionData, DeviceType, LinkPurpose, LinkSpeed, TopologyEdge, TopologyNode } from '../types/topology'

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface TopologyIssue {
  id: string
  severity: IssueSeverity
  title: string
  detail: string
  nodeId?: string
  edgeId?: string
  fix?: TopologyFixKind
}

export type TopologyFixKind = 'assign-ip' | 'rename-duplicate' | 'move-overlap' | 'separate-cables' | 'connect-device' | 'add-ha-link' | 'place-in-zone'
export type LayoutPreset = 'hierarchical' | 'core-access' | 'internet-users' | 'branch' | 'data-center' | 'inside-zones'

export interface SmartConnectionSuggestion {
  cableType: CableType
  color: string
  speed: LinkSpeed
  purpose: LinkPurpose
  sourceInterface: string
  targetInterface: string
  reason: string
}

const SPECIAL_TYPES = new Set(['zone', 'text-box'])
const FALLBACK_RANK: Record<string, number> = {
  isp: 0,
  router: 1,
  firewall: 1,
  'ddos-protection': 1,
  'l2-switch': 2,
  switch: 2,
  'access-point': 3,
  'load-balancer': 3,
}

export function calculateAutoLayout(nodes: TopologyNode[], edges: TopologyEdge[]): Map<string, { x: number; y: number }> {
  const selected = nodes.filter((node) => node.selected && !SPECIAL_TYPES.has(node.data.deviceType))
  const targets = selected.length >= 2 ? selected : nodes.filter((node) => !SPECIAL_TYPES.has(node.data.deviceType))
  if (targets.length < 2) return new Map()

  const ids = new Set(targets.map((node) => node.id))
  const incoming = new Map(targets.map((node) => [node.id, 0]))
  const children = new Map(targets.map((node) => [node.id, [] as string[]]))
  edges.forEach((edge) => {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) return
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
    children.get(edge.source)?.push(edge.target)
  })

  const level = new Map<string, number>()
  const queue = targets.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id)
  queue.forEach((id) => level.set(id, 0))
  while (queue.length) {
    const id = queue.shift()!
    const currentLevel = level.get(id) ?? 0
    children.get(id)?.forEach((child) => {
      level.set(child, Math.max(level.get(child) ?? 0, currentLevel + 1))
      incoming.set(child, (incoming.get(child) ?? 1) - 1)
      if (incoming.get(child) === 0) queue.push(child)
    })
  }

  targets.forEach((node) => {
    if (!level.has(node.id)) level.set(node.id, FALLBACK_RANK[node.data.deviceType] ?? 3)
  })
  const uniqueLevels = [...new Set(level.values())].sort((a, b) => a - b)
  const normalized = new Map(uniqueLevels.map((value, index) => [value, index]))
  const rows = new Map<number, TopologyNode[]>()
  targets.forEach((node) => {
    const row = normalized.get(level.get(node.id) ?? 0) ?? 0
    rows.set(row, [...(rows.get(row) ?? []), node])
  })

  const minX = Math.min(...targets.map((node) => node.position.x))
  const maxX = Math.max(...targets.map((node) => node.position.x + (node.measured?.width ?? node.width ?? 112)))
  const minY = Math.min(...targets.map((node) => node.position.y))
  const centerX = (minX + maxX) / 2
  const columnGap = 210
  const rowGap = 190
  const positions = new Map<string, { x: number; y: number }>()
  ;[...rows.entries()].sort(([a], [b]) => a - b).forEach(([row, rowNodes]) => {
    const ordered = [...rowNodes].sort((a, b) => a.position.x - b.position.x || a.data.name.localeCompare(b.data.name))
    const rowWidth = (ordered.length - 1) * columnGap
    ordered.forEach((node, index) => positions.set(node.id, { x: centerX - rowWidth / 2 - 56 + index * columnGap, y: minY + row * rowGap }))
  })
  return positions
}

const TYPE_GROUPS = {
  internet: new Set<DeviceType>(['isp']),
  security: new Set<DeviceType>(['firewall', 'ddos-protection', 'waf']),
  core: new Set<DeviceType>(['router', 'switch', 'load-balancer']),
  access: new Set<DeviceType>(['l2-switch', 'access-point']),
  server: new Set<DeviceType>(['server', 'web-server', 'dns-server', 'app-server', 'db-server', 'file-server', 'mail-server', 'storage-server']),
  endpoint: new Set<DeviceType>(['pc', 'laptop', 'mobile', 'ip-camera', 'ip-phone']),
}

function rankForPreset(type: DeviceType, preset: LayoutPreset): number {
  if (preset === 'data-center') {
    if (TYPE_GROUPS.internet.has(type)) return 0
    if (type === 'ddos-protection' || type === 'firewall') return 1
    if (type === 'load-balancer' || type === 'waf') return 2
    if (TYPE_GROUPS.server.has(type)) return 3
    return 4
  }
  if (TYPE_GROUPS.internet.has(type)) return 0
  if (TYPE_GROUPS.security.has(type)) return 1
  if (TYPE_GROUPS.core.has(type)) return 2
  if (TYPE_GROUPS.access.has(type)) return 3
  if (TYPE_GROUPS.server.has(type)) return preset === 'core-access' ? 3 : 4
  if (TYPE_GROUPS.endpoint.has(type)) return 4
  return 3
}

function arrangeRows(targets: TopologyNode[], preset: LayoutPreset, origin: { x: number; y: number }, width = 900): Map<string, { x: number; y: number }> {
  const rows = new Map<number, TopologyNode[]>()
  targets.forEach((node) => {
    const rank = rankForPreset(node.data.deviceType, preset)
    rows.set(rank, [...(rows.get(rank) ?? []), node])
  })
  const positions = new Map<string, { x: number; y: number }>()
  const activeRows = [...rows.entries()].sort(([a], [b]) => a - b)
  activeRows.forEach(([, rowNodes], rowIndex) => {
    const ordered = [...rowNodes].sort((a, b) => a.data.name.localeCompare(b.data.name))
    const gap = Math.min(210, width / Math.max(1, ordered.length))
    const rowWidth = (ordered.length - 1) * gap
    ordered.forEach((node, index) => positions.set(node.id, { x: origin.x + width / 2 - rowWidth / 2 - 56 + index * gap, y: origin.y + rowIndex * 185 }))
  })
  return positions
}

function nodeSize(node: TopologyNode): { width: number; height: number } {
  return { width: node.measured?.width ?? node.width ?? 112, height: node.measured?.height ?? node.height ?? 112 }
}

function insideZone(node: TopologyNode, zone: TopologyNode): boolean {
  const size = nodeSize(node)
  const zoneDimensions = nodeSize(zone)
  const centerX = node.position.x + size.width / 2
  const centerY = node.position.y + size.height / 2
  return centerX >= zone.position.x && centerX <= zone.position.x + zoneDimensions.width
    && centerY >= zone.position.y && centerY <= zone.position.y + zoneDimensions.height
}

export function calculatePresetLayout(
  nodes: TopologyNode[],
  edges: TopologyEdge[],
  preset: LayoutPreset,
  options: { selectedOnly?: boolean; keepSelectedLocked?: boolean } = {},
): Map<string, { x: number; y: number }> {
  const devices = nodes.filter((node) => !SPECIAL_TYPES.has(node.data.deviceType))
  const selected = devices.filter((node) => node.selected)
  const targets = options.selectedOnly && selected.length ? selected : devices
  const lockedIds = options.keepSelectedLocked ? new Set(selected.map((node) => node.id)) : new Set<string>()
  const movable = targets.filter((node) => !lockedIds.has(node.id))
  if (movable.length < 1) return new Map()

  if (preset === 'hierarchical') {
    if (movable.length < 2) return new Map()
    const base = calculateAutoLayout(options.selectedOnly ? nodes.map((node) => ({ ...node, selected: movable.some((item) => item.id === node.id) })) : nodes, edges)
    lockedIds.forEach((id) => base.delete(id))
    return base
  }

  if (preset === 'inside-zones') {
    const positions = new Map<string, { x: number; y: number }>()
    const zones = nodes.filter((node) => node.data.deviceType === 'zone')
    zones.forEach((zone) => {
      const members = movable.filter((node) => insideZone(node, zone))
      if (!members.length) return
      const size = nodeSize(zone)
      const columns = Math.max(1, Math.floor((size.width - 70) / 160))
      members.forEach((node, index) => positions.set(node.id, {
        x: zone.position.x + 40 + (index % columns) * 155,
        y: zone.position.y + 55 + Math.floor(index / columns) * 155,
      }))
    })
    return positions
  }

  if (preset === 'branch') {
    const groups = new Map<string, TopologyNode[]>()
    movable.forEach((node) => {
      const match = node.data.name.toUpperCase().match(/^(HQ|BR(?:ANCH)?[-_ ]?\d*|OFFICE[-_ ]?\d*)/)
      const key = match?.[1] || 'HQ'
      groups.set(key, [...(groups.get(key) ?? []), node])
    })
    const positions = new Map<string, { x: number; y: number }>()
    ;[...groups.entries()].forEach(([, group], index) => {
      const arranged = arrangeRows(group, 'internet-users', { x: index * 700, y: 20 }, 560)
      arranged.forEach((position, id) => positions.set(id, position))
    })
    return positions
  }

  const minX = Math.min(...movable.map((node) => node.position.x))
  const minY = Math.min(...movable.map((node) => node.position.y))
  return arrangeRows(movable, preset, { x: minX, y: minY }, Math.max(760, Math.min(1500, movable.length * 145)))
}

function unusedInterface(node: TopologyNode, edges: TopologyEdge[], preferredRoles: string[]): string {
  const used = new Set<string>()
  edges.forEach((edge) => {
    if (edge.source === node.id && edge.data?.sourceInterface) used.add(edge.data.sourceInterface)
    if (edge.target === node.id && edge.data?.targetInterface) used.add(edge.data.targetInterface)
  })
  const available = node.data.interfaces.filter((item) => item.name.trim() && !used.has(item.name))
  return available.find((item) => preferredRoles.some((role) => item.role.toLowerCase().includes(role)))?.name ?? available[0]?.name ?? ''
}

export function suggestConnection(source: TopologyNode, target: TopologyNode, edges: TopologyEdge[]): SmartConnectionSuggestion {
  const pair = new Set([source.data.deviceType, target.data.deviceType])
  let cableType: CableType = 'copper-straight'
  let speed: LinkSpeed = '1 Gbps'
  let purpose: LinkPurpose = 'LAN'
  let roles = ['lan', 'access']
  let reason = 'Standard LAN connection'

  if (pair.has('isp')) {
    purpose = 'WAN'; roles = ['wan', 'internet']; reason = 'Internet edge connection'
  } else if (source.data.deviceType === 'firewall' && target.data.deviceType === 'firewall') {
    cableType = 'copper-crossover'; speed = '10 Gbps'; purpose = 'HA'; roles = ['ha', 'sync', 'lan']; reason = 'Firewall high-availability link'
  } else if ((TYPE_GROUPS.core.has(source.data.deviceType) && TYPE_GROUPS.core.has(target.data.deviceType)) || (source.data.deviceType === 'switch' && target.data.deviceType === 'l2-switch') || (source.data.deviceType === 'l2-switch' && target.data.deviceType === 'switch')) {
    cableType = 'fiber'; speed = '10 Gbps'; purpose = 'Trunk'; roles = ['trunk', 'uplink']; reason = 'High-speed switching trunk'
  } else if (pair.has('firewall') && (pair.has('switch') || pair.has('l2-switch') || pair.has('router'))) {
    cableType = 'fiber'; speed = '10 Gbps'; purpose = 'Uplink'; roles = ['lan', 'trunk', 'uplink']; reason = 'Firewall-to-core uplink'
  } else if ((pair.has('switch') || pair.has('l2-switch')) && [...pair].some((type) => TYPE_GROUPS.server.has(type))) {
    cableType = 'fiber'; speed = '10 Gbps'; purpose = 'LAN'; roles = ['lan', 'access']; reason = 'Server access link'
  } else if (pair.has('access-point')) {
    purpose = 'LAN'; roles = ['lan', 'access']; reason = 'Access-point uplink'
  }

  const color = cableType === 'fiber' ? '#a78bfa' : cableType === 'copper-crossover' ? '#f59e0b' : '#38bdf8'
  return {
    cableType, color, speed, purpose, reason,
    sourceInterface: unusedInterface(source, edges, roles),
    targetInterface: unusedInterface(target, edges, roles),
  }
}

function validAddress(value: string): boolean {
  if (!value || value.toUpperCase() === 'DHCP') return true
  const match = value.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/)
  if (!match) return false
  const octetsValid = match.slice(1, 5).every((part) => Number(part) <= 255)
  return octetsValid && (match[5] === undefined || Number(match[5]) <= 32)
}

export function validateTopology(nodes: TopologyNode[], edges: TopologyEdge[]): TopologyIssue[] {
  const issues: TopologyIssue[] = []
  const devices = nodes.filter((node) => !SPECIAL_TYPES.has(node.data.deviceType))
  const degree = new Map(devices.map((node) => [node.id, 0]))
  const addressOwners = new Map<string, Array<{ nodeId: string; label: string }>>()
  const usedPorts = new Map<string, string[]>()

  edges.forEach((edge) => {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
    if (edge.data?.speed === 'Auto' || !edge.data?.speed) issues.push({ id: `speed:${edge.id}`, severity: 'info', title: 'Cable speed is automatic', detail: 'Choose a link speed if it should appear in documentation and the legend.', edgeId: edge.id })
    ;([[edge.source, edge.data?.sourceInterface], [edge.target, edge.data?.targetInterface]] as const).forEach(([nodeId, port]) => {
      if (!port) return
      const key = `${nodeId}:${port.toLowerCase()}`
      usedPorts.set(key, [...(usedPorts.get(key) ?? []), edge.id])
    })
  })

  devices.forEach((node) => {
    if ((degree.get(node.id) ?? 0) === 0) issues.push({ id: `disconnected:${node.id}`, severity: 'warning', title: `${node.data.name} is disconnected`, detail: 'This device has no cable connected.', nodeId: node.id, fix: 'connect-device' })
    if (!node.data.managementIp) issues.push({ id: `mgmt-missing:${node.id}`, severity: 'info', title: `${node.data.name} has no management IP`, detail: 'Add an address if this device should appear in the IP inventory.', nodeId: node.id, fix: 'assign-ip' })
    if (node.data.managementIp && !validAddress(node.data.managementIp)) issues.push({ id: `mgmt-invalid:${node.id}`, severity: 'error', title: `${node.data.name} has an invalid management IP`, detail: node.data.managementIp, nodeId: node.id })

    const addresses = [{ value: node.data.managementIp, label: 'Management IP' }, ...node.data.interfaces.map((item) => ({ value: item.ip, label: item.name || 'Interface' }))]
    addresses.forEach(({ value, label }) => {
      if (!value || value.toUpperCase() === 'DHCP') return
      if (!validAddress(value)) {
        if (label !== 'Management IP') issues.push({ id: `ip-invalid:${node.id}:${label}`, severity: 'error', title: `${node.data.name} has an invalid interface address`, detail: `${label}: ${value}`, nodeId: node.id })
        return
      }
      const normalized = value.split('/')[0]!
      addressOwners.set(normalized, [...(addressOwners.get(normalized) ?? []), { nodeId: node.id, label: `${node.data.name} ${label}` }])
    })
  })

  addressOwners.forEach((owners, address) => {
    const uniqueDevices = new Set(owners.map((owner) => owner.nodeId))
    if (owners.length < 2 || uniqueDevices.size < 2) return
    owners.forEach((owner) => issues.push({ id: `duplicate:${address}:${owner.nodeId}`, severity: 'error', title: `Duplicate IP address ${address}`, detail: owners.map((item) => item.label).join(' and '), nodeId: owner.nodeId }))
  })

  usedPorts.forEach((edgeIds, key) => {
    if (edgeIds.length < 2) return
    const [nodeId, port] = key.split(':')
    const node = devices.find((item) => item.id === nodeId)
    issues.push({ id: `port:${key}`, severity: 'warning', title: `${node?.data.name ?? 'Device'} ${port} is reused`, detail: `${edgeIds.length} cables use the same interface.`, nodeId, edgeId: edgeIds[0] })
  })

  const names = new Map<string, TopologyNode[]>()
  devices.forEach((node) => {
    const key = node.data.name.trim().toLowerCase()
    if (key) names.set(key, [...(names.get(key) ?? []), node])
  })
  names.forEach((matching) => matching.slice(1).forEach((node) => issues.push({ id: `name:${node.id}`, severity: 'warning', title: `Duplicate device name ${node.data.name}`, detail: 'Device names should be unique for clear documentation.', nodeId: node.id, fix: 'rename-duplicate' })))

  for (let index = 0; index < devices.length; index += 1) {
    const first = devices[index]!
    const firstSize = nodeSize(first)
    for (let otherIndex = index + 1; otherIndex < devices.length; otherIndex += 1) {
      const second = devices[otherIndex]!
      const secondSize = nodeSize(second)
      const overlap = first.position.x < second.position.x + secondSize.width
        && first.position.x + firstSize.width > second.position.x
        && first.position.y < second.position.y + secondSize.height
        && first.position.y + firstSize.height > second.position.y
      if (overlap) issues.push({ id: `overlap:${first.id}:${second.id}`, severity: 'warning', title: `${second.data.name} overlaps another device`, detail: `Move it away from ${first.data.name}.`, nodeId: second.id, fix: 'move-overlap' })
    }
  }

  const parallelGroups = new Map<string, TopologyEdge[]>()
  edges.forEach((edge) => {
    const key = [edge.source, edge.target].sort().join(':')
    parallelGroups.set(key, [...(parallelGroups.get(key) ?? []), edge])
  })
  parallelGroups.forEach((matching) => {
    if (matching.length < 2 || matching.some((edge) => edge.data?.curveOffset)) return
    issues.push({ id: `parallel:${matching[0]!.id}`, severity: 'info', title: 'Parallel cables share the same route', detail: `${matching.length} cables can be separated automatically.`, edgeId: matching[0]!.id, fix: 'separate-cables' })
  })

  const firewalls = devices.filter((node) => node.data.deviceType === 'firewall')
  if (firewalls.length >= 2) {
    const hasHaLink = edges.some((edge) => firewalls.some((node) => node.id === edge.source) && firewalls.some((node) => node.id === edge.target) && edge.data?.purpose === 'HA')
    if (!hasHaLink) issues.push({ id: 'missing-ha', severity: 'warning', title: 'Firewall HA link is missing', detail: 'Connect the first firewall pair with a dedicated HA link.', nodeId: firewalls[0]!.id, fix: 'add-ha-link' })
  }

  const zones = nodes.filter((node) => node.data.deviceType === 'zone')
  if (zones.length) devices.filter((node) => node.data.deviceType !== 'isp').forEach((node) => {
    if (!zones.some((zone) => insideZone(node, zone))) issues.push({ id: `unzoned:${node.id}`, severity: 'info', title: `${node.data.name} is outside every zone`, detail: 'Place it into the most suitable existing zone.', nodeId: node.id, fix: 'place-in-zone' })
  })

  const order: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 }
  return issues.sort((a, b) => order[a.severity] - order[b.severity] || a.title.localeCompare(b.title))
}

function nextManagementIp(nodes: TopologyNode[]): string {
  const used = new Set(nodes.map((node) => node.data.managementIp.split('/')[0]).filter(Boolean))
  for (let third = 0; third < 255; third += 1) {
    for (let fourth = 2; fourth < 255; fourth += 1) {
      const address = `10.255.${third}.${fourth}`
      if (!used.has(address)) return `${address}/24`
    }
  }
  return '10.255.255.254/24'
}

function makeRecommendedEdge(source: TopologyNode, target: TopologyNode, edges: TopologyEdge[], override: Partial<ConnectionData> = {}): TopologyEdge {
  const suggestion = suggestConnection(source, target, edges)
  const data: ConnectionData = {
    cableType: suggestion.cableType,
    color: suggestion.color,
    speed: suggestion.speed,
    purpose: suggestion.purpose,
    showCableType: true,
    pathStyle: 'straight',
    sourceInterface: suggestion.sourceInterface,
    targetInterface: suggestion.targetInterface,
    description: '',
    ...override,
  }
  return { id: newId('edge'), source: source.id, target: target.id, sourceHandle: 'bottom', targetHandle: 'top', type: 'parallelCable', data, style: getCableStyle(data.cableType, data.color) }
}

function preferredZone(node: TopologyNode, zones: TopologyNode[]): TopologyNode | undefined {
  const type = node.data.deviceType
  const terms = TYPE_GROUPS.server.has(type) ? ['server', 'data', 'dmz']
    : TYPE_GROUPS.endpoint.has(type) || type === 'access-point' ? ['office', 'user', 'branch', 'lan']
    : TYPE_GROUPS.security.has(type) || type === 'isp' ? ['edge', 'security', 'wan', 'internet']
    : ['network', 'core', 'hq']
  const nodePrefix = node.data.name.toLowerCase().split(/[-_ ]/)[0] ?? ''
  return zones.find((zone) => terms.some((term) => zone.data.name.toLowerCase().includes(term)))
    ?? zones.find((zone) => nodePrefix && zone.data.name.toLowerCase().includes(nodePrefix))
    ?? zones[0]
}

export function applyTopologyFix(nodes: TopologyNode[], edges: TopologyEdge[], issue: TopologyIssue): { nodes: TopologyNode[]; edges: TopologyEdge[]; changed: boolean } {
  if (!issue.fix) return { nodes, edges, changed: false }
  let nextNodes = structuredClone(nodes)
  let nextEdges = structuredClone(edges)
  const target = issue.nodeId ? nextNodes.find((node) => node.id === issue.nodeId) : undefined

  if (issue.fix === 'assign-ip' && target) {
    target.data.managementIp = nextManagementIp(nextNodes)
    return { nodes: nextNodes, edges: nextEdges, changed: true }
  }

  if (issue.fix === 'rename-duplicate' && target) {
    const used = new Set(nextNodes.filter((node) => node.id !== target.id).map((node) => node.data.name.toLowerCase()))
    const base = target.data.name.replace(/-\d+$/, '') || 'DEVICE'
    let index = 2
    let name = `${base}-${String(index).padStart(2, '0')}`
    while (used.has(name.toLowerCase())) name = `${base}-${String(++index).padStart(2, '0')}`
    target.data.name = name
    target.data.hostname = name
    return { nodes: nextNodes, edges: nextEdges, changed: true }
  }

  if (issue.fix === 'move-overlap' && target) {
    const others = nextNodes.filter((node) => node.id !== target.id && !SPECIAL_TYPES.has(node.data.deviceType))
    let position = { ...target.position }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      position = { x: position.x + 145, y: position.y + (attempt % 2 === 0 ? 45 : -45) }
      const candidate = { ...target, position }
      if (!others.some((node) => {
        const size = nodeSize(node); const candidateSize = nodeSize(candidate)
        return candidate.position.x < node.position.x + size.width && candidate.position.x + candidateSize.width > node.position.x
          && candidate.position.y < node.position.y + size.height && candidate.position.y + candidateSize.height > node.position.y
      })) break
    }
    target.position = position
    return { nodes: nextNodes, edges: nextEdges, changed: true }
  }

  if (issue.fix === 'separate-cables' && issue.edgeId) {
    const reference = nextEdges.find((edge) => edge.id === issue.edgeId)
    if (!reference) return { nodes, edges, changed: false }
    const group = nextEdges.filter((edge) => (edge.source === reference.source && edge.target === reference.target) || (edge.source === reference.target && edge.target === reference.source))
    group.forEach((edge, index) => {
      const direction = index % 2 === 0 ? -1 : 1
      edge.data = { ...edge.data!, pathStyle: 'curved', curveOffset: { x: 0, y: direction * (28 + Math.floor(index / 2) * 22) } }
    })
    return { nodes: nextNodes, edges: nextEdges, changed: group.length > 1 }
  }

  if (issue.fix === 'connect-device' && target) {
    const candidates = nextNodes.filter((node) => node.id !== target.id && !SPECIAL_TYPES.has(node.data.deviceType) && (TYPE_GROUPS.core.has(node.data.deviceType) || TYPE_GROUPS.access.has(node.data.deviceType) || node.data.deviceType === 'firewall'))
    const nearest = candidates.sort((a, b) => Math.hypot(a.position.x - target.position.x, a.position.y - target.position.y) - Math.hypot(b.position.x - target.position.x, b.position.y - target.position.y))[0]
    if (!nearest) return { nodes, edges, changed: false }
    nextEdges.push(makeRecommendedEdge(nearest, target, nextEdges))
    return { nodes: nextNodes, edges: nextEdges, changed: true }
  }

  if (issue.fix === 'add-ha-link') {
    const firewalls = nextNodes.filter((node) => node.data.deviceType === 'firewall')
    if (firewalls.length < 2) return { nodes, edges, changed: false }
    nextEdges.push(makeRecommendedEdge(firewalls[0]!, firewalls[1]!, nextEdges, { purpose: 'HA', speed: '10 Gbps', cableType: 'copper-crossover', color: '#f59e0b' }))
    return { nodes: nextNodes, edges: nextEdges, changed: true }
  }

  if (issue.fix === 'place-in-zone' && target) {
    const zones = nextNodes.filter((node) => node.data.deviceType === 'zone')
    const zone = preferredZone(target, zones)
    if (!zone) return { nodes, edges, changed: false }
    const members = nextNodes.filter((node) => node.id !== target.id && !SPECIAL_TYPES.has(node.data.deviceType) && insideZone(node, zone))
    const zoneDimensions = nodeSize(zone)
    const columns = Math.max(1, Math.floor((zoneDimensions.width - 70) / 150))
    target.position = { x: zone.position.x + 35 + (members.length % columns) * 145, y: zone.position.y + 55 + Math.floor(members.length / columns) * 145 }
    return { nodes: nextNodes, edges: nextEdges, changed: true }
  }

  return { nodes, edges, changed: false }
}

export function fixAllTopologyIssues(nodes: TopologyNode[], edges: TopologyEdge[]): { nodes: TopologyNode[]; edges: TopologyEdge[]; fixed: number } {
  let currentNodes = nodes
  let currentEdges = edges
  let fixed = 0
  const attempted = new Set<string>()
  for (let pass = 0; pass < 100; pass += 1) {
    const issue = validateTopology(currentNodes, currentEdges).find((item) => item.fix && !attempted.has(item.id))
    if (!issue) break
    attempted.add(issue.id)
    const result = applyTopologyFix(currentNodes, currentEdges, issue)
    if (result.changed) {
      currentNodes = result.nodes
      currentEdges = result.edges
      fixed += 1
    }
  }
  return { nodes: currentNodes, edges: currentEdges, fixed }
}
