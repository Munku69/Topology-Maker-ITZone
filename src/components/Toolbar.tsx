import { ChevronDown, Download, FileDown, FileJson, FilePlus2, FolderKanban, FolderUp, ImageDown, Menu, Moon, PanelRight, Save, Sun } from 'lucide-react'
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
  onToggleLeft: () => void
  onToggleRight: () => void
  exporting: boolean
  theme: Theme
  onToggleTheme: () => void
  showCables: boolean
  portSelection: boolean
  showDeviceLabels: boolean
  onShowCablesChange: (value: boolean) => void
  onPortSelectionChange: (value: boolean) => void
  onShowDeviceLabelsChange: (value: boolean) => void
}

export type ExportBackground = 'canvas' | 'white'

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
        <button className="toolbar-button" onClick={props.onImport} title="Import JSON project"><FolderUp size={16} /><span>Import</span></button>
        <div className="export-menu">
          <button className="toolbar-button" title="Export options"><Download size={16} /><span>Export</span><ChevronDown size={14} /></button>
          <div className="export-menu__panel">
            <button onClick={props.onExportJson}><FileJson size={16} /><span><strong>Project JSON</strong><small>Editable project file</small></span></button>
            <button onClick={props.onExportPng} disabled={props.exporting}><ImageDown size={16} /><span><strong>Topology PNG</strong><small>Choose export background</small></span></button>
            <button onClick={props.onExportPdf} disabled={props.exporting}><FileDown size={16} /><span><strong>PDF report</strong><small>Diagram and inventory</small></span></button>
          </div>
        </div>
        <button className="toolbar-button demo-button" onClick={props.onLoadDemo} title="Load the example topology">Example</button>
      </nav>
      <FeaturesMenu showCables={props.showCables} portSelection={props.portSelection} showDeviceLabels={props.showDeviceLabels} onShowCablesChange={props.onShowCablesChange} onPortSelectionChange={props.onPortSelectionChange} onShowDeviceLabelsChange={props.onShowDeviceLabelsChange} />
      <button className="icon-button theme-toggle" onClick={props.onToggleTheme} title={`Switch to ${props.theme === 'dark' ? 'light' : 'dark'} mode`} aria-label={`Switch to ${props.theme === 'dark' ? 'light' : 'dark'} mode`}>
        {props.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <div className={`save-status save-status--${props.saveState}`}><span />{props.saveState === 'saved' ? 'Saved locally' : props.saveState === 'saving' ? 'Saving…' : 'Unsaved changes'}</div>
      {props.rightCollapsed && <button className="icon-button toolbar-panel-button" onClick={props.onToggleRight} title="Open properties"><PanelRight size={18} /></button>}
    </header>
  )
}
