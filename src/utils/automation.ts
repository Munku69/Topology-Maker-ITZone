import type { TopologyEdge, TopologyNode } from '../types/topology'

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface TopologyIssue {
  id: string
  severity: IssueSeverity
  title: string
  detail: string
  nodeId?: string
  edgeId?: string
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
    if ((degree.get(node.id) ?? 0) === 0) issues.push({ id: `disconnected:${node.id}`, severity: 'warning', title: `${node.data.name} is disconnected`, detail: 'This device has no cable connected.', nodeId: node.id })
    if (!node.data.managementIp) issues.push({ id: `mgmt-missing:${node.id}`, severity: 'info', title: `${node.data.name} has no management IP`, detail: 'Add an address if this device should appear in the IP inventory.', nodeId: node.id })
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

  const order: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 }
  return issues.sort((a, b) => order[a.severity] - order[b.severity] || a.title.localeCompare(b.title))
}
