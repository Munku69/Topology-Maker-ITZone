import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactFlowInstance } from '@xyflow/react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { DeviceSidebar } from './components/DeviceSidebar'
import { PropertiesPanel } from './components/PropertiesPanel'
import { Toasts, type ToastKind, type ToastMessage } from './components/Toast'
import { Toolbar } from './components/Toolbar'
import { TopologyCanvas } from './components/TopologyCanvas'
import { createDemoTopology } from './constants/devices'
import { useTopology } from './hooks/useTopology'
import type { DeviceType, TopologyEdge, TopologyNode, TopologyProject } from './types/topology'
import { downloadJson, validateProject } from './utils/project'

type PendingAction = { type: 'new' } | { type: 'demo' } | { type: 'import'; project: TopologyProject }

function App() {
  const topology = useTopology()
  const [flow, setFlow] = useState<ReactFlowInstance<TopologyNode, TopologyEdge> | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const selectedNode = topology.nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedEdge = topology.edges.find((edge) => edge.id === selectedEdgeId) ?? null

  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, kind, message }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200)
  }, [])

  const hasWork = topology.nodes.length > 0 || topology.edges.length > 0 || topology.projectName !== 'Untitled Network'
  const runPending = useCallback((action: PendingAction) => {
    if (action.type === 'new') { topology.newProject(); notify('success', 'New project ready.') }
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
    setSelectedNodeId(null); setSelectedEdgeId(null); setPendingAction(null)
  }, [flow, notify, topology])

  const requestAction = (action: PendingAction) => hasWork ? setPendingAction(action) : runPending(action)

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
        inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['firewall', 'router', 'switch', 'pc', 'server'] }, x: { type: 'number' }, y: { type: 'number' } }, required: ['type'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: unknown) => {
          const value = input as { type?: DeviceType; x?: number; y?: number }
          if (!value.type || !['firewall', 'router', 'switch', 'pc', 'server'].includes(value.type)) throw new Error('A valid device type is required.')
          const id = topology.addDevice(value.type, { x: value.x ?? 240, y: value.y ?? 180 })
          return { id, type: value.type, added: true }
        },
      }, { signal: lifecycle.signal })
    }
    void register().catch(() => undefined)
    return () => lifecycle.abort()
  }, [topology.addDevice, topology.edges.length, topology.nodes.length, topology.projectName])

  return (
    <div className={`app-shell ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>
      <Toolbar projectName={topology.projectName} saveState={topology.saveState} leftCollapsed={leftCollapsed} rightCollapsed={rightCollapsed} onProjectNameChange={topology.setProjectName} onNew={() => requestAction({ type: 'new' })} onSave={() => { topology.saveNow(); notify('success', 'Project saved locally.') }} onImport={() => fileInputRef.current?.click()} onExportJson={() => { downloadJson(topology.getProject()); notify('success', 'Editable project downloaded.') }} onExportPdf={() => void performExport('pdf')} onExportPng={() => void performExport('png')} onLoadDemo={() => requestAction({ type: 'demo' })} onToggleLeft={() => setLeftCollapsed(false)} onToggleRight={() => setRightCollapsed(false)} exporting={exporting} />
      <DeviceSidebar collapsed={leftCollapsed} onToggle={() => setLeftCollapsed(true)} />
      <TopologyCanvas ref={canvasRef} nodes={topology.nodes} edges={topology.edges} onNodesChange={topology.onNodesChange} onEdgesChange={topology.onEdgesChange} onConnect={topology.onConnect} onInit={setFlow} onSelectionChange={onSelectionChange} onDropDevice={(type, point) => { if (!flow) return; const position = flow.screenToFlowPosition(point); const id = topology.addDevice(type, position); setSelectedNodeId(id); setSelectedEdgeId(null) }} />
      <PropertiesPanel nodes={topology.nodes} selectedNode={selectedNode} selectedEdge={selectedEdge} collapsed={rightCollapsed} onToggle={() => setRightCollapsed(true)} onUpdateNode={topology.updateNode} onUpdateEdge={topology.updateEdge} onAddInterface={topology.addInterface} onUpdateInterface={topology.updateInterface} onRemoveInterface={topology.removeInterface} onDelete={deleteSelection} onCloseSelection={clearSelection} />
      <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => void onImportFile(event.target.files?.[0])} />
      <ConfirmDialog open={Boolean(pendingAction)} title={pendingAction?.type === 'new' ? 'Start a new project?' : pendingAction?.type === 'demo' ? 'Load the example topology?' : 'Replace the current project?'} message="This action will replace the current canvas. Export JSON first if you want to keep a portable copy." confirmLabel={pendingAction?.type === 'new' ? 'Start new project' : pendingAction?.type === 'demo' ? 'Load example' : 'Import project'} onCancel={() => setPendingAction(null)} onConfirm={() => pendingAction && runPending(pendingAction)} />
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
      {exporting && <div className="export-overlay"><span className="spinner" /><strong>Preparing complete topology…</strong></div>}
    </div>
  )
}

export default App
