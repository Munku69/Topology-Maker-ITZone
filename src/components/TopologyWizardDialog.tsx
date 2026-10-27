import { Building2, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { LinkSpeed } from '../types/topology'
import type { CompanySize, TopologyWizardOptions, WifiRequirement } from '../utils/topologyWizard'

interface TopologyWizardDialogProps {
  open: boolean
  onClose: () => void
  onBuild: (options: TopologyWizardOptions) => void
}

export function TopologyWizardDialog({ open, onClose, onBuild }: TopologyWizardDialogProps) {
  const [options, setOptions] = useState<TopologyWizardOptions>({
    companyName: 'Company', companySize: 'medium', officeCount: 2, internetConnections: 2,
    firewallHa: true, serverCount: 4, wifi: 'standard', coreSpeed: '10 Gbps',
  })
  const [officeCountText, setOfficeCountText] = useState('2')
  const [serverCountText, setServerCountText] = useState('4')
  const update = <Key extends keyof TopologyWizardOptions>(key: Key, value: TopologyWizardOptions[Key]) => setOptions((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!open) return
    setOptions((current) => ({ ...current, companyName: current.companyName || 'Company' }))
    setOfficeCountText(String(options.officeCount))
    setServerCountText(String(options.serverCount))
  }, [open])

  if (!open) return null
  const commitNumber = (text: string, fallback: number, min: number, max: number, setText: (value: string) => void, apply: (value: number) => void) => {
    const value = text === '' ? fallback : Math.min(max, Math.max(min, Number.parseInt(text, 10)))
    setText(String(value))
    apply(value)
    return value
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="automation-dialog wizard-dialog" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close topology wizard"><X size={17} /></button>
        <div className="automation-dialog__heading"><span className="dialog-icon"><Building2 size={21} /></span><div><p className="eyebrow">Guided automation</p><h2 id="wizard-title">Build topology</h2></div></div>
        <p className="automation-dialog__help">Answer a few questions and the editor will create, name, connect, zone, and arrange a complete starting topology.</p>
        <div className="wizard-fields">
          <label className="field"><span>Company name</span><input value={options.companyName} onChange={(event) => update('companyName', event.target.value)} maxLength={60} /></label>
          <label className="field"><span>Company size</span><select value={options.companySize} onChange={(event) => update('companySize', event.target.value as CompanySize)}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
          <label className="field"><span>Number of offices</span><input type="text" inputMode="numeric" pattern="[0-9]*" value={officeCountText} onChange={(event) => { const value = event.target.value.replace(/\D/g, ''); setOfficeCountText(value); if (value && Number(value) >= 1 && Number(value) <= 8) update('officeCount', Number(value)) }} onBlur={() => commitNumber(officeCountText, options.officeCount, 1, 8, setOfficeCountText, (value) => update('officeCount', value))} /></label>
          <label className="field"><span>Internet connections</span><select value={options.internetConnections} onChange={(event) => update('internetConnections', Number(event.target.value))}><option value={1}>Single ISP</option><option value={2}>Dual ISP</option></select></label>
          <label className="field"><span>Server count</span><input type="text" inputMode="numeric" pattern="[0-9]*" value={serverCountText} onChange={(event) => { const value = event.target.value.replace(/\D/g, ''); setServerCountText(value); if (value !== '' && Number(value) <= 24) update('serverCount', Number(value)) }} onBlur={() => commitNumber(serverCountText, options.serverCount, 0, 24, setServerCountText, (value) => update('serverCount', value))} /></label>
          <label className="field"><span>Wi-Fi</span><select value={options.wifi} onChange={(event) => update('wifi', event.target.value as WifiRequirement)}><option value="none">No Wi-Fi</option><option value="standard">Standard coverage</option><option value="high-density">High-density coverage</option></select></label>
          <label className="field"><span>Core speed</span><select value={options.coreSpeed} onChange={(event) => update('coreSpeed', event.target.value as LinkSpeed)}><option>1 Gbps</option><option>10 Gbps</option><option>25 Gbps</option><option>40 Gbps</option><option>100 Gbps</option></select></label>
          <label className="wizard-check"><input type="checkbox" checked={options.firewallHa} onChange={(event) => update('firewallHa', event.target.checked)} /><span><strong>Firewall HA</strong><small>Create an active/passive firewall pair and HA link in every office.</small></span></label>
        </div>
        <div className="wizard-preview"><strong>Will create</strong><span>{options.officeCount} office zone{options.officeCount === 1 ? '' : 's'} · {options.internetConnections} ISP{options.internetConnections === 1 ? '' : 's'} · {options.firewallHa ? `${options.officeCount * 2} firewalls` : `${options.officeCount} firewall${options.officeCount === 1 ? '' : 's'}`} · {options.serverCount} servers</span></div>
        <div className="dialog-actions"><button className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" onClick={() => onBuild({ ...options, officeCount: officeCountText === '' ? options.officeCount : Math.min(8, Math.max(1, Number.parseInt(officeCountText, 10))), serverCount: serverCountText === '' ? options.serverCount : Math.min(24, Math.max(0, Number.parseInt(serverCountText, 10))) })}><Sparkles size={15} /> Build topology</button></div>
      </div>
    </div>
  )
}
