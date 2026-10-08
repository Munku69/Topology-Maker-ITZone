import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Connection, ReactFlowInstance } from '@xyflow/react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { DeviceSidebar } from './components/DeviceSidebar'
import { PortSelectionDialog } from './components/PortSelectionDialog'
import { PropertiesPanel } from './components/PropertiesPanel'
import { ProjectManagerDialog } from './components/ProjectManagerDialog'
import { Toasts, type ToastKind, type ToastMessage } from './components/Toast'
import { Toolbar } from './components/Toolbar'
import { TopologyCanvas } from './components/TopologyCanvas'
import { createDemoTopology } from './constants/devices'
import { CABLE_PRESETS } from './constants/cables'
import { useTopology } from './hooks/useTopology'
import { useTheme } from './hooks/useTheme'
import { useFeatureSettings } from './hooks/useFeatureSettings'
import { usePanelSizes } from './hooks/usePanelSizes'
import { DEVICE_TYPES, type CableType, type DeviceType, type ProjectSummary, type TopologyEdge, type TopologyNode, type TopologyProject } from './types/topology'
import { downloadJson, validateProject } from './utils/project'

type PendingAction = { type: 'new' } | { type: 'demo' } | { type: 'import'; project: TopologyProject }
type CableEndpoint = { nodeId: string; interfaceName: string; handleId: string }
type PortPrompt = { nodeId: string; stage: 'first' | 'second'; handleId: string }

function App() {
  const topology = useTopology()
  const { theme, toggleTheme } = useTheme()
  const { settings, setFeature } = useFeatureSettings()
  const { sizes: panelSizes, startLeftResize, startRightResize } = usePanelSizes()
  const [flow, setFlow] = useState<ReactFlowInstance<TopologyNode, TopologyEdge> | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [projectManagerOpen, setProjectManagerOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<ProjectSummary | null>(null)
  const [selectedCable, setSelectedCable] = useState<CableType | null>(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [cableEndpoint, setCableEndpoint] = useState<CableEndpoint | null>(null)
  const [portPrompt, setPortPrompt] = useState<PortPrompt | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const selectedNode = topology.nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedEdge = topology.edges.find((edge) => edge.id === selectedEdgeId) ?? null
  const portPromptNode = topology.nodes.find((node) => node.id === portPrompt?.nodeId) ?? null
  const cableStartNode = topology.nodes.find((node) => node.id === cableEndpoint?.nodeId) ?? null
  const usedInterfaces = useMemo(() => {
    if (!portPrompt) return new Set<string>()
    const used = new Set<string>()
    topology.edges.forEach((edge) => {
      if (edge.source === portPrompt.nodeId && edge.data?.sourceInterface) used.add(edge.data.sourceInterface)
      if (edge.target === portPrompt.nodeId && edge.data?.targetInterface) used.add(edge.data.targetInterface)
    })
    return used
  }, [portPrompt, topology.edges])

  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, kind, message }])
  }, [])
  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const runPending = useCallback((action: PendingAction) => {
    if (action.type === 'new') {
      topology.createProject('Untitled Network')
      setProjectManagerOpen(false)
      window.setTimeout(() => flow?.fitView({ padding: 0.2, duration: 350 }), 80)
      notify('success', 'New blank project created.')
    }
    if (action.type === 'demo') {
      const demo = createDemoTopology()
      topology.replaceProject({ version: 1, projectName: 'Head Office Network', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...demo })
      window.setTimeout(() => flow?.fitView({ padding: 0.2, duration: 450 }), 80)
      notify('success', 'Example topology loaded.')
    }
    if (action.type === 'import') {
      topology.replaceProject(action.project)
      window.setTimeout(() => flow?.fitView({ padding: 0.2, duration: 450 }), 80)
      notify('success', `Imported “${action.project.projectName}”.`)
    }
    setSelectedNodeId(null); setSelectedEdgeId(null); setPendingAction(null); setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null); setDeleteMode(false)
  }, [flow, notify, topology])

  const requestAction = (action: PendingAction) => setPendingAction(action)

  const onImportFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const project = validateProject(JSON.parse(await file.text()) as unknown)
      requestAction({ type: 'import', project })
    } catch (error) {
      notify('error', error instanceof Error ? `Unable to import project. ${error.message}` : 'Unable to import project. Invalid topology file.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const performExport = async (kind: 'pdf' | 'png') => {
    if (!topology.nodes.length) { notify('info', 'Add at least one device before exporting a diagram.'); return }
    setExporting(true)
    try {
      const { exportTopologyPdf, exportTopologyPng } = await import('./utils/exportDiagram')
      if (kind === 'pdf') await exportTopologyPdf(topology.projectName, topology.nodes, topology.edges)
      else await exportTopologyPng(topology.projectName, topology.nodes)
      notify('success', `${kind.toUpperCase()} exported successfully.`)
    } catch (error) {
      console.error(error)
      notify('error', `${kind.toUpperCase()} export failed. Please try again.`)
    } finally { setExporting(false) }
  }

  const onSelectionChange = useCallback((node: TopologyNode | null, edge: TopologyEdge | null) => {
    setSelectedNodeId(node?.id ?? null)
    setSelectedEdgeId(edge?.id ?? null)
  }, [])

  const clearSelection = () => { topology.clearSelection(); setSelectedNodeId(null); setSelectedEdgeId(null) }
  const deleteSelection = () => { topology.deleteSelection(); setSelectedNodeId(null); setSelectedEdgeId(null); notify('info', selectedNode ? 'Device and connected links deleted.' : 'Connection deleted.') }
  const resetWorkspaceInteraction = () => {
    setSelectedNodeId(null); setSelectedEdgeId(null); setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null); setDeleteMode(false)
  }
  const fitCurrentProject = () => window.setTimeout(() => flow?.fitView({ padding: 0.2, duration: 350 }), 80)
  const createLocalProject = (name = 'Untitled Network') => {
    topology.createProject(name)
    resetWorkspaceInteraction()
    setProjectManagerOpen(false)
    fitCurrentProject()
    notify('success', `Created “${name.trim() || 'Untitled Network'}”.`)
  }

  const selectCableTool = (type: CableType) => {
    setDeleteMode(false)
    if (selectedCable === type) {
      setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null)
      notify('info', 'Cable tool cancelled.')
      return
    }
    setSelectedCable(type); setCableEndpoint(null); setPortPrompt(null)
    clearSelection()
    notify('info', `${CABLE_PRESETS[type].label} selected. Click the first device.`)
  }

  const connectCableToNode = (targetNode: TopologyNode, targetInterface: string, targetHandleId: string) => {
    if (!selectedCable || !cableEndpoint) return
    const sourceNode = topology.nodes.find((node) => node.id === cableEndpoint.nodeId)
    if (!sourceNode) {
      setCableEndpoint(null); setPortPrompt(null)
      notify('error', 'The first device is no longer available. Start the cable again.')
      return
    }
    const connection: Connection = {
      source: sourceNode.id,
      target: targetNode.id,
      sourceHandle: cableEndpoint.handleId,
      targetHandle: targetHandleId,
    }
    topology.addConnection(connection, { cableType: selectedCable, sourceInterface: cableEndpoint.interfaceName, targetInterface, description: '' })
    const sourceLabel = [sourceNode.data.name, cableEndpoint.interfaceName].filter(Boolean).join(' ')
    const targetLabel = [targetNode.data.name, targetInterface].filter(Boolean).join(' ')
    notify('success', `${CABLE_PRESETS[selectedCable].shortLabel}: ${sourceLabel} connected to ${targetLabel}.`)
    setCableEndpoint(null); setPortPrompt(null)
  }

  const handleCableNodeClick = (node: TopologyNode, handleId: string) => {
    if (deleteMode) {
      topology.deleteNode(node.id)
      setSelectedNodeId(null); setSelectedEdgeId(null)
      notify('info', `${node.data.name || 'Device'} and its connected cables deleted.`)
      return
    }
    if (!selectedCable) return
    clearSelection()
    if (cableEndpoint?.nodeId === node.id) {
      notify('error', 'Choose a different device for the other end of the cable.')
      return
    }
    if (!settings.portSelection) {
      if (!cableEndpoint) {
        setCableEndpoint({ nodeId: node.id, interfaceName: '', handleId })
        notify('info', `${node.data.name} selected. Click the second device.`)
      } else {
        connectCableToNode(node, '', handleId)
      }
      return
    }
    setPortPrompt({ nodeId: node.id, stage: cableEndpoint ? 'second' : 'first', handleId })
  }

  const toggleDeleteMode = () => {
    const next = !deleteMode
    setDeleteMode(next)
    setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null)
    clearSelection()
    notify('info', next ? 'Delete tool active. Click a device or cable to remove it.' : 'Delete tool cancelled.')
  }

  const handleDeleteEdge = (edge: TopologyEdge) => {
    if (!deleteMode) return
    topology.deleteEdge(edge.id)
    setSelectedNodeId(null); setSelectedEdgeId(null)
    notify('info', 'Cable deleted.')
  }

  const confirmCablePort = (interfaceName: string) => {
    if (!selectedCable || !portPromptNode || !portPrompt) return
    if (portPrompt.stage === 'first') {
      setCableEndpoint({ nodeId: portPromptNode.id, interfaceName, handleId: portPrompt.handleId })
      setPortPrompt(null)
      notify('info', `${portPromptNode.data.name} ${interfaceName} selected. Click the second device.`)
      return
    }
    connectCableToNode(portPromptNode, interfaceName, portPrompt.handleId)
  }

  useEffect(() => {
    if (!selectedCable) return
    const cancelCable = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null)
      notify('info', 'Cable tool cancelled.')
    }
    window.addEventListener('keydown', cancelCable)
    return () => window.removeEventListener('keydown', cancelCable)
  }, [notify, selectedCable])

  useEffect(() => {
    if (!deleteMode) return
    const cancelDelete = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setDeleteMode(false)
      notify('info', 'Delete tool cancelled.')
    }
    window.addEventListener('keydown', cancelDelete)
    return () => window.removeEventListener('keydown', cancelDelete)
  }, [deleteMode, notify])

  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()
    const register = async () => {
      await context.registerTool({
        name: 'get_topology_summary', title: 'Get topology summary', description: 'Read the current project name and counts of devices and connections.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({ projectName: topology.projectName, devices: topology.nodes.length, connections: topology.edges.length }),
      }, { signal: lifecycle.signal })
      await context.registerTool({
        name: 'add_network_device', title: 'Add network device', description: 'Add a network device to the visible topology canvas.',
        inputSchema: { type: 'object', properties: { type: { type: 'string', enum: DEVICE_TYPES }, x: { type: 'number' }, y: { type: 'number' } }, required: ['type'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: unknown) => {
          const value = input as { type?: DeviceType; x?: number; y?: number }
          if (!value.type || !DEVICE_TYPES.includes(value.type)) throw new Error('A valid device type is required.')
          const id = topology.addDevice(value.type, { x: value.x ?? 240, y: value.y ?? 180 })
          return { id, type: value.type, added: true }
        },
      }, { signal: lifecycle.signal })
    }
    void register().catch(() => undefined)
    return () => lifecycle.abort()
  }, [topology.addDevice, topology.edges.length, topology.nodes.length, topology.projectName])

  return (
    <div className={`app-shell ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`} style={{ '--library-width': `${panelSizes.left}px`, '--inspector-width': `${panelSizes.right}px` } as React.CSSProperties}>
      <Toolbar projectName={topology.projectName} saveState={topology.saveState} leftCollapsed={leftCollapsed} rightCollapsed={rightCollapsed} onProjectNameChange={topology.setProjectName} onManageProjects={() => setProjectManagerOpen(true)} onNew={() => requestAction({ type: 'new' })} onSave={() => { topology.saveNow(); notify('success', 'Project saved locally.') }} onImport={() => fileInputRef.current?.click()} onExportJson={() => { downloadJson(topology.getProject()); notify('success', 'Editable project downloaded.') }} onExportPdf={() => void performExport('pdf')} onExportPng={() => void performExport('png')} onLoadDemo={() => requestAction({ type: 'demo' })} onToggleLeft={() => setLeftCollapsed(false)} onToggleRight={() => setRightCollapsed(false)} exporting={exporting} theme={theme} onToggleTheme={toggleTheme} showCables={settings.showCables} portSelection={settings.portSelection} showDeviceLabels={settings.showDeviceLabels} onShowCablesChange={(value) => { setFeature('showCables', value); if (!value) clearSelection(); notify('info', value ? 'Cables are visible.' : 'Cables are hidden.') }} onPortSelectionChange={(value) => { setFeature('portSelection', value); setCableEndpoint(null); setPortPrompt(null); notify('info', value ? 'Port selection enabled.' : 'Port selection disabled.') }} onShowDeviceLabelsChange={(value) => { setFeature('showDeviceLabels', value); notify('info', value ? 'Device labels are visible.' : 'Device labels are hidden.') }} />
      <DeviceSidebar collapsed={leftCollapsed} onToggle={() => setLeftCollapsed(true)} selectedCable={selectedCable} cableStartLabel={cableStartNode ? `${cableStartNode.data.name} ${cableEndpoint?.interfaceName ?? ''}` : null} onSelectCable={selectCableTool} portSelection={settings.portSelection} onResizeStart={startLeftResize} deleteMode={deleteMode} onToggleDeleteMode={toggleDeleteMode} />
      <TopologyCanvas ref={canvasRef} nodes={topology.nodes} edges={topology.edges} onNodesChange={topology.onNodesChange} onEdgesChange={topology.onEdgesChange} onInit={setFlow} onSelectionChange={onSelectionChange} onNodeClick={handleCableNodeClick} onEdgeClick={handleDeleteEdge} onReconnect={topology.reconnectConnection} cableMode={Boolean(selectedCable)} deleteMode={deleteMode} cableSourceNodeId={cableEndpoint?.nodeId ?? null} cableStatus={selectedCable ? cableEndpoint ? `${CABLE_PRESETS[selectedCable].shortLabel}: click the second device` : `${CABLE_PRESETS[selectedCable].shortLabel}: click the first device` : null} showCables={settings.showCables} portSelection={settings.portSelection} showDeviceLabels={settings.showDeviceLabels} onDropDevice={(type, point) => { if (!flow) return; const position = flow.screenToFlowPosition(point); const id = topology.addDevice(type, position); setSelectedNodeId(id); setSelectedEdgeId(null) }} />
      <PropertiesPanel nodes={topology.nodes} selectedNode={selectedNode} selectedEdge={selectedEdge} collapsed={rightCollapsed} onToggle={() => setRightCollapsed(true)} onUpdateNode={topology.updateNode} onUpdateEdge={topology.updateEdge} onAddInterface={topology.addInterface} onUpdateInterface={topology.updateInterface} onRemoveInterface={topology.removeInterface} onDelete={deleteSelection} onCloseSelection={clearSelection} portSelection={settings.portSelection} onResizeStart={startRightResize} />
      <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => void onImportFile(event.target.files?.[0])} />
      <ProjectManagerDialog open={projectManagerOpen} projects={topology.projects} activeProjectId={topology.activeProjectId} onClose={() => setProjectManagerOpen(false)} onCreate={createLocalProject} onSwitch={(id) => { if (topology.switchProject(id)) { resetWorkspaceInteraction(); setProjectManagerOpen(false); fitCurrentProject(); notify('success', 'Project opened.') } }} onRename={(id, name) => { topology.renameProject(id, name); notify('success', 'Project renamed.') }} onDuplicate={(id) => { const duplicateId = topology.duplicateProject(id); if (duplicateId) { resetWorkspaceInteraction(); setProjectManagerOpen(false); fitCurrentProject(); notify('success', 'Project duplicated.') } }} onDelete={(project) => { setProjectManagerOpen(false); setProjectToDelete(project) }} />
      <ConfirmDialog open={Boolean(pendingAction)} title="Are you sure?" message={pendingAction?.type === 'new' ? 'Your current project will remain saved locally and a new blank project will be opened.' : pendingAction?.type === 'demo' ? 'Loading the example will replace every device and cable on the current project.' : 'Importing this file will replace every device and cable on the current project.'} confirmLabel={pendingAction?.type === 'new' ? 'Create project' : pendingAction?.type === 'demo' ? 'Load example' : 'Replace and import'} onCancel={() => setPendingAction(null)} onConfirm={() => pendingAction && runPending(pendingAction)} />
      <ConfirmDialog open={Boolean(projectToDelete)} title="Delete this project?" message={`“${projectToDelete?.projectName ?? ''}” will be removed from this browser. Export it as JSON first if you may need it later.`} confirmLabel="Delete project" onCancel={() => { setProjectToDelete(null); setProjectManagerOpen(true) }} onConfirm={() => { if (!projectToDelete) return; const name = projectToDelete.projectName; topology.deleteProject(projectToDelete.id); setProjectToDelete(null); resetWorkspaceInteraction(); fitCurrentProject(); notify('info', `Deleted “${name}”.`) }} />
      <PortSelectionDialog node={settings.portSelection ? portPromptNode : null} stage={portPrompt?.stage ?? 'first'} cableType={selectedCable} usedInterfaces={usedInterfaces} onCancel={() => setPortPrompt(null)} onConfirm={confirmCablePort} />
      <Toasts toasts={toasts} onDismiss={dismissToast} />
      {exporting && <div className="export-overlay"><span className="spinner" /><strong>Preparing complete topology…</strong></div>}
    </div>
  )
}

export default App
