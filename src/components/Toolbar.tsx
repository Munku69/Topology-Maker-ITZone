import { ChevronDown, CircleHelp, Download, FileDown, FileJson, FilePlus2, FolderKanban, FolderUp, ImageDown, LayoutGrid, ListChecks, Maximize2, Menu, Moon, PanelRight, Redo2, Save, Sparkles, SquareDashed, Sun, Undo2 } from 'lucide-react'
import type { SaveState } from '../types/topology'
import type { Theme } from '../hooks/useTheme'
import { FeaturesMenu } from './FeaturesMenu'

interface ToolbarProps {
  projectName: string
  saveState: SaveState
  leftCollapsed: boolean
  rightCollapsed: boolean
  onProjectNameChange: (value: string) => void
  onNew: () => void
  onManageProjects: () => void
  onSave: () => void
  onImport: () => void
  onExportJson: () => void
  onExportPdf: () => void
  onExportPng: () => void
  onLoadDemo: () => void
  onArrange: () => void
  onOpenWizard: () => void
  onOpenLayouts: () => void
  onFit: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onOpenShortcuts: () => void
  onOpenTemplates: () => void
  onOpenValidation: () => void
  onZoneSelection: () => void
  issueCount: number
  onToggleLeft: () => void
  onToggleRight: () => void
  exporting: boolean
  theme: Theme
  onToggleTheme: () => void
  showCables: boolean
  portSelection: boolean
  showDeviceNames: boolean
  showIpAddresses: boolean
  onShowCablesChange: (value: boolean) => void
  onPortSelectionChange: (value: boolean) => void
  onShowDeviceNamesChange: (value: boolean) => void
  onShowIpAddressesChange: (value: boolean) => void
}

export function Toolbar(props: ToolbarProps) {
  return (
    <header className="toolbar">
      {props.leftCollapsed && <button className="icon-button toolbar-panel-button" onClick={props.onToggleLeft} title="Open device library"><Menu size={18} /></button>}
      <div className="brand-logo" aria-label="ITZone"><img src="/itzone.png" alt="ITZone" /></div>
      <div className="project-title-wrap">
        <span className="project-label">PROJECT</span>
        <input aria-label="Project name" value={props.projectName} onChange={(e) => props.onProjectNameChange(e.target.value)} />
      </div>
      <nav className="toolbar-actions" aria-label="Project controls">
        <button className="toolbar-button" onClick={props.onManageProjects} title="Open project manager"><FolderKanban size={16} /><span>Projects</span></button>
        <button className="toolbar-button" onClick={props.onNew} title="Start a new project"><FilePlus2 size={16} /><span>New</span></button>
        <button className="toolbar-button" onClick={props.onSave} title="Save locally"><Save size={16} /><span>Save</span></button>
        <div className="history-actions" aria-label="Edit history">
          <button className="icon-button" onClick={props.onUndo} disabled={!props.canUndo} title="Undo (Ctrl+Z)" aria-label="Undo"><Undo2 size={16} /></button>
          <button className="icon-button" onClick={props.onRedo} disabled={!props.canRedo} title="Redo (Ctrl+Y)" aria-label="Redo"><Redo2 size={16} /></button>
        </div>
        <button className="toolbar-button" onClick={props.onImport} title="Import JSON project"><FolderUp size={16} /><span>Import</span></button>
        <div className="export-menu">
          <button className="toolbar-button" title="Export options"><Download size={16} /><span>Export</span><ChevronDown size={14} /></button>
          <div className="export-menu__panel">
            <button onClick={props.onExportJson}><FileJson size={16} /><span><strong>Project JSON</strong><small>Editable project file</small></span></button>
            <button onClick={props.onExportPng} disabled={props.exporting}><ImageDown size={16} /><span><strong>Topology PNG</strong><small>Diagram image only</small></span></button>
            <button onClick={props.onExportPdf} disabled={props.exporting}><FileDown size={16} /><span><strong>PDF report</strong><small>ITZone templates and inventory</small></span></button>
          </div>
        </div>
        <div className="export-menu automation-menu">
          <button className="toolbar-button" title="Topology automation"><Sparkles size={16} /><span>Automate</span><ChevronDown size={14} /></button>
          <div className="export-menu__panel">
            <button onClick={props.onOpenWizard}><Sparkles size={16} /><span><strong>Build topology wizard</strong><small>Create a complete network from a few questions</small></span></button>
            <button onClick={props.onOpenLayouts}><LayoutGrid size={16} /><span><strong>Smart layout</strong><small>Choose a layout preset and lock devices</small></span></button>
            <button onClick={props.onOpenTemplates}><Sparkles size={16} /><span><strong>Topology templates</strong><small>Create a ready-to-edit network</small></span></button>
            <button onClick={props.onZoneSelection}><SquareDashed size={16} /><span><strong>Zone selection</strong><small>Wrap selected devices in a zone</small></span></button>
            <button onClick={props.onOpenValidation}><ListChecks size={16} /><span><strong>Validate topology</strong><small>{props.issueCount ? `${props.issueCount} issue${props.issueCount === 1 ? '' : 's'} found` : 'No current issues'}</small></span></button>
          </div>
        </div>
        <button className="toolbar-button" onClick={props.onFit} title="Fit and center the complete topology"><Maximize2 size={16} /><span>Fit</span></button>
        <button className="toolbar-button demo-button" onClick={props.onLoadDemo} title="Load the example topology">Example</button>
      </nav>
      <FeaturesMenu showCables={props.showCables} portSelection={props.portSelection} showDeviceNames={props.showDeviceNames} showIpAddresses={props.showIpAddresses} onShowCablesChange={props.onShowCablesChange} onPortSelectionChange={props.onPortSelectionChange} onShowDeviceNamesChange={props.onShowDeviceNamesChange} onShowIpAddressesChange={props.onShowIpAddressesChange} />
      <button className="icon-button theme-toggle" onClick={props.onToggleTheme} title={`Switch to ${props.theme === 'dark' ? 'light' : 'dark'} mode`} aria-label={`Switch to ${props.theme === 'dark' ? 'light' : 'dark'} mode`}>
        {props.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <div className={`save-status save-status--${props.saveState}`}><span />{props.saveState === 'saved' ? 'Saved' : props.saveState === 'saving' ? 'Saving…' : 'Unsaved'}</div>
      {props.rightCollapsed && <button className="icon-button toolbar-panel-button" onClick={props.onToggleRight} title="Open properties"><PanelRight size={18} /></button>}
      <button className="icon-button shortcut-help-button" onClick={props.onOpenShortcuts} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts"><CircleHelp size={18} /></button>
    </header>
  )
}
