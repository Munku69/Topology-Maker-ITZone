import { SquareDashed, X } from 'lucide-react'
import { CANVAS_COLORS } from '../constants/canvas'
import type { ZoneLineStyle } from '../types/topology'

interface ZoneToolDialogProps {
  open: boolean
  color: string
  lineStyle: ZoneLineStyle
  onColorChange: (color: string) => void
  onLineStyleChange: (style: ZoneLineStyle) => void
  onCancel: () => void
  onStart: () => void
}

export function ZoneToolDialog(props: ZoneToolDialogProps) {
  if (!props.open) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && props.onCancel()}>
      <div className="zone-tool-dialog" role="dialog" aria-modal="true" aria-labelledby="zone-tool-title">
        <button className="icon-button dialog-close" onClick={props.onCancel} aria-label="Close zone tool"><X size={17} /></button>
        <div className="zone-tool-dialog__heading">
          <span><SquareDashed size={21} /></span>
          <div><p className="eyebrow">Canvas tool</p><h2 id="zone-tool-title">Draw a network zone</h2></div>
        </div>
        <p className="zone-tool-dialog__help">Choose the boundary appearance, then drag anywhere on the canvas to draw a rectangle around related devices.</p>
        <section className="zone-tool-section">
          <label>Boundary color</label>
          <div className="zone-color-row">
            {CANVAS_COLORS.map((color) => <button key={color} className={props.color.toLowerCase() === color ? 'is-selected' : ''} style={{ backgroundColor: color }} onClick={() => props.onColorChange(color)} aria-label={`Use ${color}`} />)}
            <label className="zone-custom-color" title="Choose a custom color"><input type="color" value={props.color} onChange={(event) => props.onColorChange(event.target.value)} /><span>Custom</span></label>
          </div>
        </section>
        <section className="zone-tool-section">
          <label>Boundary style</label>
          <div className="zone-style-options">
            <button className={props.lineStyle === 'dashed' ? 'is-selected' : ''} onClick={() => props.onLineStyleChange('dashed')}><span className="is-dashed" />Dashed</button>
            <button className={props.lineStyle === 'solid' ? 'is-selected' : ''} onClick={() => props.onLineStyleChange('solid')}><span />Solid</button>
          </div>
        </section>
        <div className="dialog-actions"><button className="button button--ghost" onClick={props.onCancel}>Cancel</button><button className="button button--primary" onClick={props.onStart}><SquareDashed size={15} /> Start drawing</button></div>
      </div>
    </div>
  )
}
