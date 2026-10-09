import { Blend, Square, Type, X } from 'lucide-react'
import { CANVAS_COLORS, TEXT_COLORS } from '../constants/canvas'
import type { TextBoxBackgroundStyle } from '../types/topology'

interface TextBoxToolDialogProps {
  open: boolean
  backgroundStyle: TextBoxBackgroundStyle
  backgroundColor: string
  textColor: string
  onBackgroundStyleChange: (style: TextBoxBackgroundStyle) => void
  onBackgroundColorChange: (color: string) => void
  onTextColorChange: (color: string) => void
  onCancel: () => void
  onStart: () => void
}

export function TextBoxToolDialog(props: TextBoxToolDialogProps) {
  if (!props.open) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && props.onCancel()}>
      <div className="zone-tool-dialog text-tool-dialog" role="dialog" aria-modal="true" aria-labelledby="text-tool-title">
        <button className="icon-button dialog-close" onClick={props.onCancel} aria-label="Close text box tool"><X size={17} /></button>
        <div className="zone-tool-dialog__heading">
          <span><Type size={21} /></span>
          <div><p className="eyebrow">Canvas tool</p><h2 id="text-tool-title">Add a text box</h2></div>
        </div>
        <p className="zone-tool-dialog__help">Choose how the note should appear, then click anywhere on the canvas to place it.</p>
        <section className="zone-tool-section">
          <label>Background</label>
          <div className="zone-style-options text-background-options">
            <button className={props.backgroundStyle === 'filled' ? 'is-selected' : ''} onClick={() => props.onBackgroundStyleChange('filled')}><Square size={17} />Colored background</button>
            <button className={props.backgroundStyle === 'transparent' ? 'is-selected' : ''} onClick={() => props.onBackgroundStyleChange('transparent')}><Blend size={17} />Transparent</button>
          </div>
        </section>
        {props.backgroundStyle === 'filled' && <section className="zone-tool-section">
          <label>Background color</label>
          <div className="zone-color-row">
            {CANVAS_COLORS.map((color) => <button key={color} className={props.backgroundColor.toLowerCase() === color ? 'is-selected' : ''} style={{ backgroundColor: color }} onClick={() => props.onBackgroundColorChange(color)} aria-label={`Use ${color}`} />)}
            <label className="zone-custom-color" title="Choose a custom color"><input type="color" value={props.backgroundColor} onChange={(event) => props.onBackgroundColorChange(event.target.value)} /><span>Custom</span></label>
          </div>
        </section>}
        <section className="zone-tool-section">
          <label>Text color</label>
          <div className="zone-color-row text-color-row">
            {TEXT_COLORS.map((color) => <button key={color} className={props.textColor.toLowerCase() === color ? 'is-selected' : ''} style={{ backgroundColor: color }} onClick={() => props.onTextColorChange(color)} aria-label={`Use ${color} for text`} />)}
            <label className="zone-custom-color" title="Choose a custom text color"><input type="color" value={props.textColor} onChange={(event) => props.onTextColorChange(event.target.value)} /><span>Custom</span></label>
          </div>
        </section>
        <div className="dialog-actions"><button className="button button--ghost" onClick={props.onCancel}>Cancel</button><button className="button button--primary" onClick={props.onStart}><Type size={15} /> Place text box</button></div>
      </div>
    </div>
  )
}
