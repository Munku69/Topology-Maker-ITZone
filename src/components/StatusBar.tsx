import { Minus, MousePointer2, Network, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

interface StatusBarProps {
  deviceCount: number
  linkCount: number
  selectedCount: number
  zoom: number
  activeTool: string
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomChange: (percentage: number) => void
}

export function StatusBar({ deviceCount, linkCount, selectedCount, zoom, activeTool, onZoomIn, onZoomOut, onZoomChange }: StatusBarProps) {
  const currentPercentage = Math.round(zoom * 100)
  const [zoomInput, setZoomInput] = useState(String(currentPercentage))

  useEffect(() => setZoomInput(String(currentPercentage)), [currentPercentage])

  const applyZoomInput = () => {
    const parsed = Number.parseFloat(zoomInput.replace('%', ''))
    if (!Number.isFinite(parsed)) {
      setZoomInput(String(currentPercentage))
      return
    }
    const next = Math.min(250, Math.max(15, Math.round(parsed)))
    setZoomInput(String(next))
    onZoomChange(next)
  }
  return (
    <footer className="status-bar" aria-label="Topology status">
      <div className="status-bar__group"><Network size={13} /><span>{deviceCount} devices</span><i /> <span>{linkCount} links</span></div>
      <div className={`status-bar__tool ${activeTool !== 'Select' ? 'is-active' : ''}`}><MousePointer2 size={13} /><span>{activeTool}</span></div>
      <div className="status-bar__group status-bar__right">
        <span>{selectedCount} selected</span><i />
        <div className="status-zoom" aria-label="Canvas zoom controls">
          <button type="button" onClick={onZoomOut} disabled={currentPercentage <= 15} title="Zoom out" aria-label="Zoom out"><Minus size={12} /></button>
          <label>
            <input value={zoomInput} inputMode="numeric" aria-label="Zoom percentage" onFocus={(event) => event.currentTarget.select()} onChange={(event) => setZoomInput(event.target.value)} onBlur={applyZoomInput} onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') { setZoomInput(String(currentPercentage)); event.currentTarget.blur() }
            }} />
            <span>%</span>
          </label>
          <button type="button" onClick={onZoomIn} disabled={currentPercentage >= 250} title="Zoom in" aria-label="Zoom in"><Plus size={12} /></button>
        </div>
      </div>
    </footer>
  )
}
