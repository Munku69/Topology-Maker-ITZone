import { useCallback, useEffect, useRef, useState } from 'react'
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react'
import { createDeviceData, newId } from '../constants/devices'
import { getCableStyle } from '../constants/cables'
import { createBlankProject, loadProjectLibrary, newProjectId, saveProjectLibrary, type ProjectLibrary } from '../utils/project'
import type { ConnectionData, DeviceData, DeviceInterface, DeviceType, ProjectSummary, SaveState, StoredTopologyProject, TopologyEdge, TopologyNode, TopologyProject } from '../types/topology'

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

  const setProjectName = useCallback((name: string) => setProjectNameState(name), [])
  const onNodesChange = useCallback((changes: NodeChange<TopologyNode>[]) => {
    const removedIds = new Set(changes.filter((change) => change.type === 'remove').map((change) => change.id))
    setNodes((current) => applyNodeChanges(changes, current))
    if (removedIds.size) setEdges((current) => current.filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target)))
  }, [])
  const onEdgesChange = useCallback((changes: EdgeChange<TopologyEdge>[]) => setEdges((current) => applyEdgeChanges(changes, current)), [])
  const addConnection = useCallback((connection: Connection, data: ConnectionData) => {
    const interfaceLabel = [data.sourceInterface, data.targetInterface].filter(Boolean).join(' ↔ ')
    const label = [interfaceLabel, data.description].filter(Boolean).join(' — ')
    setEdges((current) => addEdge({ ...connection, id: newId('edge'), type: 'smoothstep', data, label, style: getCableStyle(data.cableType) }, current))
  }, [])

  const addDevice = useCallback((type: DeviceType, position: { x: number; y: number }) => {
    const id = newId('device')
    setNodes((current) => [...current, { id, type, position, data: createDeviceData(type), selected: true }])
    setNodes((current) => current.map((node) => node.id === id ? node : { ...node, selected: false }))
    setEdges((current) => current.map((edge) => ({ ...edge, selected: false })))
    return id
  }, [])

  const updateNode = useCallback((id: string, patch: Partial<DeviceData>, type?: DeviceType) => {
    setNodes((current) => current.map((node) => node.id === id ? { ...node, type: type ?? node.type, data: { ...node.data, ...patch } } : node))
  }, [])

  const addInterface = useCallback((nodeId: string) => {
    const item: DeviceInterface = { id: newId('if'), name: '', ip: '', vlan: '', role: '', description: '' }
    setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, interfaces: [...node.data.interfaces, item] } } : node))
  }, [])

  const updateInterface = useCallback((nodeId: string, interfaceId: string, patch: Partial<DeviceInterface>) => {
    setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, interfaces: node.data.interfaces.map((item) => item.id === interfaceId ? { ...item, ...patch } : item) } } : node))
  }, [])

  const removeInterface = useCallback((nodeId: string, interfaceId: string) => {
    setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, interfaces: node.data.interfaces.filter((item) => item.id !== interfaceId) } } : node))
  }, [])

  const updateEdge = useCallback((id: string, patch: Partial<ConnectionData>) => {
    setEdges((current) => current.map((edge) => {
      if (edge.id !== id) return edge
      const data: ConnectionData = { cableType: 'copper-straight', sourceInterface: '', targetInterface: '', description: '', ...edge.data, ...patch }
      const interfaceLabel = [data.sourceInterface, data.targetInterface].filter(Boolean).join(' ↔ ')
      const label = [interfaceLabel, data.description].filter(Boolean).join(' — ')
      return { ...edge, data, label, style: getCableStyle(data.cableType) }
    }))
  }, [])

  const reconnectConnection = useCallback((oldEdge: TopologyEdge, connection: Connection) => {
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
      const label = [interfaceLabel, data.description].filter(Boolean).join(' — ')
      return { ...edge, ...connection, data, label }
    }))
  }, [])

  const deleteSelection = useCallback(() => {
    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
    setNodes((current) => current.filter((node) => !node.selected))
    setEdges((current) => current.filter((edge) => !edge.selected && !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)))
  }, [nodes])

  const deleteNode = useCallback((id: string) => {
    setNodes((current) => current.filter((node) => node.id !== id))
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id))
  }, [])

  const deleteEdge = useCallback((id: string) => {
    setEdges((current) => current.filter((edge) => edge.id !== id))
  }, [])

  const clearSelection = useCallback(() => {
    setNodes((current) => current.map((node) => node.selected ? { ...node, selected: false } : node))
    setEdges((current) => current.map((edge) => edge.selected ? { ...edge, selected: false } : edge))
  }, [])

  const replaceProject = useCallback((project: TopologyProject) => {
    setProjectNameState(project.projectName)
    setCreatedAt(project.createdAt)
    setNodes(project.nodes.map((node) => ({ ...node, selected: false })))
    setEdges(project.edges.map((edge) => ({ ...edge, selected: false })))
  }, [])

  const loadIntoEditor = useCallback((project: StoredTopologyProject) => {
    skipNextAutosave.current = true
    setProjectNameState(project.projectName)
    setCreatedAt(project.createdAt)
    setNodes(project.nodes.map((node) => ({ ...node, selected: false })))
    setEdges(project.edges.map((edge) => ({ ...edge, selected: false })))
    setSaveState('saved')
  }, [])

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
    deviceCount: project.nodes.length,
    connectionCount: project.edges.length,
  })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const saveNow = useCallback(() => { persistCurrent(); setSaveState('saved') }, [persistCurrent])

  return { nodes, edges, projectName, activeProjectId, projects: projectSummaries, saveState, setProjectName, setNodes, setEdges, onNodesChange, onEdgesChange, addConnection, reconnectConnection, addDevice, updateNode, updateEdge, addInterface, updateInterface, removeInterface, deleteSelection, deleteNode, deleteEdge, clearSelection, replaceProject, switchProject, createProject, renameProject, duplicateProject, deleteProject, saveNow, getProject }
}
