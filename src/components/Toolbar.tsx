import { ChevronDown, Cloud, Download, FileDown, FileJson, FilePlus2, FolderUp, ImageDown, Menu, PanelRight, Save } from 'lucide-react'
import type { SaveState } from '../types/topology'

interface ToolbarProps {
  projectName: string
  saveState: SaveState
  leftCollapsed: boolean
  rightCollapsed: boolean
  onProjectNameChange: (value: string) => void
  onNew: () => void
  onSave: () => void
  onImport: () => void
  onExportJson: () => void
  onExportPdf: () => void
  onExportPng: () => void
  onLoadDemo: () => void
  onToggleLeft: () => void
  onToggleRight: () => void
  exporting: boolean
}

export function Toolbar(props: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="brand-block">
        {props.leftCollapsed && <button className="icon-button toolbar-panel-button" onClick={props.onToggleLeft} title="Open device library"><Menu size={18} /></button>}
        <span className="brand-mark"><Cloud size={21} /></span>
        <div className="brand-copy"><span>Network Topology</span><small>Builder</small></div>
      </div>
      <div className="project-title-wrap">
        <span className="project-label">PROJECT</span>
        <input aria-label="Project name" value={props.projectName} onChange={(e) => props.onProjectNameChange(e.target.value)} />
      </div>
      <nav className="toolbar-actions" aria-label="Project controls">
        <button className="toolbar-button" onClick={props.onNew} title="Start a new project"><FilePlus2 size={16} /><span>New</span></button>
        <button className="toolbar-button" onClick={props.onSave} title="Save locally"><Save size={16} /><span>Save</span></button>
        <button className="toolbar-button" onClick={props.onImport} title="Import JSON project"><FolderUp size={16} /><span>Import</span></button>
        <div className="export-menu">
          <button className="toolbar-button" title="Export options"><Download size={16} /><span>Export</span><ChevronDown size={14} /></button>
          <div className="export-menu__panel">
            <button onClick={props.onExportJson}><FileJson size={16} /><span><strong>Project JSON</strong><small>Editable project file</small></span></button>
            <button onClick={props.onExportPng} disabled={props.exporting}><ImageDown size={16} /><span><strong>Topology PNG</strong><small>Full diagram image</small></span></button>
            <button onClick={props.onExportPdf} disabled={props.exporting}><FileDown size={16} /><span><strong>PDF report</strong><small>Diagram and inventory</small></span></button>
          </div>
        </div>
        <button className="toolbar-button demo-button" onClick={props.onLoadDemo}>Load example</button>
      </nav>
      <div className={`save-status save-status--${props.saveState}`}><span />{props.saveState === 'saved' ? 'Saved locally' : props.saveState === 'saving' ? 'Saving…' : 'Unsaved changes'}</div>
      {props.rightCollapsed && <button className="icon-button toolbar-panel-button" onClick={props.onToggleRight} title="Open properties"><PanelRight size={18} /></button>}
    </header>
  )
}
