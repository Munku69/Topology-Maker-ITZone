import { Copy, FolderOpen, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ProjectSummary } from '../types/topology'

interface ProjectManagerDialogProps {
  open: boolean
  projects: ProjectSummary[]
  activeProjectId: string
  onClose: () => void
  onCreate: (name: string) => void
  onSwitch: (id: string) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (project: ProjectSummary) => void
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function ProjectManagerDialog(props: ProjectManagerDialogProps) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    if (!props.open) { setNewName(''); setEditingId(null); setEditingName('') }
  }, [props.open])

  if (!props.open) return null
  const create = () => { props.onCreate(newName.trim() || 'Untitled Network'); setNewName('') }
  const saveRename = () => {
    if (!editingId) return
    props.onRename(editingId, editingName)
    setEditingId(null)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && props.onClose()}>
      <div className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="projects-title">
        <button className="icon-button dialog-close" onClick={props.onClose} aria-label="Close project manager"><X size={17} /></button>
        <div className="project-dialog__heading">
          <span className="dialog-icon"><FolderOpen size={22} /></span>
          <div><p className="eyebrow">Browser storage</p><h2 id="projects-title">Projects</h2></div>
        </div>
        <p className="project-dialog__help">Switch between locally saved topology projects. Export JSON to move a project to another browser or computer.</p>

        <div className="project-create">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') create() }} placeholder="New project name" aria-label="New project name" />
          <button className="button button--primary" onClick={create}><Plus size={15} /> Create</button>
        </div>

        <div className="project-list">
          {props.projects.map((project) => {
            const active = project.id === props.activeProjectId
            const editing = editingId === project.id
            return <article className={`project-row ${active ? 'is-active' : ''}`} key={project.id}>
              <div className="project-row__main">
                {editing ? <div className="project-rename"><input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveRename(); if (event.key === 'Escape') setEditingId(null) }} /><button className="button button--small" onClick={saveRename}>Save</button></div>
                  : <><div className="project-row__title"><strong>{project.projectName}</strong>{active && <span>ACTIVE</span>}</div><small>{project.deviceCount} device{project.deviceCount === 1 ? '' : 's'} · {project.connectionCount} link{project.connectionCount === 1 ? '' : 's'} · Updated {dateFormatter.format(new Date(project.updatedAt))}</small></>}
              </div>
              {!editing && <div className="project-row__actions">
                {!active && <button className="button button--small" onClick={() => props.onSwitch(project.id)}><FolderOpen size={14} /> Open</button>}
                <button className="icon-button" onClick={() => { setEditingId(project.id); setEditingName(project.projectName) }} title="Rename project"><Pencil size={14} /></button>
                <button className="icon-button" onClick={() => props.onDuplicate(project.id)} title="Duplicate project"><Copy size={14} /></button>
                <button className="icon-button project-delete" onClick={() => props.onDelete(project)} title="Delete project"><Trash2 size={14} /></button>
              </div>}
            </article>
          })}
        </div>
      </div>
    </div>
  )
}
