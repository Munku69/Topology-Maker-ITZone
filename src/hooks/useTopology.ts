import { useCallback, useEffect, useRef, useState } from 'react'
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react'
import { createDeviceData, newId } from '../constants/devices'
import { getCableStyle } from '../constants/cables'
import { createBlankProject, loadProjectLibrary, newProjectId, saveProjectLibrary, type ProjectLibrary } from '../utils/project'
import type { ConnectionData, DeviceData, DeviceInterface, DeviceType, ProjectSummary, SaveState, StoredTopologyProject, TopologyEdge, TopologyNode, TopologyProject, ZoneLineStyle } from '../types/topology'

interface TopologySnapshot {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  projectName: string
  createdAt: string
}

const HISTORY_LIMIT = 100
const EDIT_GROUP_WINDOW = 800

export function useTopology() {
  const initialLibrary = useRef(loadProjectLibrary()).current
  const initialProject = initialLibrary.projects.find((project) => project.id === initialLibrary.activeProjectId) ?? initialLibrary.projects[0]!
  const [activeProjectId, setActiveProjectId] = useState(initialProject.id)
  const [projects, setProjects] = useState<StoredTopologyProject[]>(initialLibrary.projects)
  const [nodes, setNodes] = useState<TopologyNode[]>(initialProject.nodes)
  const [edges, setEdges] = useState<TopologyEdge[]>(initialProject.edges)
  const [projectName, setProjectNameState] = useState(initialProject.projectName)
  const [createdAt, setCreatedAt] = useState(initialProject.createdAt)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const firstRender = useRef(true)
  const skipNextAutosave = useRef(false)
  const activeProjectIdRef = useRef(initialProject.id)
  const projectsRef = useRef(initialLibrary.projects)
  const nodesRef = useRef(initialProject.nodes)
  const edgesRef = useRef(initialProject.edges)
  const projectNameRef = useRef(initialProject.projectName)
  const createdAtRef = useRef(initialProject.createdAt)
  const undoStackRef = useRef<TopologySnapshot[]>([])
  const redoStackRef = useRef<TopologySnapshot[]>([])
  const lastHistoryGroupRef = useRef<{ key: string; time: number } | null>(null)
  const nodeInteractionActiveRef = useRef(false)
  const lastNodeRemovalTimeRef = useRef(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])
  useEffect(() => { projectNameRef.current = projectName }, [projectName])
  useEffect(() => { createdAtRef.current = createdAt }, [createdAt])

  const createSnapshot = useCallback((): TopologySnapshot => ({
    nodes: structuredClone(nodesRef.current).map((node) => ({ ...node, selected: false })),
    edges: structuredClone(edgesRef.current).map((edge) => ({ ...edge, selected: false })),
    projectName: projectNameRef.current,
    createdAt: createdAtRef.current,
  }), [])

  const refreshHistoryAvailability = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
  }, [])

  const clearHistory = useCallback(() => {
    undoStackRef.current = []
    redoStackRef.current = []
    lastHistoryGroupRef.current = null
    nodeInteractionActiveRef.current = false
    refreshHistoryAvailability()
  }, [refreshHistoryAvailability])

  const recordHistory = useCallback((groupKey?: string) => {
    const now = Date.now()
    const previousGroup = lastHistoryGroupRef.current
    if (groupKey && previousGroup?.key === groupKey && now - previousGroup.time < EDIT_GROUP_WINDOW) {
      lastHistoryGroupRef.current = { key: groupKey, time: now }
      return
    }
    undoStackRef.current.push(createSnapshot())
    if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift()
    redoStackRef.current = []
    lastHistoryGroupRef.current = groupKey ? { key: groupKey, time: now } : null
    refreshHistoryAvailability()
  }, [createSnapshot, refreshHistoryAvailability])

  const restoreSnapshot = useCallback((snapshot: TopologySnapshot) => {
    const restored = structuredClone(snapshot)
    nodesRef.current = restored.nodes
    edgesRef.current = restored.edges
    projectNameRef.current = restored.projectName
    createdAtRef.current = restored.createdAt
    setNodes(restored.nodes)
    setEdges(restored.edges)
    setProjectNameState(restored.projectName)
    setCreatedAt(restored.createdAt)
    lastHistoryGroupRef.current = null
    nodeInteractionActiveRef.current = false
  }, [])

  const undo = useCallback(() => {
    const snapshot = undoStackRef.current.pop()
    if (!snapshot) return false
    redoStackRef.current.push(createSnapshot())
    restoreSnapshot(snapshot)
    refreshHistoryAvailability()
    return true
  }, [createSnapshot, refreshHistoryAvailability, restoreSnapshot])

  const redo = useCallback(() => {
    const snapshot = redoStackRef.current.pop()
    if (!snapshot) return false
    undoStackRef.current.push(createSnapshot())
    restoreSnapshot(snapshot)
    refreshHistoryAvailability()
    return true
  }, [createSnapshot, refreshHistoryAvailability, restoreSnapshot])

  const getProject = useCallback((): TopologyProject => ({
    version: 1, projectName: projectName.trim() || 'Untitled Network', createdAt, updatedAt: new Date().toISOString(), nodes, edges,
  }), [createdAt, edges, nodes, projectName])

  const writeLibrary = useCallback((nextProjects: StoredTopologyProject[], nextActiveProjectId = activeProjectIdRef.current) => {
    const library: ProjectLibrary = { version: 1, activeProjectId: nextActiveProjectId, projects: nextProjects }
    projectsRef.current = nextProjects
    activeProjectIdRef.current = nextActiveProjectId
    setProjects(nextProjects)
    setActiveProjectId(nextActiveProjectId)
    saveProjectLibrary(library)
  }, [])

  const persistCurrent = useCallback((project = getProject()) => {
    const stored: StoredTopologyProject = { id: activeProjectIdRef.current, ...project, updatedAt: new Date().toISOString() }
    const nextProjects = projectsRef.current.some((item) => item.id === stored.id)
      ? projectsRef.current.map((item) => item.id === stored.id ? stored : item)
      : [...projectsRef.current, stored]
    writeLibrary(nextProjects, stored.id)
    return stored
  }, [getProject, writeLibrary])

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    if (skipNextAutosave.current) { skipNextAutosave.current = false; return }
    setSaveState('unsaved')
    const timer = window.setTimeout(() => {
      setSaveState('saving')
      persistCurrent()
      setSaveState('saved')
    }, 550)
    return () => window.clearTimeout(timer)
  }, [persistCurrent])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState !== 'saved') { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saveState])

  const setProjectName = useCallback((name: string) => {
    recordHistory('project-name')
    setProjectNameState(name)
  }, [recordHistory])
  const onNodesChange = useCallback((changes: NodeChange<TopologyNode>[]) => {
    const hasStructuralChange = changes.some((change) => change.type === 'add' || change.type === 'remove' || change.type === 'replace')
    const hasActiveInteraction = changes.some((change) =>
      (change.type === 'position' && change.dragging === true) ||
      (change.type === 'dimensions' && change.resizing === true),
    )
    const hasFinishedInteraction = changes.some((change) =>
      (change.type === 'position' && change.dragging === false) ||
      (change.type === 'dimensions' && change.resizing === false),
    )
    if (hasStructuralChange) recordHistory()
    if (hasActiveInteraction && !nodeInteractionActiveRef.current) {
      recordHistory()
      nodeInteractionActiveRef.current = true
    }
    const removedIds = new Set(changes.filter((change) => change.type === 'remove').map((change) => change.id))
    if (removedIds.size) lastNodeRemovalTimeRef.current = Date.now()
    setNodes((current) => applyNodeChanges(changes, current))
    if (removedIds.size) setEdges((current) => current.filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target)))
    if (hasFinishedInteraction) nodeInteractionActiveRef.current = false
  }, [recordHistory])
  const onEdgesChange = useCallback((changes: EdgeChange<TopologyEdge>[]) => {
    const structuralChanges = changes.filter((change) => change.type === 'add' || change.type === 'remove' || change.type === 'replace')
    const followsNodeRemoval = structuralChanges.length > 0 && structuralChanges.every((change) => change.type === 'remove') && Date.now() - lastNodeRemovalTimeRef.current < 100
    if (structuralChanges.length && !followsNodeRemoval) recordHistory()
    setEdges((current) => applyEdgeChanges(changes, current))
  }, [recordHistory])
  const addConnection = useCallback((connection: Connection, data: ConnectionData) => {
    recordHistory()
    const interfaceLabel = [data.sourceInterface, data.targetInterface].filter(Boolean).join(' ↔ ')
    const label = interfaceLabel
    setEdges((current) => addEdge({ ...connection, id: newId('edge'), type: 'smoothstep', data, label, style: getCableStyle(data.cableType) }, current))
  }, [recordHistory])

  const addDevice = useCallback((type: DeviceType, position: { x: number; y: number }, patch: Partial<DeviceData> = {}) => {
    recordHistory()
    const id = newId('device')
    setNodes((current) => [...current, { id, type, position, data: { ...createDeviceData(type), ...patch, deviceType: type }, selected: true }])
    setNodes((current) => current.map((node) => node.id === id ? node : { ...node, selected: false }))
    setEdges((current) => current.map((edge) => ({ ...edge, selected: false })))
    return id
  }, [recordHistory])

  const addZone = useCallback((position: { x: number; y: number }, size: { width: number; height: number }, color: string, lineStyle: ZoneLineStyle) => {
    recordHistory()
    const id = newId('zone')
    const data: DeviceData = {
      ...createDeviceData('zone'),
      name: 'Network Zone',
      hostname: 'Network Zone',
      zoneColor: color,
      zoneLineStyle: lineStyle,
    }
    const zone: TopologyNode = { id, type: 'zone', position, width: size.width, height: size.height, data, selected: true }
    setNodes((current) => [...current.map((node) => ({ ...node, selected: false })), zone])
    setEdges((current) => current.map((edge) => ({ ...edge, selected: false })))
    return id
  }, [recordHistory])

  const updateNode = useCallback((id: string, patch: Partial<DeviceData>, type?: DeviceType) => {
    recordHistory(`node:${id}:${Object.keys(patch).sort().join(',')}:${type ?? ''}`)
    setNodes((current) => current.map((node) => node.id === id ? { ...node, type: type ?? node.type, data: { ...node.data, ...patch } } : node))
  }, [recordHistory])

  const addInterface = useCallback((nodeId: string) => {
    recordHistory()
    const item: DeviceInterface = { id: newId('if'), name: '', ip: '', vlan: '', role: '', description: '' }
    setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, interfaces: [...node.data.interfaces, item] } } : node))
  }, [recordHistory])

  const updateInterface = useCallback((nodeId: string, interfaceId: string, patch: Partial<DeviceInterface>) => {
    recordHistory(`interface:${nodeId}:${interfaceId}:${Object.keys(patch).sort().join(',')}`)
    setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, interfaces: node.data.interfaces.map((item) => item.id === interfaceId ? { ...item, ...patch } : item) } } : node))
  }, [recordHistory])

  const removeInterface = useCallback((nodeId: string, interfaceId: string) => {
    recordHistory()
    setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, interfaces: node.data.interfaces.filter((item) => item.id !== interfaceId) } } : node))
  }, [recordHistory])

  const updateEdge = useCallback((id: string, patch: Partial<ConnectionData>) => {
    recordHistory(`edge:${id}:${Object.keys(patch).sort().join(',')}`)
    setEdges((current) => current.map((edge) => {
      if (edge.id !== id) return edge
      const data: ConnectionData = { cableType: 'copper-straight', sourceInterface: '', targetInterface: '', description: '', ...edge.data, ...patch }
      const interfaceLabel = [data.sourceInterface, data.targetInterface].filter(Boolean).join(' ↔ ')
      const label = interfaceLabel
      return { ...edge, data, label, style: getCableStyle(data.cableType) }
    }))
  }, [recordHistory])

  const reconnectConnection = useCallback((oldEdge: TopologyEdge, connection: Connection) => {
    recordHistory()
    setEdges((current) => current.map((edge) => {
      if (edge.id !== oldEdge.id) return edge
      const existing: ConnectionData = {
        cableType: 'copper-straight',
        sourceInterface: '',
        targetInterface: '',
        description: '',
        ...edge.data,
      }
      const data: ConnectionData = {
        ...existing,
        sourceInterface: edge.source === connection.source ? edge.data?.sourceInterface ?? '' : '',
        targetInterface: edge.target === connection.target ? edge.data?.targetInterface ?? '' : '',
      }
      const interfaceLabel = [data.sourceInterface, data.targetInterface].filter(Boolean).join(' ↔ ')
      const label = interfaceLabel
      return { ...edge, ...connection, data, label }
    }))
  }, [recordHistory])

  const deleteSelection = useCallback(() => {
    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
    const hasSelectedEdge = edges.some((edge) => edge.selected)
    if (selectedNodeIds.size || hasSelectedEdge) recordHistory()
    setNodes((current) => current.filter((node) => !node.selected))
    setEdges((current) => current.filter((edge) => !edge.selected && !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)))
  }, [edges, nodes, recordHistory])

  const deleteNode = useCallback((id: string) => {
    if (!nodesRef.current.some((node) => node.id === id)) return
    recordHistory()
    setNodes((current) => current.filter((node) => node.id !== id))
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id))
  }, [recordHistory])

  const deleteEdge = useCallback((id: string) => {
    if (!edgesRef.current.some((edge) => edge.id === id)) return
    recordHistory()
    setEdges((current) => current.filter((edge) => edge.id !== id))
  }, [recordHistory])

  const clearSelection = useCallback(() => {
    setNodes((current) => current.map((node) => node.selected ? { ...node, selected: false } : node))
    setEdges((current) => current.map((edge) => edge.selected ? { ...edge, selected: false } : edge))
  }, [])

  const replaceProject = useCallback((project: TopologyProject) => {
    recordHistory()
    setProjectNameState(project.projectName)
    setCreatedAt(project.createdAt)
    setNodes(project.nodes.map((node) => ({ ...node, selected: false })))
    setEdges(project.edges.map((edge) => ({ ...edge, selected: false })))
  }, [recordHistory])

  const loadIntoEditor = useCallback((project: StoredTopologyProject) => {
    clearHistory()
    skipNextAutosave.current = true
    setProjectNameState(project.projectName)
    setCreatedAt(project.createdAt)
    setNodes(project.nodes.map((node) => ({ ...node, selected: false })))
    setEdges(project.edges.map((edge) => ({ ...edge, selected: false })))
    setSaveState('saved')
  }, [clearHistory])

  const switchProject = useCallback((id: string) => {
    if (id === activeProjectIdRef.current) return true
    persistCurrent()
    const target = projectsRef.current.find((project) => project.id === id)
    if (!target) return false
    writeLibrary(projectsRef.current, target.id)
    loadIntoEditor(target)
    return true
  }, [loadIntoEditor, persistCurrent, writeLibrary])

  const createProject = useCallback((name = 'Untitled Network') => {
    persistCurrent()
    const project = createBlankProject(name.trim() || 'Untitled Network')
    writeLibrary([...projectsRef.current, project], project.id)
    loadIntoEditor(project)
    return project.id
  }, [loadIntoEditor, persistCurrent, writeLibrary])

  const renameProject = useCallback((id: string, name: string) => {
    const projectName = name.trim() || 'Untitled Network'
    const now = new Date().toISOString()
    let nextProjects: StoredTopologyProject[]
    if (id === activeProjectIdRef.current) {
      const current: StoredTopologyProject = { id, ...getProject(), projectName, updatedAt: now }
      nextProjects = projectsRef.current.map((project) => project.id === id ? current : project)
      setProjectNameState(projectName)
    } else {
      nextProjects = projectsRef.current.map((project) => project.id === id ? { ...project, projectName, updatedAt: now } : project)
    }
    writeLibrary(nextProjects)
  }, [getProject, writeLibrary])

  const duplicateProject = useCallback((id: string) => {
    if (id === activeProjectIdRef.current) persistCurrent()
    const source = projectsRef.current.find((project) => project.id === id)
    if (!source) return null
    const now = new Date().toISOString()
    const duplicate: StoredTopologyProject = {
      id: newProjectId(),
      version: 1,
      projectName: `${source.projectName} Copy`,
      createdAt: now,
      updatedAt: now,
      nodes: structuredClone(source.nodes).map((node) => ({ ...node, selected: false })),
      edges: structuredClone(source.edges).map((edge) => ({ ...edge, selected: false })),
    }
    writeLibrary([...projectsRef.current, duplicate], duplicate.id)
    loadIntoEditor(duplicate)
    return duplicate.id
  }, [loadIntoEditor, persistCurrent, writeLibrary])

  const deleteProject = useCallback((id: string) => {
    if (id !== activeProjectIdRef.current) persistCurrent()
    let remaining = projectsRef.current.filter((project) => project.id !== id)
    if (!remaining.length) remaining = [createBlankProject()]
    if (id === activeProjectIdRef.current) {
      const nextActive = [...remaining].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]!
      writeLibrary(remaining, nextActive.id)
      loadIntoEditor(nextActive)
    } else {
      writeLibrary(remaining)
    }
  }, [loadIntoEditor, persistCurrent, writeLibrary])

  const projectSummaries: ProjectSummary[] = projects.map((project) => ({
    id: project.id,
    projectName: project.projectName,
    updatedAt: project.updatedAt,
    deviceCount: project.nodes.filter((node) => node.data.deviceType !== 'text-box' && node.data.deviceType !== 'zone').length,
    connectionCount: project.edges.length,
  })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const saveNow = useCallback(() => { persistCurrent(); setSaveState('saved') }, [persistCurrent])

  return { nodes, edges, projectName, activeProjectId, projects: projectSummaries, saveState, canUndo, canRedo, undo, redo, setProjectName, setNodes, setEdges, onNodesChange, onEdgesChange, addConnection, reconnectConnection, addDevice, addZone, updateNode, updateEdge, addInterface, updateInterface, removeInterface, deleteSelection, deleteNode, deleteEdge, clearSelection, replaceProject, switchProject, createProject, renameProject, duplicateProject, deleteProject, saveNow, getProject }
}
