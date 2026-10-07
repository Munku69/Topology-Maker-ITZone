import { useCallback, useEffect, useRef, useState } from 'react'
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react'
import { createDeviceData, newId } from '../constants/devices'
import { loadProject, saveProject } from '../utils/project'
import type { ConnectionData, DeviceData, DeviceInterface, DeviceType, SaveState, TopologyEdge, TopologyNode, TopologyProject } from '../types/topology'

function initialProject(): TopologyProject {
  return loadProject() ?? { version: 1, projectName: 'Untitled Network', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), nodes: [], edges: [] }
}

export function useTopology() {
  const initial = useRef(initialProject()).current
  const [nodes, setNodes] = useState<TopologyNode[]>(initial.nodes)
  const [edges, setEdges] = useState<TopologyEdge[]>(initial.edges)
  const [projectName, setProjectNameState] = useState(initial.projectName)
  const [createdAt, setCreatedAt] = useState(initial.createdAt)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const firstRender = useRef(true)

  const getProject = useCallback((): TopologyProject => ({
    version: 1, projectName: projectName.trim() || 'Untitled Network', createdAt, updatedAt: new Date().toISOString(), nodes, edges,
  }), [createdAt, edges, nodes, projectName])

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    setSaveState('unsaved')
    const timer = window.setTimeout(() => {
      setSaveState('saving')
      saveProject(getProject())
      setSaveState('saved')
    }, 550)
    return () => window.clearTimeout(timer)
  }, [getProject])

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
  const onConnect = useCallback((connection: Connection) => {
    const data: ConnectionData = { sourceInterface: '', targetInterface: '', description: '' }
    setEdges((current) => addEdge({ ...connection, id: newId('edge'), type: 'smoothstep', data }, current))
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
      const data = { sourceInterface: '', targetInterface: '', description: '', ...edge.data, ...patch }
      const interfaceLabel = [data.sourceInterface, data.targetInterface].filter(Boolean).join(' ↔ ')
      const label = [interfaceLabel, data.description].filter(Boolean).join(' — ')
      return { ...edge, data, label }
    }))
  }, [])

  const deleteSelection = useCallback(() => {
    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
    setNodes((current) => current.filter((node) => !node.selected))
    setEdges((current) => current.filter((edge) => !edge.selected && !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)))
  }, [nodes])

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

  const newProject = useCallback(() => {
    const now = new Date().toISOString()
    setProjectNameState('Untitled Network'); setCreatedAt(now); setNodes([]); setEdges([])
  }, [])

  const saveNow = useCallback(() => { saveProject(getProject()); setSaveState('saved') }, [getProject])

  return { nodes, edges, projectName, saveState, setProjectName, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect, addDevice, updateNode, updateEdge, addInterface, updateInterface, removeInterface, deleteSelection, clearSelection, replaceProject, newProject, saveNow, getProject }
}
