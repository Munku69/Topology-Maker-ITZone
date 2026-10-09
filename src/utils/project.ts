import type { CableType, ConnectionData, StoredTopologyProject, TopologyProject } from '../types/topology'
import { CABLE_TYPES, DEVICE_TYPES } from '../types/topology'
import { getCableStyle } from '../constants/cables'

export const STORAGE_KEY = 'network-topology-project'
export const PROJECT_LIBRARY_KEY = 'network-topology-projects'

export interface ProjectLibrary {
  version: 1
  activeProjectId: string
  projects: StoredTopologyProject[]
}

export function newProjectId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `project-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createBlankProject(projectName = 'Untitled Network'): StoredTopologyProject {
  const now = new Date().toISOString()
  return { id: newProjectId(), version: 1, projectName, createdAt: now, updatedAt: now, nodes: [], edges: [] }
}

function loadLegacyProject(): TopologyProject | null {
  const value = localStorage.getItem(STORAGE_KEY)
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return validateProject(parsed)
  } catch {
    return null
  }
}

export function saveProjectLibrary(library: ProjectLibrary): void {
  localStorage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(library))
}

export function loadProjectLibrary(): ProjectLibrary {
  const value = localStorage.getItem(PROJECT_LIBRARY_KEY)
  if (value) {
    try {
      const parsed = JSON.parse(value) as Partial<ProjectLibrary>
      if (parsed.version === 1 && Array.isArray(parsed.projects)) {
        const projects = parsed.projects.flatMap((item) => {
          if (!item || typeof item.id !== 'string') return []
          try { return [{ id: item.id, ...validateProject(item) }] }
          catch { return [] }
        })
        if (projects.length) {
          const activeProjectId = projects.some((project) => project.id === parsed.activeProjectId) ? parsed.activeProjectId! : projects[0]!.id
          return { version: 1, activeProjectId, projects }
        }
      }
    } catch {
      // Fall through to legacy migration or a new blank project.
    }
  }

  const legacy = loadLegacyProject()
  const project = legacy ? { id: newProjectId(), ...legacy } : createBlankProject()
  const library: ProjectLibrary = { version: 1, activeProjectId: project.id, projects: [project] }
  saveProjectLibrary(library)
  return library
}

export function validateProject(value: unknown): TopologyProject {
  if (!value || typeof value !== 'object') throw new Error('Project must be an object.')
  const project = value as Partial<TopologyProject>
  if (project.version !== 1 || typeof project.projectName !== 'string' || !Array.isArray(project.nodes) || !Array.isArray(project.edges)) {
    throw new Error('Invalid topology project format.')
  }
  const validTypes = new Set<string>(DEVICE_TYPES)
  for (const node of project.nodes) {
    if (!node || typeof node.id !== 'string' || !node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number' || !node.data || !validTypes.has(String(node.type))) {
      throw new Error('The project contains an invalid device.')
    }
    const data = node.data
    if (!validTypes.has(String(data.deviceType)) || data.deviceType !== node.type || typeof data.name !== 'string' || typeof data.hostname !== 'string' || typeof data.managementIp !== 'string' || typeof data.subnet !== 'string' || typeof data.description !== 'string' || !Array.isArray(data.interfaces)) {
      throw new Error('A device has invalid properties.')
    }
    if (data.zoneColor !== undefined && typeof data.zoneColor !== 'string') throw new Error('A zone has an invalid color.')
    if (data.zoneLineStyle !== undefined && data.zoneLineStyle !== 'solid' && data.zoneLineStyle !== 'dashed') throw new Error('A zone has an invalid border style.')
    if (data.textBackgroundColor !== undefined && typeof data.textBackgroundColor !== 'string') throw new Error('A text box has an invalid background color.')
    if (data.textBackgroundStyle !== undefined && data.textBackgroundStyle !== 'filled' && data.textBackgroundStyle !== 'transparent') throw new Error('A text box has an invalid background style.')
    if (data.textColor !== undefined && typeof data.textColor !== 'string') throw new Error('A text box has an invalid text color.')
    for (const item of data.interfaces) {
      if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.ip !== 'string' || typeof item.vlan !== 'string' || typeof item.role !== 'string' || typeof item.description !== 'string') {
        throw new Error('A device has an invalid interface.')
      }
    }
  }
  const nodeIds = new Set(project.nodes.map((node) => node.id))
  const validCableTypes = new Set<string>(CABLE_TYPES)
  for (const edge of project.edges) {
    if (!edge || typeof edge.id !== 'string' || typeof edge.source !== 'string' || typeof edge.target !== 'string' || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error('The project contains an invalid connection.')
    }
    if (edge.data && (typeof edge.data.sourceInterface !== 'string' || typeof edge.data.targetInterface !== 'string' || typeof edge.data.description !== 'string')) throw new Error('A connection has invalid properties.')
    if (edge.data?.cableType !== undefined && !validCableTypes.has(String(edge.data.cableType))) throw new Error('A connection has an invalid cable type.')
  }
  const edges = project.edges.map((edge) => {
    const cableType: CableType = edge.data?.cableType && validCableTypes.has(edge.data.cableType) ? edge.data.cableType : 'copper-straight'
    const data: ConnectionData = {
      cableType,
      sourceInterface: edge.data?.sourceInterface ?? '',
      targetInterface: edge.data?.targetInterface ?? '',
      description: edge.data?.description ?? '',
    }
    return {
      ...edge,
      type: edge.type ?? 'smoothstep',
      sourceHandle: edge.sourceHandle ?? 'right',
      targetHandle: edge.targetHandle ?? 'left',
      data,
      label: [data.sourceInterface, data.targetInterface].filter(Boolean).join(' ↔ '),
      style: getCableStyle(cableType),
    }
  })
  return {
    version: 1,
    projectName: project.projectName,
    createdAt: typeof project.createdAt === 'string' ? project.createdAt : new Date().toISOString(),
    updatedAt: typeof project.updatedAt === 'string' ? project.updatedAt : new Date().toISOString(),
    nodes: project.nodes,
    edges,
  }
}

export function safeFilename(name: string): string {
  return (name.trim() || 'untitled-network').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function downloadJson(project: TopologyProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeFilename(project.projectName)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
