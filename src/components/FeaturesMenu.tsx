import { Cable, EthernetPort, Tags, SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'

interface FeaturesMenuProps {
  showCables: boolean
  portSelection: boolean
  showDeviceLabels: boolean
  onShowCablesChange: (value: boolean) => void
  onPortSelectionChange: (value: boolean) => void
  onShowDeviceLabelsChange: (value: boolean) => void
}

function FeatureToggle({ icon, title, description, checked, onChange }: {
  icon: ReactNode
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="feature-option">
      <span className="feature-option__icon">{icon}</span>
      <span className="feature-option__copy"><strong>{title}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="feature-switch" aria-hidden="true"><span /></span>
    </label>
  )
}

export function FeaturesMenu(props: FeaturesMenuProps) {
  return (
    <details className="features-menu">
      <summary className="toolbar-button" title="Topology display and connection features"><SlidersHorizontal size={16} /><span>Features</span></summary>
      <div className="features-menu__panel">
        <div className="features-menu__heading"><p className="eyebrow">Workspace</p><strong>Features</strong></div>
        <FeatureToggle icon={<Cable size={17} />} title="Show cables" description="Display links on the canvas" checked={props.showCables} onChange={props.onShowCablesChange} />
        <FeatureToggle icon={<Tags size={17} />} title="Device labels" description="Show names and IP addresses" checked={props.showDeviceLabels} onChange={props.onShowDeviceLabelsChange} />
        <FeatureToggle icon={<EthernetPort size={17} />} title="Choose ports" description="Ask for a port at each endpoint" checked={props.portSelection} onChange={props.onPortSelectionChange} />
        <p className="features-menu__note">Preferences are saved in this browser.</p>
      </div>
    </details>
  )
}
