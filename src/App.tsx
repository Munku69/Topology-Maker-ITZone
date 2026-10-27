import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Connection, ReactFlowInstance } from '@xyflow/react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { DeviceSidebar } from './components/DeviceSidebar'
import { ExportOptionsDialog, type ExportFormat } from './components/ExportOptionsDialog'
import { PortSelectionDialog } from './components/PortSelectionDialog'
import { PropertiesPanel } from './components/PropertiesPanel'
import { ProjectManagerDialog } from './components/ProjectManagerDialog'
import { Toasts, type ToastKind, type ToastMessage } from './components/Toast'
import { Toolbar } from './components/Toolbar'
import { TopologyCanvas, type CanvasContextAction } from './components/TopologyCanvas'
import { KeyboardShortcutsDialog } from './components/KeyboardShortcutsDialog'
import { StatusBar } from './components/StatusBar'
import { getDeviceNodeSize } from './components/nodes/DeviceNode'
import { TextBoxToolDialog } from './components/TextBoxToolDialog'
import { ZoneToolDialog } from './components/ZoneToolDialog'
import { TopologyTemplatesDialog } from './components/TopologyTemplatesDialog'
import { ValidationDialog } from './components/ValidationDialog'
import { TopologyWizardDialog } from './components/TopologyWizardDialog'
import { LayoutAutomationDialog } from './components/LayoutAutomationDialog'
import { createDemoTopology } from './constants/devices'
import { createTopologyTemplate, TOPOLOGY_TEMPLATES, type TopologyTemplateId } from './constants/templates'
import { CABLE_PRESETS } from './constants/cables'
import { useTopology } from './hooks/useTopology'
import { useTheme } from './hooks/useTheme'
import { useFeatureSettings } from './hooks/useFeatureSettings'
import { usePanelSizes } from './hooks/usePanelSizes'
import { DEVICE_TYPES, type CablePathStyle, type CableType, type DeviceType, type LinkPurpose, type LinkSpeed, type ProjectSummary, type TextBoxBackgroundStyle, type TextBoxToolOptions, type TopologyEdge, type TopologyNode, type TopologyProject, type ZoneLineStyle, type ZoneToolOptions } from './types/topology'
import type { ExportBackground, PdfExportDetails, PdfLayout } from './types/export'
import { downloadJson, validateProject } from './utils/project'
import { applyTopologyFix, calculateAutoLayout, calculatePresetLayout, fixAllTopologyIssues, suggestConnection, validateTopology, type LayoutPreset, type SmartConnectionSuggestion, type TopologyIssue } from './utils/automation'
import { buildTopologyFromWizard, type TopologyWizardOptions } from './utils/topologyWizard'

type PendingAction = { type: 'new' } | { type: 'demo' } | { type: 'import'; project: TopologyProject } | { type: 'template'; templateId: TopologyTemplateId } | { type: 'wizard'; options: TopologyWizardOptions }
type CableEndpoint = { nodeId: string; interfaceName: string; handleId: string }
type PortPrompt = { nodeId: string; stage: 'first' | 'second'; handleId: string }
const NETWORK_DEVICE_TYPES = DEVICE_TYPES.filter((type) => type !== 'text-box' && type !== 'zone')

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
  const [cableColor, setCableColor] = useState('#38bdf8')
  const [cableSpeed, setCableSpeed] = useState<LinkSpeed>('Auto')
  const [cableCount, setCableCount] = useState(1)
  const [cablePurpose, setCablePurpose] = useState<LinkPurpose>('Data')
  const [cablePathStyle, setCablePathStyle] = useState<CablePathStyle>('straight')
  const [deleteMode, setDeleteMode] = useState(false)
  const [textToolMode, setTextToolMode] = useState(false)
  const [textDialogOpen, setTextDialogOpen] = useState(false)
  const [textOptions, setTextOptions] = useState<TextBoxToolOptions>({ backgroundStyle: 'filled', backgroundColor: '#0ea5e9', textColor: '#ffffff' })
  const [zoneToolMode, setZoneToolMode] = useState(false)
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false)
  const [zoneOptions, setZoneOptions] = useState<ZoneToolOptions>({ color: '#ef4444', lineStyle: 'dashed' })
  const [cableEndpoint, setCableEndpoint] = useState<CableEndpoint | null>(null)
  const [portPrompt, setPortPrompt] = useState<PortPrompt | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [exporting, setExporting] = useState(false)
  const [exportDialog, setExportDialog] = useState<ExportFormat | null>(null)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [validationOpen, setValidationOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [layoutOpen, setLayoutOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [clipboardAvailable, setClipboardAvailable] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const clipboardRef = useRef<{ nodes: TopologyNode[]; edges: TopologyEdge[] } | null>(null)
  const pasteGenerationRef = useRef(1)
  const selectedNode = topology.nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedEdge = topology.edges.find((edge) => edge.id === selectedEdgeId) ?? null
  const portPromptNode = topology.nodes.find((node) => node.id === portPrompt?.nodeId) ?? null
  const cableStartNode = topology.nodes.find((node) => node.id === cableEndpoint?.nodeId) ?? null
  const smartConnectionSuggestion = useMemo(() => {
    if (portPrompt?.stage !== 'second' || !cableStartNode || !portPromptNode || !cableEndpoint) return null
    return { ...suggestConnection(cableStartNode, portPromptNode, topology.edges), sourceInterface: cableEndpoint.interfaceName }
  }, [cableEndpoint, cableStartNode, portPrompt?.stage, portPromptNode, topology.edges])
  const topologyIssues = useMemo(() => validateTopology(topology.nodes, topology.edges), [topology.edges, topology.nodes])
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
    if (action.type === 'template') {
      const template = TOPOLOGY_TEMPLATES.find((item) => item.id === action.templateId)
      if (template) {
        const generated = createTopologyTemplate(action.templateId)
        const now = new Date().toISOString()
        topology.replaceProject({ version: 1, projectName: template.name, createdAt: now, updatedAt: now, ...generated })
        window.setTimeout(() => flow?.fitView({ padding: 0.18, duration: 500 }), 80)
        notify('success', `${template.name} template loaded.`)
      }
    }
    if (action.type === 'wizard') {
      const generated = buildTopologyFromWizard(action.options)
      const now = new Date().toISOString()
      topology.replaceProject({ version: 1, projectName: generated.projectName, createdAt: now, updatedAt: now, nodes: generated.nodes, edges: generated.edges })
      window.setTimeout(() => flow?.fitView({ padding: 0.12, duration: 600 }), 100)
      notify('success', `${generated.projectName} created automatically.`)
    }
    setSelectedNodeId(null); setSelectedEdgeId(null); setPendingAction(null); setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null); setDeleteMode(false); setTextToolMode(false); setTextDialogOpen(false); setZoneToolMode(false); setZoneDialogOpen(false)
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

  const performExport = async (kind: 'pdf' | 'png', background: ExportBackground, pdfLayout: PdfLayout = 'standard', pdfDetails: PdfExportDetails = { author: '', notes: '', includePortInfo: false }) => {
    if (!topology.nodes.length) { notify('info', 'Add at least one device or text box before exporting a diagram.'); return }
    setExporting(true)
    try {
      const { exportTopologyPdf, exportTopologyPng } = await import('./utils/exportDiagram')
      if (kind === 'pdf') await exportTopologyPdf(topology.projectName, topology.nodes, topology.edges, background, pdfLayout, pdfDetails)
      else await exportTopologyPng(topology.projectName, topology.nodes, background)
      notify('success', `${kind.toUpperCase()} exported with a ${background === 'white' ? 'white' : 'canvas'} background.`)
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
  const deleteSelection = () => { topology.deleteSelection(); setSelectedNodeId(null); setSelectedEdgeId(null); notify('info', selectedNode?.data.deviceType === 'zone' ? 'Zone deleted.' : selectedNode?.data.deviceType === 'text-box' ? 'Text box deleted.' : selectedNode ? 'Device and connected links deleted.' : 'Connection deleted.') }
  const resetWorkspaceInteraction = () => {
    setSelectedNodeId(null); setSelectedEdgeId(null); setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null); setDeleteMode(false); setTextToolMode(false); setTextDialogOpen(false); setZoneToolMode(false); setZoneDialogOpen(false)
  }
  const fitCurrentProject = () => window.setTimeout(() => flow?.fitView({ padding: 0.2, duration: 350 }), 80)
  const arrangeTopology = () => {
    const selectedDevices = topology.nodes.filter((node) => node.selected && node.data.deviceType !== 'zone' && node.data.deviceType !== 'text-box').length
    const positions = calculateAutoLayout(topology.nodes, topology.edges)
    if (!topology.applyNodePositions(positions)) { notify('info', 'Add at least two devices before arranging the topology.'); return }
    window.setTimeout(() => flow?.fitView({ padding: 0.2, duration: 450 }), 60)
    notify('success', selectedDevices >= 2 ? `Arranged ${selectedDevices} selected devices.` : 'Topology arranged automatically.')
  }
  const applyLayoutPreset = (preset: LayoutPreset, options: { selectedOnly: boolean; keepSelectedLocked: boolean }) => {
    const positions = calculatePresetLayout(topology.nodes, topology.edges, preset, options)
    if (!topology.applyNodePositions(positions)) { notify('info', 'No movable devices are available for this layout.'); return }
    setLayoutOpen(false)
    window.setTimeout(() => flow?.fitView({ padding: 0.16, duration: 500 }), 60)
    notify('success', `Applied the ${preset.replace('-', ' ')} layout.`)
  }
  const fixTopologyIssue = (issue: TopologyIssue) => {
    const result = applyTopologyFix(topology.nodes, topology.edges, issue)
    if (!result.changed) { notify('info', 'This issue could not be fixed automatically.'); return }
    topology.replaceProject({ ...topology.getProject(), nodes: result.nodes, edges: result.edges, updatedAt: new Date().toISOString() })
    notify('success', `Fixed: ${issue.title}.`)
  }
  const fixEveryTopologyIssue = () => {
    const result = fixAllTopologyIssues(topology.nodes, topology.edges)
    if (!result.fixed) { notify('info', 'No safe automatic fixes are currently available.'); return }
    topology.replaceProject({ ...topology.getProject(), nodes: result.nodes, edges: result.edges, updatedAt: new Date().toISOString() })
    window.setTimeout(() => flow?.fitView({ padding: 0.18, duration: 450 }), 60)
    notify('success', `Applied ${result.fixed} automatic ${result.fixed === 1 ? 'fix' : 'fixes'}.`)
  }
  const zoneSelectedDevices = (requestedNodes?: TopologyNode[]) => {
    const selected = (requestedNodes ?? topology.nodes.filter((node) => node.selected)).filter((node) => node.data.deviceType !== 'zone' && node.data.deviceType !== 'text-box')
    if (!selected.length) { notify('info', 'Select one or more devices before creating an automatic zone.'); return }
    const padding = 45
    const minX = Math.min(...selected.map((node) => node.position.x))
    const minY = Math.min(...selected.map((node) => node.position.y))
    const maxX = Math.max(...selected.map((node) => node.position.x + (node.measured?.width ?? node.width ?? 112)))
    const maxY = Math.max(...selected.map((node) => node.position.y + (node.measured?.height ?? node.height ?? 112) + 34))
    const name = selected.length === 1 ? `${selected[0]!.data.name} Zone` : 'Network Zone'
    const id = topology.addZone({ x: minX - padding, y: minY - padding }, { width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 }, zoneOptions.color, zoneOptions.lineStyle, name)
    if (!id) { notify('error', 'Unable to create the zone because it would overlap an existing zone.'); return }
    setSelectedNodeId(id); setSelectedEdgeId(null)
    notify('success', `Zone created around ${selected.length} device${selected.length === 1 ? '' : 's'}.`)
  }

  const copyNodes = useCallback((target?: TopologyNode, announce = true) => {
    const selected = topology.nodes.filter((node) => node.selected && node.data.deviceType !== 'zone')
    const currentTarget = target ? topology.nodes.find((node) => node.id === target.id) : undefined
    const nodesToCopy = (currentTarget && !currentTarget.selected ? [currentTarget] : selected).filter((node) => node.data.deviceType !== 'zone')
    if (!nodesToCopy.length) return false
    const selectedIds = new Set(nodesToCopy.map((node) => node.id))
    const selectedEdges = topology.edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))
    clipboardRef.current = { nodes: structuredClone(nodesToCopy), edges: structuredClone(selectedEdges) }
    pasteGenerationRef.current = 1
    setClipboardAvailable(true)
    if (announce) notify('info', `Copied ${nodesToCopy.length} item${nodesToCopy.length === 1 ? '' : 's'}.`)
    return true
  }, [notify, topology.edges, topology.nodes])

  const pasteCopiedNodes = useCallback(() => {
    if (!clipboardRef.current) return []
    const distance = 32 * pasteGenerationRef.current++
    const ids = topology.pasteElements(clipboardRef.current.nodes, clipboardRef.current.edges, { x: distance, y: distance })
    setSelectedNodeId(ids[0] ?? null)
    setSelectedEdgeId(null)
    notify('success', `Pasted ${ids.length} item${ids.length === 1 ? '' : 's'}.`)
    return ids
  }, [notify, topology.pasteElements])

  const performUndo = useCallback(() => {
    if (!topology.undo()) return
    setSelectedNodeId(null); setSelectedEdgeId(null); setCableEndpoint(null); setPortPrompt(null)
  }, [topology.undo])

  const performRedo = useCallback(() => {
    if (!topology.redo()) return
    setSelectedNodeId(null); setSelectedEdgeId(null); setCableEndpoint(null); setPortPrompt(null)
  }, [topology.redo])

  const handleCanvasContextAction = (action: CanvasContextAction, target?: TopologyNode | TopologyEdge) => {
    if (action === 'fit') { fitCurrentProject(); return }
    if (action === 'arrange') { arrangeTopology(); return }
    if (action === 'paste') { pasteCopiedNodes(); return }
    if (action === 'copy' && target && 'position' in target) { copyNodes(target); return }
    if (action === 'duplicate' && target && 'position' in target) {
      if (copyNodes(target, false)) pasteCopiedNodes()
      return
    }
    if (action === 'zone' && target && 'position' in target) {
      const group = target.selected ? topology.nodes.filter((node) => node.selected) : [target]
      zoneSelectedDevices(group)
      return
    }
    if (action === 'delete' && target) {
      if ('position' in target) {
        topology.deleteNode(target.id)
        notify('info', target.data.deviceType === 'zone' ? 'Zone deleted.' : target.data.deviceType === 'text-box' ? 'Text box deleted.' : `${target.data.name || 'Device'} and its connected cables deleted.`)
      } else {
        topology.deleteEdge(target.id)
        notify('info', 'Cable deleted.')
      }
      setSelectedNodeId(null); setSelectedEdgeId(null)
    }
  }
  const locateIssue = (issue: TopologyIssue) => {
    setValidationOpen(false)
    const nodeIds = new Set(issue.nodeId ? [issue.nodeId] : [])
    if (!nodeIds.size && issue.edgeId) {
      const edge = topology.edges.find((item) => item.id === issue.edgeId)
      if (edge) { nodeIds.add(edge.source); nodeIds.add(edge.target) }
    }
    topology.setNodes((current) => current.map((node) => ({ ...node, selected: node.id === issue.nodeId })))
    topology.setEdges((current) => current.map((edge) => ({ ...edge, selected: edge.id === issue.edgeId })))
    setSelectedNodeId(issue.nodeId ?? null); setSelectedEdgeId(issue.edgeId ?? null)
    const nodesToFit = topology.nodes.filter((node) => nodeIds.has(node.id))
    if (nodesToFit.length) window.setTimeout(() => flow?.fitView({ nodes: nodesToFit, padding: 0.8, duration: 350, maxZoom: 1.25 }), 40)
  }
  const createLocalProject = (name = 'Untitled Network') => {
    topology.createProject(name)
    resetWorkspaceInteraction()
    setProjectManagerOpen(false)
    fitCurrentProject()
    notify('success', `Created “${name.trim() || 'Untitled Network'}”.`)
  }

  const selectCableTool = (type: CableType) => {
    setDeleteMode(false)
    setTextToolMode(false)
    setTextDialogOpen(false)
    setZoneToolMode(false); setZoneDialogOpen(false)
    if (selectedCable === type) {
      setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null)
      notify('info', 'Cable tool cancelled.')
      return
    }
    if (settings.portSelection) setCableColor(CABLE_PRESETS[type].color)
    setSelectedCable(type); setCableEndpoint(null); setPortPrompt(null)
    clearSelection()
    notify('info', `${settings.portSelection ? CABLE_PRESETS[type].label : 'Cable'} selected. Click the first device.`)
  }

  const applySmartConnectionSuggestion = (suggestion: SmartConnectionSuggestion) => {
    setSelectedCable(suggestion.cableType)
    setCableColor(suggestion.color)
    setCableSpeed(suggestion.speed)
    setCablePurpose(suggestion.purpose)
    notify('info', `${suggestion.reason}: ${suggestion.purpose} · ${suggestion.speed}.`)
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
    const automaticSuggestion = !settings.portSelection && cableSpeed === 'Auto' && cablePurpose === 'Data' ? suggestConnection(sourceNode, targetNode, topology.edges) : null
    const effectiveCable = automaticSuggestion?.cableType ?? selectedCable
    const effectiveColor = automaticSuggestion?.color ?? cableColor
    const effectiveSpeed = automaticSuggestion?.speed ?? cableSpeed
    const effectivePurpose = automaticSuggestion?.purpose ?? cablePurpose
    topology.addConnection(connection, { cableType: effectiveCable, color: effectiveColor, speed: effectiveSpeed, linkCount: cableCount, purpose: effectivePurpose, showCableType: settings.portSelection, pathStyle: cablePathStyle, sourceInterface: cableEndpoint.interfaceName, targetInterface, description: '' })
    const sourceLabel = [sourceNode.data.name, cableEndpoint.interfaceName].filter(Boolean).join(' ')
    const targetLabel = [targetNode.data.name, targetInterface].filter(Boolean).join(' ')
    const connectionLabel = [effectivePurpose !== 'Data' ? effectivePurpose : '', effectiveSpeed !== 'Auto' ? `${cableCount > 1 ? `${cableCount} x ` : ''}${effectiveSpeed}` : '', settings.portSelection ? CABLE_PRESETS[effectiveCable].shortLabel : 'Cable'].filter(Boolean).join(' / ')
    notify('success', `${connectionLabel}: ${sourceLabel} connected to ${targetLabel}.`)
    setCableEndpoint(null); setPortPrompt(null)
  }

  const handleCableNodeClick = (node: TopologyNode, handleId: string) => {
    if (deleteMode) {
      topology.deleteNode(node.id)
      setSelectedNodeId(null); setSelectedEdgeId(null)
      notify('info', node.data.deviceType === 'zone' ? 'Zone deleted.' : node.data.deviceType === 'text-box' ? 'Text box deleted.' : `${node.data.name || 'Device'} and its connected cables deleted.`)
      return
    }
    if (node.data.deviceType === 'text-box' || node.data.deviceType === 'zone') {
      if (selectedCable) notify('info', `${node.data.deviceType === 'zone' ? 'Zones' : 'Text boxes'} cannot be connected to cables.`)
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
    setTextToolMode(false)
    setTextDialogOpen(false)
    setZoneToolMode(false); setZoneDialogOpen(false)
    setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null)
    clearSelection()
    notify('info', next ? 'Delete tool active. Click a device or cable to remove it.' : 'Delete tool cancelled.')
  }

  const toggleTextTool = () => {
    if (textToolMode) {
      setTextToolMode(false)
      notify('info', 'Text box tool cancelled.')
      return
    }
    setTextDialogOpen(true)
    setDeleteMode(false)
    setZoneToolMode(false); setZoneDialogOpen(false)
    setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null)
    clearSelection()
  }

  const startTextPlacement = () => {
    setTextDialogOpen(false)
    setTextToolMode(true)
    notify('info', 'Text box tool active. Click the canvas to place a note.')
  }

  const addTextBoxAt = (point: { x: number; y: number }) => {
    if (!flow || !textToolMode) return
    const id = topology.addDevice('text-box', flow.screenToFlowPosition(point), {
      textBackgroundStyle: textOptions.backgroundStyle,
      textBackgroundColor: textOptions.backgroundColor,
      textColor: textOptions.textColor,
    })
    setSelectedNodeId(id); setSelectedEdgeId(null); setTextToolMode(false)
    notify('success', 'Text box added. Edit it in Properties.')
  }

  const toggleZoneTool = () => {
    if (zoneToolMode) {
      setZoneToolMode(false)
      notify('info', 'Zone tool cancelled.')
      return
    }
    setTextToolMode(false)
    setTextDialogOpen(false)
    setZoneDialogOpen(true)
  }

  const startZoneDrawing = () => {
    setZoneDialogOpen(false)
    setZoneToolMode(true)
    setDeleteMode(false); setTextToolMode(false); setTextDialogOpen(false)
    setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null)
    clearSelection()
    notify('info', 'Zone tool active. Drag a rectangle on the canvas.')
  }

  const drawZone = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!flow || !zoneToolMode) return
    const first = flow.screenToFlowPosition(start)
    const second = flow.screenToFlowPosition(end)
    const position = { x: Math.min(first.x, second.x), y: Math.min(first.y, second.y) }
    const size = { width: Math.max(160, Math.abs(second.x - first.x)), height: Math.max(110, Math.abs(second.y - first.y)) }
    const id = topology.addZone(position, size, zoneOptions.color, zoneOptions.lineStyle)
    if (!id) { notify('error', 'Zones cannot overlap. Draw this zone in a separate area.'); return }
    setSelectedNodeId(id); setSelectedEdgeId(null); setZoneToolMode(false)
    notify('success', 'Zone added. Rename or restyle it in Properties.')
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
    if (!textToolMode) return
    const cancelTextTool = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setTextToolMode(false)
      notify('info', 'Text box tool cancelled.')
    }
    window.addEventListener('keydown', cancelTextTool)
    return () => window.removeEventListener('keydown', cancelTextTool)
  }, [notify, textToolMode])

  useEffect(() => {
    if (!zoneToolMode) return
    const cancelZoneTool = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setZoneToolMode(false)
      notify('info', 'Zone tool cancelled.')
    }
    window.addEventListener('keydown', cancelZoneTool)
    return () => window.removeEventListener('keydown', cancelZoneTool)
  }, [notify, zoneToolMode])

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const key = event.key.toLowerCase()
      const isUndo = key === 'z' && !event.shiftKey
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey)
      if (!isUndo && !isRedo) return
      event.preventDefault()
      if (isUndo) performUndo()
      else performRedo()
    }
    window.addEventListener('keydown', handleHistoryShortcut)
    return () => window.removeEventListener('keydown', handleHistoryShortcut)
  }, [performRedo, performUndo])

  useEffect(() => {
    const handleClipboardShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const key = event.key.toLowerCase()
      if (key === 'c') {
        if (!copyNodes()) return
        event.preventDefault()
      }
      if (key === 'v' && clipboardRef.current) {
        event.preventDefault()
        pasteCopiedNodes()
      }
    }
    window.addEventListener('keydown', handleClipboardShortcut)
    return () => window.removeEventListener('keydown', handleClipboardShortcut)
  }, [copyNodes, pasteCopiedNodes])

  useEffect(() => {
    const handleWorkspaceShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault()
        topology.saveNow()
        notify('success', 'Project saved locally.')
        return
      }
      if (!modifier && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        fitCurrentProject()
        return
      }
      if (!modifier && event.key === '?') {
        event.preventDefault()
        setShortcutsOpen(true)
      }
      if (event.key === 'Escape' && shortcutsOpen) setShortcutsOpen(false)
    }
    window.addEventListener('keydown', handleWorkspaceShortcut)
    return () => window.removeEventListener('keydown', handleWorkspaceShortcut)
  }, [fitCurrentProject, notify, shortcutsOpen, topology.saveNow])

  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()
    const register = async () => {
      await context.registerTool({
        name: 'get_topology_summary', title: 'Get topology summary', description: 'Read the current project name and counts of devices and connections.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({ projectName: topology.projectName, devices: topology.nodes.filter((node) => node.data.deviceType !== 'text-box' && node.data.deviceType !== 'zone').length, connections: topology.edges.length }),
      }, { signal: lifecycle.signal })
      await context.registerTool({
        name: 'add_network_device', title: 'Add network device', description: 'Add a network device to the visible topology canvas.',
        inputSchema: { type: 'object', properties: { type: { type: 'string', enum: NETWORK_DEVICE_TYPES }, x: { type: 'number' }, y: { type: 'number' } }, required: ['type'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: unknown) => {
          const value = input as { type?: DeviceType; x?: number; y?: number }
          if (!value.type || !NETWORK_DEVICE_TYPES.includes(value.type as (typeof NETWORK_DEVICE_TYPES)[number])) throw new Error('A valid device type is required.')
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
      <Toolbar projectName={topology.projectName} saveState={topology.saveState} leftCollapsed={leftCollapsed} rightCollapsed={rightCollapsed} onProjectNameChange={topology.setProjectName} onManageProjects={() => setProjectManagerOpen(true)} onNew={() => requestAction({ type: 'new' })} onSave={() => { topology.saveNow(); notify('success', 'Project saved locally.') }} onImport={() => fileInputRef.current?.click()} onExportJson={() => { downloadJson(topology.getProject()); notify('success', 'Editable project downloaded.') }} onExportPdf={() => setExportDialog('pdf')} onExportPng={() => setExportDialog('png')} onLoadDemo={() => requestAction({ type: 'demo' })} onArrange={arrangeTopology} onOpenWizard={() => setWizardOpen(true)} onOpenLayouts={() => setLayoutOpen(true)} onFit={fitCurrentProject} canUndo={topology.canUndo} canRedo={topology.canRedo} onUndo={performUndo} onRedo={performRedo} onOpenShortcuts={() => setShortcutsOpen(true)} onOpenTemplates={() => setTemplatesOpen(true)} onOpenValidation={() => setValidationOpen(true)} onZoneSelection={zoneSelectedDevices} issueCount={topologyIssues.length} onToggleLeft={() => setLeftCollapsed(false)} onToggleRight={() => setRightCollapsed(false)} exporting={exporting} theme={theme} onToggleTheme={toggleTheme} showCables={settings.showCables} portSelection={settings.portSelection} showDeviceNames={settings.showDeviceNames} showIpAddresses={settings.showIpAddresses} onShowCablesChange={(value) => { setFeature('showCables', value); if (!value) clearSelection(); notify('info', value ? 'Cables are visible.' : 'Cables are hidden.') }} onPortSelectionChange={(value) => { setFeature('portSelection', value); setSelectedCable(null); setCableEndpoint(null); setPortPrompt(null); notify('info', value ? 'Port selection enabled. Cable types are available.' : 'Port selection disabled. Connections use the simple cable tool.') }} onShowDeviceNamesChange={(value) => { setFeature('showDeviceNames', value); notify('info', value ? 'Device names are visible.' : 'Device names are hidden.') }} onShowIpAddressesChange={(value) => { setFeature('showIpAddresses', value); notify('info', value ? 'IP addresses are visible.' : 'IP addresses are hidden.') }} />
      <DeviceSidebar collapsed={leftCollapsed} onToggle={() => setLeftCollapsed(true)} selectedCable={selectedCable} cableStartLabel={cableStartNode ? `${cableStartNode.data.name} ${cableEndpoint?.interfaceName ?? ''}` : null} onSelectCable={selectCableTool} cableColor={cableColor} cableSpeed={cableSpeed} cableCount={cableCount} cablePurpose={cablePurpose} cablePathStyle={cablePathStyle} onCableColorChange={setCableColor} onCableSpeedChange={setCableSpeed} onCableCountChange={setCableCount} onCablePurposeChange={setCablePurpose} onCablePathStyleChange={setCablePathStyle} portSelection={settings.portSelection} onResizeStart={startLeftResize} deleteMode={deleteMode} onToggleDeleteMode={toggleDeleteMode} textToolMode={textToolMode} onToggleTextTool={toggleTextTool} zoneToolMode={zoneToolMode} onToggleZoneTool={toggleZoneTool} />
      <TopologyCanvas ref={canvasRef} nodes={topology.nodes} edges={topology.edges} onNodesChange={topology.onNodesChange} onEdgesChange={topology.onEdgesChange} onInit={setFlow} onZoomChange={setZoom} onSelectionChange={onSelectionChange} onNodeClick={handleCableNodeClick} onEdgeClick={handleDeleteEdge} onReconnect={topology.reconnectConnection} onUpdateEdge={topology.updateEdge} cableMode={Boolean(selectedCable)} deleteMode={deleteMode} textToolMode={textToolMode} zoneToolMode={zoneToolMode} zoneOptions={zoneOptions} cableSourceNodeId={cableEndpoint?.nodeId ?? null} cableStatus={selectedCable ? cableEndpoint ? `${settings.portSelection ? CABLE_PRESETS[selectedCable].shortLabel : 'Cable'}: click the second device` : `${settings.portSelection ? CABLE_PRESETS[selectedCable].shortLabel : 'Cable'}: click the first device` : null} showCables={settings.showCables} portSelection={settings.portSelection} showDeviceNames={settings.showDeviceNames} showIpAddresses={settings.showIpAddresses} hasClipboard={clipboardAvailable} onContextAction={handleCanvasContextAction} onAddTextBox={addTextBoxAt} onDrawZone={drawZone} onDropDevice={(type, point) => { if (!flow) return; const center = flow.screenToFlowPosition(point); const size = getDeviceNodeSize(type); const position = { x: center.x - size.width / 2, y: center.y - size.height / 2 }; const id = topology.addDevice(type, position); setSelectedNodeId(id); setSelectedEdgeId(null) }} />
      <PropertiesPanel nodes={topology.nodes} selectedNode={selectedNode} selectedEdge={selectedEdge} collapsed={rightCollapsed} onToggle={() => setRightCollapsed(true)} onUpdateNode={topology.updateNode} onUpdateEdge={topology.updateEdge} onAddInterface={topology.addInterface} onUpdateInterface={topology.updateInterface} onRemoveInterface={topology.removeInterface} onDelete={deleteSelection} onCloseSelection={clearSelection} portSelection={settings.portSelection} onResizeStart={startRightResize} />
      <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => void onImportFile(event.target.files?.[0])} />
      <ProjectManagerDialog open={projectManagerOpen} projects={topology.projects} activeProjectId={topology.activeProjectId} onClose={() => setProjectManagerOpen(false)} onCreate={createLocalProject} onSwitch={(id) => { if (topology.switchProject(id)) { resetWorkspaceInteraction(); setProjectManagerOpen(false); fitCurrentProject(); notify('success', 'Project opened.') } }} onRename={(id, name) => { topology.renameProject(id, name); notify('success', 'Project renamed.') }} onDuplicate={(id) => { const duplicateId = topology.duplicateProject(id); if (duplicateId) { resetWorkspaceInteraction(); setProjectManagerOpen(false); fitCurrentProject(); notify('success', 'Project duplicated.') } }} onDelete={(project) => { setProjectManagerOpen(false); setProjectToDelete(project) }} />
      <TopologyTemplatesDialog open={templatesOpen} onClose={() => setTemplatesOpen(false)} onChoose={(template) => { setTemplatesOpen(false); requestAction({ type: 'template', templateId: template.id }) }} />
      <ValidationDialog open={validationOpen} issues={topologyIssues} onClose={() => setValidationOpen(false)} onLocate={locateIssue} onFix={fixTopologyIssue} onFixAll={fixEveryTopologyIssue} />
      <TopologyWizardDialog open={wizardOpen} onClose={() => setWizardOpen(false)} onBuild={(options) => { setWizardOpen(false); requestAction({ type: 'wizard', options }) }} />
      <LayoutAutomationDialog open={layoutOpen} selectedCount={topology.nodes.filter((node) => node.selected && node.data.deviceType !== 'zone' && node.data.deviceType !== 'text-box').length} zoneCount={topology.nodes.filter((node) => node.data.deviceType === 'zone').length} onClose={() => setLayoutOpen(false)} onApply={applyLayoutPreset} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ConfirmDialog open={Boolean(pendingAction)} title="Are you sure?" message={pendingAction?.type === 'new' ? 'Your current project will remain saved locally and a new blank project will be opened.' : pendingAction?.type === 'demo' ? 'Loading the example will replace every device and cable on the current project.' : pendingAction?.type === 'template' ? 'Loading this template will replace every device and cable on the current project.' : pendingAction?.type === 'wizard' ? 'The wizard will replace the current canvas with the generated topology. You can undo this change afterward.' : 'Importing this file will replace every device and cable on the current project.'} confirmLabel={pendingAction?.type === 'new' ? 'Create project' : pendingAction?.type === 'demo' ? 'Load example' : pendingAction?.type === 'template' ? 'Load template' : pendingAction?.type === 'wizard' ? 'Build topology' : 'Replace and import'} onCancel={() => setPendingAction(null)} onConfirm={() => pendingAction && runPending(pendingAction)} />
      <ConfirmDialog open={Boolean(projectToDelete)} title="Delete this project?" message={`“${projectToDelete?.projectName ?? ''}” will be removed from this browser. Export it as JSON first if you may need it later.`} confirmLabel="Delete project" onCancel={() => { setProjectToDelete(null); setProjectManagerOpen(true) }} onConfirm={() => { if (!projectToDelete) return; const name = projectToDelete.projectName; const openedBlankProject = topology.deleteProject(projectToDelete.id); setProjectToDelete(null); if (openedBlankProject) { resetWorkspaceInteraction(); fitCurrentProject() } notify('info', openedBlankProject ? `Deleted “${name}”. A new untitled topology is open.` : `Deleted “${name}”. Your current topology is unchanged.`) }} />
      <PortSelectionDialog node={settings.portSelection ? portPromptNode : null} stage={portPrompt?.stage ?? 'first'} cableType={selectedCable} usedInterfaces={usedInterfaces} suggestion={smartConnectionSuggestion} onApplySuggestion={applySmartConnectionSuggestion} onCancel={() => setPortPrompt(null)} onConfirm={confirmCablePort} />
      <TextBoxToolDialog open={textDialogOpen} backgroundStyle={textOptions.backgroundStyle} backgroundColor={textOptions.backgroundColor} textColor={textOptions.textColor} onBackgroundStyleChange={(backgroundStyle: TextBoxBackgroundStyle) => setTextOptions((current) => ({ ...current, backgroundStyle }))} onBackgroundColorChange={(backgroundColor) => setTextOptions((current) => ({ ...current, backgroundColor }))} onTextColorChange={(textColor) => setTextOptions((current) => ({ ...current, textColor }))} onCancel={() => setTextDialogOpen(false)} onStart={startTextPlacement} />
      <ZoneToolDialog open={zoneDialogOpen} color={zoneOptions.color} lineStyle={zoneOptions.lineStyle} onColorChange={(color) => setZoneOptions((current) => ({ ...current, color }))} onLineStyleChange={(lineStyle: ZoneLineStyle) => setZoneOptions((current) => ({ ...current, lineStyle }))} onCancel={() => setZoneDialogOpen(false)} onStart={startZoneDrawing} />
      <ExportOptionsDialog format={exportDialog} exporting={exporting} onCancel={() => setExportDialog(null)} onFormatChange={setExportDialog} onExport={(background, pdfLayout, details) => { if (!exportDialog) return; const format = exportDialog; setExportDialog(null); void performExport(format, background, pdfLayout, details) }} />
      <StatusBar deviceCount={topology.nodes.filter((node) => node.data.deviceType !== 'text-box' && node.data.deviceType !== 'zone').length} linkCount={topology.edges.length} selectedCount={topology.nodes.filter((node) => node.selected).length + topology.edges.filter((edge) => edge.selected).length} zoom={zoom} activeTool={deleteMode ? 'Delete tool' : textToolMode ? 'Text tool' : zoneToolMode ? 'Zone tool' : selectedCable ? `${settings.portSelection ? CABLE_PRESETS[selectedCable].shortLabel : 'Cable'} tool` : 'Select'} onZoomOut={() => flow?.zoomOut({ duration: 140 })} onZoomIn={() => flow?.zoomIn({ duration: 140 })} onZoomChange={(percentage) => flow?.zoomTo(percentage / 100, { duration: 180 })} />
      <Toasts toasts={toasts} onDismiss={dismissToast} />
      {exporting && <div className="export-overlay"><span className="spinner" /><strong>Preparing complete topology…</strong></div>}
    </div>
  )
}

export default App
